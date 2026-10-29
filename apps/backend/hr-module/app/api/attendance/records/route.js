
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  MANAGER_ROLES,
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
  ATTENDANCE_SELECT,
  ATTENDANCE_STATUSES,
  TIMEZONE,
  parseTime,
  readAttendance,
  upsertAttendance,
} from "@/lib/attendance";

/**
 * GET /api/attendance/records?companyId=X
 *   [&date=YYYY-MM-DD | &from=YYYY-MM-DD&to=YYYY-MM-DD][&employeeId=Y]
 *   [&status=Present][&department=Name][&exceptions=1][&overtime=1][&page=1][&limit=100]
 * Employees only see their own records.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const url = new URL(request.url);
    const params = url.searchParams;
    const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(params.get("limit") || "100", 10) || 100));

    const values = [access.companyId, TIMEZONE];
    const conditions = ["ar.company_id = $1"];
    const add = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    const date = params.get("date");
    const from = params.get("from");
    const to = params.get("to");
    if (date) {
      if (!isValidDate(date)) return fail(400, "date must be YYYY-MM-DD.");
      add("ar.attendance_date = ?", date);
    } else {
      if (from && !isValidDate(from)) return fail(400, "from must be YYYY-MM-DD.");
      if (to && !isValidDate(to)) return fail(400, "to must be YYYY-MM-DD.");
      if (from) add("ar.attendance_date >= ?", from);
      if (to) add("ar.attendance_date <= ?", to);
    }

    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) return ok({ count: 0, page, limit, summary: {}, records: [] });
      add("ar.employee_id = ?", String(own.id));
    } else {
      const employeeId = parseId(params.get("employeeId") || "");
      if (employeeId) add("ar.employee_id = ?", employeeId);
      const department = trimmed(params.get("department"));
      if (department) add("e.department = ?", department);
    }

    const status = params.get("status");
    if (status && ATTENDANCE_STATUSES.includes(status)) add("ar.status = ?", status);
    if (params.get("exceptions") === "1") {
      conditions.push("ar.status IN ('Late', 'Missing Punch', 'Absent', 'Half Day')");
    }
    if (params.get("overtime") === "1") conditions.push("ar.overtime_minutes > 0");

    const where = conditions.join(" AND ");
    const base = ATTENDANCE_SELECT.replaceAll("$TZ", "$2::text");

    const [rows, totals] = await Promise.all([
      pool.query(
        `${base} WHERE ${where}
         ORDER BY ar.attendance_date DESC, e.name ASC
         LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        values
      ),
      pool.query(
        `SELECT ar.status, COUNT(*)::int AS count,
                COALESCE(SUM(ar.overtime_minutes), 0)::int AS overtime_minutes
         FROM attendance_records ar JOIN employees e ON e.id = ar.employee_id
         WHERE ${where} AND $2::text IS NOT NULL
         GROUP BY ar.status`,
        values
      ),
    ]);

    const summary = {};
    let count = 0;
    let overtimeMinutes = 0;
    for (const row of totals.rows) {
      summary[row.status] = row.count;
      count += row.count;
      overtimeMinutes += row.overtime_minutes;
    }

    return ok({ count, page, limit, summary, overtimeMinutes, timezone: TIMEZONE, records: rows.rows });
  } catch (error) {
    return serverError("List attendance records failed", error, "Unable to retrieve attendance records.");
  }
}

/**
 * POST /api/attendance/records  (company_admin / hr_manager)
 * { companyId, employeeId, date, checkIn?: "HH:MM", checkOut?: "HH:MM", status?, shiftId? }
 * Creates or replaces the attendance record for that employee and date.
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
      roles: MANAGER_ROLES,
      mutation: true,
    });
    if (access.error) return access.error;

    const employeeId = parseId(body.employeeId);
    const date = trimmed(body.date);
    const checkIn = body.checkIn ? parseTime(body.checkIn) : null;
    const checkOut = body.checkOut ? parseTime(body.checkOut) : null;
    const status = body.status ? trimmed(body.status) : null;
    const shiftId = body.shiftId ? parseId(body.shiftId) : null;

    if (!employeeId) return fail(400, "Select a valid employee.");
    if (!isValidDate(date)) return fail(400, "Enter a valid date (YYYY-MM-DD).");
    if (body.checkIn && !checkIn) return fail(400, "Check-in must be HH:MM.");
    if (body.checkOut && !checkOut) return fail(400, "Check-out must be HH:MM.");
    if (checkOut && !checkIn) return fail(400, "Check-out requires a check-in time.");
    if (status && !ATTENDANCE_STATUSES.includes(status)) {
      return fail(400, `Status must be one of: ${ATTENDANCE_STATUSES.join(", ")}.`);
    }
    if (body.shiftId && !shiftId) return fail(400, "Select a valid shift.");

    const employee = await pool.query(
      "SELECT id FROM employees WHERE id = $1 AND company_id = $2",
      [employeeId, access.companyId]
    );
    if (!employee.rowCount) return fail(404, "Employee not found in this company.");

    client = await pool.connect();
    await client.query("BEGIN");
    const saved = await upsertAttendance(client, {
      companyId: access.companyId,
      employeeId,
      date,
      checkIn,
      checkOut,
      status,
      shiftId,
    });
    if (saved.error) {
      await client.query("ROLLBACK");
      return fail(404, saved.error);
    }
    await client.query("COMMIT");

    return ok({ message: "Attendance saved.", record: await readAttendance(saved.id) }, 201);
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Save attendance failed", error, "Unable to save attendance.");
  } finally {
    client?.release();
  }
}
