
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  MANAGER_ROLES,
  fail,
  findOwnEmployee,
  isManager,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
} from "@/lib/api";

function parseYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}

function parseDays(value) {
  const days = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof days === "number" && Number.isFinite(days) && days >= 0 && days <= 366
    ? Math.round(days * 100) / 100
    : null;
}

/**
 * GET /api/leave/balances?companyId=X[&employeeId=Y][&year=2026]
 * One row per active employee and active leave type. Rows without an explicit
 * allocation use the leave type's days_per_year (is_default_allocation = true).
 * available = allocated + carry_forward - used - pending, matching the check
 * applied when a new request is submitted.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const url = new URL(request.url);
    const year = parseYear(url.searchParams.get("year") || new Date().getFullYear());
    if (!year) return fail(400, "A valid year is required.");

    const conditions = ["e.company_id = $1", "e.status = 'Active'"];
    const values = [access.companyId, year];

    let employeeId = parseId(url.searchParams.get("employeeId") || "");
    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) return ok({ count: 0, year, balances: [] });
      employeeId = String(own.id);
    }
    if (employeeId) {
      values.push(employeeId);
      conditions.push(`e.id = $${values.length}`);
    }

    const result = await pool.query(
      `SELECT
         lb.id,
         e.id AS employee_id,
         e.name AS employee_name,
         e.employee_code,
         e.department,
         lt.id AS leave_type_id,
         lt.name AS leave_type_name,
         lt.is_paid,
         $2::int AS year,
         (lb.id IS NULL) AS is_default_allocation,
         COALESCE(lb.allocated, lt.days_per_year)::float8 AS allocated,
         COALESCE(lb.used, 0)::float8 AS used,
         COALESCE(lb.carry_forward, 0)::float8 AS carry_forward,
         COALESCE(p.pending, 0)::float8 AS pending,
         (COALESCE(lb.allocated, lt.days_per_year) + COALESCE(lb.carry_forward, 0)
           - COALESCE(lb.used, 0) - COALESCE(p.pending, 0))::float8 AS available,
         lb.updated_at
       FROM employees e
       JOIN leave_types lt ON lt.company_id = e.company_id AND lt.status = 'Active'
       LEFT JOIN leave_balances lb
         ON lb.employee_id = e.id AND lb.leave_type_id = lt.id AND lb.year = $2
       LEFT JOIN (
         SELECT employee_id, leave_type_id, SUM(days) AS pending
         FROM leave_requests
         WHERE company_id = $1 AND status = 'Pending' AND EXTRACT(YEAR FROM from_date) = $2
         GROUP BY employee_id, leave_type_id
       ) p ON p.employee_id = e.id AND p.leave_type_id = lt.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY e.name ASC, lt.name ASC`,
      values
    );

    return ok({ count: result.rowCount, year, balances: result.rows });
  } catch (error) {
    return serverError("List leave balances failed", error, "Unable to retrieve leave balances.");
  }
}

/**
 * POST /api/leave/balances
 * { companyId, employeeId, leaveTypeId, year, allocated, carryForward? }
 * Sets the allocation for one employee/leave type/year (managers only).
 */
export async function POST(request) {
  await connection();

  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const body = parsed.body;

    const access = await requireCompanyAccess(request, {
      companyId: body.companyId ?? "",
      roles: MANAGER_ROLES,
      mutation: true,
    });
    if (access.error) return access.error;

    const employeeId = parseId(body.employeeId);
    const leaveTypeId = parseId(body.leaveTypeId);
    const year = parseYear(body.year);
    const allocated = parseDays(body.allocated);
    const carryForward = body.carryForward === undefined ? 0 : parseDays(body.carryForward);

    if (!employeeId) return fail(400, "Select a valid employee.");
    if (!leaveTypeId) return fail(400, "Select a valid leave type.");
    if (!year) return fail(400, "A valid year is required.");
    if (allocated === null) return fail(400, "Allocated days must be a number between 0 and 366.");
    if (carryForward === null) return fail(400, "Carry-forward days must be a number between 0 and 366.");

    const refs = await pool.query(
      `SELECT
         (SELECT id FROM employees WHERE id = $1 AND company_id = $3) AS employee_id,
         (SELECT id FROM leave_types WHERE id = $2 AND company_id = $3) AS leave_type_id`,
      [employeeId, leaveTypeId, access.companyId]
    );
    if (!refs.rows[0].employee_id) return fail(404, "Employee not found in this company.");
    if (!refs.rows[0].leave_type_id) return fail(404, "Leave type not found in this company.");

    const result = await pool.query(
      `INSERT INTO leave_balances (company_id, employee_id, leave_type_id, year, allocated, used, carry_forward)
       VALUES ($1, $2, $3, $4, $5, 0, $6)
       ON CONFLICT (company_id, employee_id, leave_type_id, year)
       DO UPDATE SET allocated = EXCLUDED.allocated, carry_forward = EXCLUDED.carry_forward, updated_at = NOW()
       RETURNING id, employee_id, leave_type_id, year, allocated::float8 AS allocated,
                 used::float8 AS used, carry_forward::float8 AS carry_forward,
                 (allocated + carry_forward - used - (
                   SELECT COALESCE(SUM(days), 0) FROM leave_requests r
                   WHERE r.employee_id = $2 AND r.leave_type_id = $3 AND r.status = 'Pending'
                     AND EXTRACT(YEAR FROM r.from_date) = $4
                 ))::float8 AS available`,
      [access.companyId, employeeId, leaveTypeId, year, allocated, carryForward]
    );

    return ok({ message: "Leave balance saved.", balance: result.rows[0] });
  } catch (error) {
    return serverError("Save leave balance failed", error, "Unable to save leave balance.");
  }
}
