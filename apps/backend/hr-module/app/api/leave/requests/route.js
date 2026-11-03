
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  fail,
  findOwnEmployee,
  isManager,
  isValidDate,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
  trimmed,
} from "@/lib/api";
import {
  LEAVE_REQUEST_SELECT,
  available,
  leaveDaysFor,
  lockBalance,
  pendingDays,
} from "@/lib/leave";
import { approvedPolicy } from "@/lib/policy";

/**
 * GET /api/leave/requests?companyId=X[&status=Pending][&employeeId=Y]
 * Managers see all company requests; employees see only their own.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const url = new URL(request.url);
    const conditions = ["lr.company_id = $1"];
    const values = [access.companyId];

    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) return ok({ count: 0, requests: [] });
      values.push(own.id);
      conditions.push(`lr.employee_id = $${values.length}`);
    } else {
      const employeeId = parseId(url.searchParams.get("employeeId") || "");
      if (employeeId) {
        values.push(employeeId);
        conditions.push(`lr.employee_id = $${values.length}`);
      }
    }

    const status = url.searchParams.get("status");
    if (["Pending", "Approved", "Rejected", "Cancelled"].includes(status)) {
      values.push(status);
      conditions.push(`lr.status = $${values.length}`);
    }

    const result = await pool.query(
      `${LEAVE_REQUEST_SELECT}
       WHERE ${conditions.join(" AND ")}
       ORDER BY lr.created_at DESC
       LIMIT 500`,
      values
    );

    return ok({ count: result.rowCount, requests: result.rows });
  } catch (error) {
    return serverError("List leave requests failed", error, "Unable to retrieve leave requests.");
  }
}

/**
 * POST /api/leave/requests
 * Employees may only apply for themselves; managers may apply for any
 * employee of the company.
 */
export async function POST(request) {
  await connection();

  let client;
  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const body = parsed.body;

    const access = await requireCompanyAccess(request, {
      companyId: body.companyId ?? "",
      mutation: true,
    });
    if (access.error) return access.error;

    const leaveTypeId = parseId(body.leaveTypeId);
    const fromDate = trimmed(body.fromDate);
    const toDate = trimmed(body.toDate);
    const reason = trimmed(body.reason) || null;

    if (!leaveTypeId) return fail(400, "Select a valid leave type.");
    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      return fail(400, "Enter valid from and to dates (YYYY-MM-DD).");
    }
    if (fromDate > toDate) return fail(400, "The from date must be on or before the to date.");
    if (fromDate.slice(0, 4) !== toDate.slice(0, 4)) {
      return fail(400, "A leave request cannot span two calendar years. Submit one request per year.");
    }
    if (reason && reason.length > 2000) return fail(400, "Reason must be at most 2000 characters.");

    let employeeId = parseId(body.employeeId);
    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) {
        return fail(403, "Your login is not linked to an employee record in this company.");
      }
      if (employeeId && employeeId !== String(own.id)) {
        return fail(403, "You can only apply for leave for yourself.");
      }
      employeeId = String(own.id);
    }
    if (!employeeId) return fail(400, "Select a valid employee.");

    const employee = await pool.query(
      "SELECT id, status FROM employees WHERE id = $1 AND company_id = $2",
      [employeeId, access.companyId]
    );
    if (!employee.rowCount) return fail(404, "Employee not found in this company.");
    if (employee.rows[0].status !== "Active") return fail(400, "Leave cannot be applied for an inactive employee.");

    const typeResult = await pool.query(
      `SELECT id, name, is_paid, days_per_year::float8 AS days_per_year
       FROM leave_types WHERE id = $1 AND company_id = $2 AND status = 'Active'`,
      [leaveTypeId, access.companyId]
    );
    const leaveType = typeResult.rows[0];
    if (!leaveType) return fail(404, "Leave type not found or inactive.");

    const countingMode = (await approvedPolicy(access.companyId))?.leave_day_counting ?? "calendar_days";
    const counted = await leaveDaysFor(pool, {
      companyId: access.companyId,
      employeeId,
      fromDate,
      toDate,
      mode: countingMode,
    });
    const days = counted.days;
    if (days <= 0) {
      return fail(400, "The selected dates are all weekly offs or holidays; no leave days would be used.");
    }
    const year = Number(fromDate.slice(0, 4));

    client = await pool.connect();
    await client.query("BEGIN");

    // Serialises concurrent requests for the same employee.
    await client.query("SELECT id FROM employees WHERE id = $1 FOR UPDATE", [employeeId]);

    const overlap = await client.query(
      `SELECT id FROM leave_requests
       WHERE employee_id = $1 AND status IN ('Pending', 'Approved')
         AND from_date <= $3 AND to_date >= $2
       LIMIT 1`,
      [employeeId, fromDate, toDate]
    );
    if (overlap.rowCount) {
      await client.query("ROLLBACK");
      return fail(409, "An overlapping pending or approved leave request already exists for these dates.");
    }

    if (leaveType.is_paid) {
      const balance = await lockBalance(client, {
        companyId: access.companyId,
        employeeId,
        leaveType,
        year,
      });
      const pending = await pendingDays(client, { employeeId, leaveTypeId, year });
      const remaining = available(balance) - pending;
      if (days > remaining) {
        await client.query("ROLLBACK");
        return fail(
          400,
          `Insufficient ${leaveType.name} balance: ${days} day(s) requested, ${Math.max(remaining, 0)} available.`
        );
      }
    }

    const inserted = await client.query(
      `INSERT INTO leave_requests
         (company_id, employee_id, leave_type_id, from_date, to_date, days, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
       RETURNING id`,
      [access.companyId, employeeId, leaveTypeId, fromDate, toDate, days, reason]
    );
    await client.query("COMMIT");

    const created = await pool.query(`${LEAVE_REQUEST_SELECT} WHERE lr.id = $1`, [inserted.rows[0].id]);
    return ok(
      {
        message: "Leave request submitted.",
        request: created.rows[0],
        dayCounting: { mode: countingMode, excluded: counted.excluded },
      },
      201
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Create leave request failed", error, "Unable to submit leave request.");
  } finally {
    client?.release();
  }
}
