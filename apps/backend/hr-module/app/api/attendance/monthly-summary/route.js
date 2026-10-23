import { connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, findOwnEmployee, isManager, ok, requireCompanyAccess, serverError } from "@/lib/api";
import { TIMEZONE } from "@/lib/attendance";

/**
 * GET /api/attendance/monthly-summary?companyId=X[&months=6]
 * Attendance record counts per status for each of the last `months` calendar
 * months (1-12, including the current month in HRMS_TIMEZONE). Months without
 * records are returned with empty counts. Employees only see their own records.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const raw = new URL(request.url).searchParams.get("months") || "6";
    const months = Number(raw);
    if (!Number.isInteger(months) || months < 1 || months > 12) {
      return fail(400, "months must be a whole number from 1 to 12.");
    }

    let employeeId = null;
    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) return ok({ timezone: TIMEZONE, months: [] });
      employeeId = String(own.id);
    }

    const result = await pool.query(
      `WITH bounds AS (
         SELECT date_trunc('month', (NOW() AT TIME ZONE $2::text))::date AS this_month
       ),
       series AS (
         SELECT generate_series(
                  (SELECT this_month FROM bounds) - make_interval(months => $3::int - 1),
                  (SELECT this_month FROM bounds),
                  interval '1 month'
                )::date AS month_start
       )
       SELECT to_char(s.month_start, 'YYYY-MM') AS month, ar.status, COUNT(ar.id)::int AS count
       FROM series s
       LEFT JOIN attendance_records ar
         ON ar.company_id = $1
        AND ar.attendance_date >= s.month_start
        AND ar.attendance_date < (s.month_start + interval '1 month')::date
        AND ($4::bigint IS NULL OR ar.employee_id = $4::bigint)
       GROUP BY s.month_start, ar.status
       ORDER BY s.month_start`,
      [access.companyId, TIMEZONE, months, employeeId]
    );

    const byMonth = new Map();
    for (const row of result.rows) {
      if (!byMonth.has(row.month)) byMonth.set(row.month, { month: row.month, total: 0, counts: {} });
      if (row.status) {
        const entry = byMonth.get(row.month);
        entry.counts[row.status] = row.count;
        entry.total += row.count;
      }
    }

    return ok({ timezone: TIMEZONE, months: [...byMonth.values()] });
  } catch (error) {
    return serverError("Monthly attendance summary failed", error, "Unable to retrieve the monthly attendance summary.");
  }
}
