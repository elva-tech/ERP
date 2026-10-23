
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  findOwnEmployee,
  isManager,
  ok,
  parseId,
  requireCompanyAccess,
  serverError,
} from "@/lib/api";
import { PAYSLIP_SELECT } from "@/lib/payroll";

/**
 * GET /api/payroll/payslips?companyId=X[&runId=Y][&employeeId=Z]
 * Managers see all payslips; employees see only their own Generated/Disbursed ones.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const params = new URL(request.url).searchParams;
    const values = [access.companyId];
    const conditions = ["p.company_id = $1"];
    const add = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    const runId = parseId(params.get("runId") || "");
    if (runId) add("p.payroll_run_id = ?", runId);

    if (isManager(access.membership)) {
      const employeeId = parseId(params.get("employeeId") || "");
      if (employeeId) add("p.employee_id = ?", employeeId);
    } else {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own) return ok({ count: 0, payslips: [] });
      add("p.employee_id = ?", String(own.id));
      conditions.push("p.status IN ('Generated', 'Disbursed')");
    }

    const result = await pool.query(
      `SELECT r.pay_period_year, r.pay_period_month, r.status AS run_status, q.*
       FROM (${PAYSLIP_SELECT} WHERE ${conditions.join(" AND ")}) q
       JOIN payroll_runs r ON r.id = q.payroll_run_id
       ORDER BY r.pay_period_year DESC, r.pay_period_month DESC, q.employee_name
       LIMIT 2000`,
      values
    );
    return ok({ count: result.rowCount, payslips: result.rows });
  } catch (error) {
    return serverError("List payslips failed", error, "Unable to retrieve payslips.");
  }
}
