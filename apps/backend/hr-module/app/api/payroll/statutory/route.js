
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  MANAGER_ROLES,
  fail,
  ok,
  parseId,
  requireCompanyAccess,
  serverError,
} from "@/lib/api";

/**
 * GET /api/payroll/statutory?companyId=X&runId=Y
 * PF / ESIC / PT / TDS summary built from the stored payslip amounts. The
 * amounts come entirely from the company's configured components; this
 * report does not recompute or validate statutory rates.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES });
    if (access.error) return access.error;

    const runId = parseId(new URL(request.url).searchParams.get("runId") || "");
    if (!runId) return fail(400, "A valid runId is required.");

    const run = await pool.query(
      "SELECT id, pay_period_year, pay_period_month, status FROM payroll_runs WHERE id = $1 AND company_id = $2",
      [runId, access.companyId]
    );
    if (!run.rowCount) return fail(404, "Payroll run not found.");

    const rows = await pool.query(
      `SELECT p.employee_id, e.name AS employee_name, e.employee_code,
              p.gross_pay::float8 AS gross_pay,
              p.pf_employee::float8 AS pf_employee, p.pf_employer::float8 AS pf_employer,
              p.esic_employee::float8 AS esic_employee, p.esic_employer::float8 AS esic_employer,
              p.professional_tax::float8 AS professional_tax, p.tds::float8 AS tds
       FROM payslips p JOIN employees e ON e.id = p.employee_id
       WHERE p.payroll_run_id = $1 AND p.company_id = $2
       ORDER BY e.name`,
      [runId, access.companyId]
    );

    const keys = ["gross_pay", "pf_employee", "pf_employer", "esic_employee", "esic_employer", "professional_tax", "tds"];
    const totals = Object.fromEntries(keys.map((k) => [k, 0]));
    for (const row of rows.rows) for (const k of keys) totals[k] = Math.round((totals[k] + row[k]) * 100) / 100;

    return ok({
      run: run.rows[0],
      count: rows.rowCount,
      totals,
      rows: rows.rows,
      note: "Amounts reflect company-configured salary components. Statutory rates, ceilings and eligibility must be confirmed by the payroll accountant.",
    });
  } catch (error) {
    return serverError("Statutory report failed", error, "Unable to build statutory report.");
  }
}
