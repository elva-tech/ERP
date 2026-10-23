
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
import { REGULARIZATION_SELECT, TIMEZONE, localTimestamp, parseTime } from "@/lib/attendance";

/**
 * GET /api/attendance/regularizations?companyId=X[&status=Pending]
 * Managers see all; employees see their own.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const values = [access.companyId, TIMEZONE];
    const conditions = ["r.company_id = $1"];

    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) return ok({ count: 0, regularizations: [] });
      values.push(String(own.id));
      conditions.push(`r.employee_id = $${values.length}`);
    }

    const status = new URL(request.url).searchParams.get("status");
    if (["Pending", "Approved", "Rejected"].includes(status)) {
      values.push(status);
      conditions.push(`r.status = $${values.length}`);
    }

    const result = await pool.query(
      `${REGULARIZATION_SELECT.replaceAll("$TZ", "$2::text")}
       WHERE ${conditions.join(" AND ")}
       ORDER BY r.created_at DESC LIMIT 500`,
      values
    );
    return ok({ count: result.rowCount, regularizations: result.rows });
  } catch (error) {
    return serverError("List regularizations failed", error, "Unable to retrieve regularization requests.");
  }
}

/**
 * POST /api/attendance/regularizations
 * { companyId, employeeId?, date, checkIn: "HH:MM", checkOut?: "HH:MM", reason }
 * Employees may only request for themselves.
 */
export async function POST(request) {
  await connection();

  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const body = parsed.body;

    const access = await requireCompanyAccess(request, {
      companyId: body.companyId ?? "",
      mutation: true,
    });
    if (access.error) return access.error;

    const date = trimmed(body.date);
    const checkIn = parseTime(body.checkIn);
    const checkOut = body.checkOut ? parseTime(body.checkOut) : null;
    const reason = trimmed(body.reason);

    if (!isValidDate(date)) return fail(400, "Enter a valid date (YYYY-MM-DD).");
    if (date > new Date().toISOString().slice(0, 10)) {
      return fail(400, "Regularization cannot be requested for a future date.");
    }
    if (!checkIn) return fail(400, "Requested check-in must be HH:MM.");
    if (body.checkOut && !checkOut) return fail(400, "Requested check-out must be HH:MM.");
    if (reason.length < 3 || reason.length > 2000) {
      return fail(400, "Reason must be between 3 and 2000 characters.");
    }

    let employeeId = parseId(body.employeeId);
    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) return fail(403, "Your login is not linked to an employee record in this company.");
      if (employeeId && employeeId !== String(own.id)) {
        return fail(403, "You can only request regularization for yourself.");
      }
      employeeId = String(own.id);
    }
    if (!employeeId) return fail(400, "Select a valid employee.");

    const employee = await pool.query(
      "SELECT id FROM employees WHERE id = $1 AND company_id = $2",
      [employeeId, access.companyId]
    );
    if (!employee.rowCount) return fail(404, "Employee not found in this company.");

    const pending = await pool.query(
      `SELECT id FROM attendance_regularizations
       WHERE employee_id = $1 AND attendance_date = $2 AND status = 'Pending' LIMIT 1`,
      [employeeId, date]
    );
    if (pending.rowCount) return fail(409, "A pending regularization already exists for this date.");

    const inserted = await pool.query(
      `INSERT INTO attendance_regularizations
         (company_id, employee_id, attendance_date, requested_check_in, requested_check_out, reason, status)
       VALUES ($1, $2, $3::date,
         ${localTimestamp("$3", "$4", "$7")},
         ${localTimestamp("$3", "$5", "$7")} + CASE WHEN $5::time <= $4::time THEN INTERVAL '1 day' ELSE INTERVAL '0' END,
         $6, 'Pending')
       RETURNING id`,
      [access.companyId, employeeId, date, checkIn, checkOut, reason, TIMEZONE]
    );

    const created = await pool.query(
      `${REGULARIZATION_SELECT.replaceAll("$TZ", "$2::text")} WHERE r.id = $1`,
      [inserted.rows[0].id, TIMEZONE]
    );
    return ok({ message: "Regularization request submitted.", regularization: created.rows[0] }, 201);
  } catch (error) {
    return serverError("Create regularization failed", error, "Unable to submit regularization request.");
  }
}
