import { connection } from "next/server";
import { pool } from "@/lib/db";
import { ADMIN_ROLES, fail, ok, readJsonObject, requireCompanyAccess, serverError } from "@/lib/api";
import { round2 } from "@/lib/rules/payroll-rules.mjs";

/**
 * POST /api/leave/carry-forward { companyId, fromYear, apply? } (company_admin)
 * For active employees and active leave types marked "carry forward", the
 * unused balance of fromYear (allocation + carry-forward - used - pending,
 * never below 0) is capped at the type's max_carry_forward_days and written
 * as the carry_forward of fromYear + 1. Re-running overwrites the value, so
 * the action is idempotent. Without apply=true it only previews.
 * Expiry of carried-forward days is not modelled (no company rule given).
 */
export async function POST(request) {
  await connection();
  let client;
  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const access = await requireCompanyAccess(request, {
      roles: ADMIN_ROLES,
      companyId: parsed.body.companyId ?? "",
      mutation: true,
    });
    if (access.error) return access.error;

    const fromYear = Number(parsed.body.fromYear);
    if (!Number.isInteger(fromYear) || fromYear < 2000 || fromYear > 2100) return fail(400, "Enter a valid fromYear.");
    const apply = parsed.body.apply === true;

    client = await pool.connect();
    await client.query("BEGIN");
    const rows = await client.query(
      `SELECT e.id AS employee_id, e.name AS employee_name, lt.id AS leave_type_id, lt.name AS leave_type_name,
              lt.days_per_year::float8 AS days_per_year,
              COALESCE(lt.max_carry_forward_days, 0)::float8 AS max_carry,
              COALESCE(b.allocated, lt.days_per_year)::float8 AS allocated,
              COALESCE(b.carry_forward, 0)::float8 AS carry_forward,
              COALESCE(b.used, 0)::float8 AS used,
              COALESCE((SELECT SUM(days) FROM leave_requests r
                        WHERE r.employee_id = e.id AND r.leave_type_id = lt.id AND r.status = 'Pending'
                          AND EXTRACT(YEAR FROM r.from_date) = $2), 0)::float8 AS pending
       FROM employees e
       CROSS JOIN leave_types lt
       LEFT JOIN leave_balances b
         ON b.employee_id = e.id AND b.leave_type_id = lt.id AND b.year = $2 AND b.company_id = e.company_id
       WHERE e.company_id = $1 AND lt.company_id = $1 AND e.status = 'Active'
         AND lt.status = 'Active' AND lt.carry_forward AND lt.is_paid
       ORDER BY e.name, lt.name`,
      [access.companyId, fromYear]
    );

    const results = rows.rows.map((row) => {
      const unused = Math.max(round2(row.allocated + row.carry_forward - row.used - row.pending), 0);
      return {
        employeeId: String(row.employee_id),
        employeeName: row.employee_name,
        leaveTypeId: String(row.leave_type_id),
        leaveTypeName: row.leave_type_name,
        unused,
        pending: row.pending,
        carryForward: Math.min(unused, row.max_carry),
        daysPerYear: row.days_per_year,
      };
    });

    if (apply) {
      for (const r of results) {
        await client.query(
          `INSERT INTO leave_balances (company_id, employee_id, leave_type_id, year, allocated, used, carry_forward)
           VALUES ($1, $2, $3, $4, $5, 0, $6)
           ON CONFLICT (company_id, employee_id, leave_type_id, year)
           DO UPDATE SET carry_forward = EXCLUDED.carry_forward, updated_at = NOW()`,
          [access.companyId, r.employeeId, r.leaveTypeId, fromYear + 1, r.daysPerYear, r.carryForward]
        );
      }
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }

    return ok({
      message: apply
        ? `Carry-forward from ${fromYear} to ${fromYear + 1} applied for ${results.length} balance(s).`
        : `Preview of carry-forward from ${fromYear} to ${fromYear + 1}.`,
      applied: apply,
      toYear: fromYear + 1,
      results,
      warnings: results.some((r) => r.pending > 0)
        ? ["Some employees still have pending requests in this year; pending days were not carried forward."]
        : [],
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Leave carry-forward failed", error, "Unable to carry forward leave balances.");
  } finally {
    client?.release();
  }
}
