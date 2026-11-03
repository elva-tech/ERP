
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  fail,
  findOwnEmployee,
  isManager,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
  trimmed,
} from "@/lib/api";
import { ADVANCE_SELECT } from "@/lib/payroll";

function parseAmount(value) {
  const amount = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0 && amount <= 1e10
    ? Math.round(amount * 100) / 100
    : null;
}

/**
 * GET /api/payroll/advances?companyId=X[&status=Pending]
 * Managers see all; employees see their own.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const values = [access.companyId];
    const conditions = ["a.company_id = $1"];
    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) return ok({ count: 0, advances: [] });
      values.push(String(own.id));
      conditions.push(`a.employee_id = $${values.length}`);
    }
    const status = new URL(request.url).searchParams.get("status");
    if (["Pending", "Approved", "Active", "Closed", "Rejected"].includes(status)) {
      values.push(status);
      conditions.push(`a.status = $${values.length}`);
    }

    const result = await pool.query(
      `${ADVANCE_SELECT} WHERE ${conditions.join(" AND ")} ORDER BY a.created_at DESC LIMIT 1000`,
      values
    );
    return ok({ count: result.rowCount, advances: result.rows });
  } catch (error) {
    return serverError("List advances failed", error, "Unable to retrieve advances.");
  }
}

/**
 * POST /api/payroll/advances { companyId, employeeId?, amount?, months?, emiAmount?, purpose? }
 * At least one of amount or months (1-3, the requested repayment period) is required;
 * a months-only request gets its amount from the approver. Employees may only request for themselves.
 */
export async function POST(request) {
  await connection();

  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const body = parsed.body;

    const access = await requireCompanyAccess(request, { companyId: body.companyId ?? "", mutation: true });
    if (access.error) return access.error;

    const hasAmount = body.amount !== undefined && body.amount !== null && body.amount !== "";
    const hasMonths = body.months !== undefined && body.months !== null && body.months !== "";
    const amount = hasAmount ? parseAmount(body.amount) : null;
    const months = hasMonths ? Number(body.months) : null;
    const emiAmount = body.emiAmount === undefined || body.emiAmount === "" ? null : parseAmount(body.emiAmount);
    const purpose = trimmed(body.purpose) || null;
    if (!hasAmount && !hasMonths) return fail(400, "Enter an advance amount or the number of months.");
    if (hasAmount && !amount) return fail(400, "Enter a valid advance amount.");
    if (hasMonths && !(Number.isInteger(months) && months >= 1 && months <= 3)) {
      return fail(400, "Number of months must be 1, 2 or 3.");
    }
    if (emiAmount && !amount) return fail(400, "An EMI amount needs an advance amount.");
    if (body.emiAmount !== undefined && body.emiAmount !== "" && !emiAmount) return fail(400, "Enter a valid EMI amount.");
    if (emiAmount && emiAmount > amount) return fail(400, "EMI amount cannot exceed the advance amount.");
    if (purpose && purpose.length > 2000) return fail(400, "Purpose is too long.");

    let employeeId = parseId(body.employeeId);
    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) return fail(403, "Your login is not linked to an employee record in this company.");
      if (employeeId && employeeId !== String(own.id)) return fail(403, "You can only request an advance for yourself.");
      employeeId = String(own.id);
    }
    if (!employeeId) return fail(400, "Select a valid employee.");

    const employee = await pool.query(
      "SELECT id, status FROM employees WHERE id = $1 AND company_id = $2",
      [employeeId, access.companyId]
    );
    if (!employee.rowCount) return fail(404, "Employee not found in this company.");
    if (employee.rows[0].status !== "Active") return fail(400, "Advances cannot be requested for an inactive employee.");

    const inserted = await pool.query(
      `INSERT INTO employee_advances (company_id, employee_id, amount, purpose, emi_amount, balance, requested_months, status)
       VALUES ($1, $2, $3, $4, $5, $3, $6, 'Pending') RETURNING id`,
      [access.companyId, employeeId, amount, purpose, emiAmount, months]
    );
    const created = await pool.query(`${ADVANCE_SELECT} WHERE a.id = $1`, [inserted.rows[0].id]);
    return ok({ message: "Advance request submitted.", advance: created.rows[0] }, 201);
  } catch (error) {
    return serverError("Create advance failed", error, "Unable to submit advance request.");
  }
}
