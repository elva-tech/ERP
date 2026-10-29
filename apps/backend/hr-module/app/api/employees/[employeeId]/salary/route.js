import { connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, isManager, isOwnRecord, ok, parseId, requireCompanyAccess, serverError } from "@/lib/api";
import { calculateStructure } from "@/lib/payroll";
import { TIMEZONE } from "@/lib/attendance";

/**
 * GET /api/employees/[employeeId]/salary?companyId=X (managers or the employee)
 * The salary assignment in effect today and its monthly breakdown from the
 * assigned structure, before loss of pay, advance recovery and rounding.
 * Payslips remain the authoritative record of what was paid.
 */
export async function GET(request, { params }) {
  await connection();
  try {
    const employeeId = parseId((await params).employeeId);
    if (!employeeId) return fail(400, "A valid employeeId is required.");
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;
    if (!isManager(access.membership) && !(await isOwnRecord(access.companyId, access.user, employeeId))) {
      return fail(404, "Employee not found.");
    }

    const assignments = await pool.query(
      `SELECT a.id, a.structure_id, s.name AS structure_name, a.ctc_annual::float8 AS ctc_annual,
              to_char(a.effective_from, 'YYYY-MM-DD') AS effective_from,
              to_char(a.effective_to, 'YYYY-MM-DD') AS effective_to,
              (a.effective_from <= (NOW() AT TIME ZONE $3::text)::date
                AND (a.effective_to IS NULL OR a.effective_to >= (NOW() AT TIME ZONE $3::text)::date)) AS is_current
       FROM employee_salary_assignments a
       JOIN salary_structures s ON s.id = a.structure_id
       WHERE a.employee_id = $1 AND a.company_id = $2
       ORDER BY a.effective_from DESC`,
      [employeeId, access.companyId, TIMEZONE]
    );
    const current = assignments.rows.find((row) => row.is_current) ?? null;

    let breakdown = null;
    if (current) {
      const lines = await pool.query(
        `SELECT sc.component_id, c.name, c.component_type, c.calculation_type, c.percentage_of,
                c.is_statutory, sc.amount::float8 AS amount, sc.percentage::float8 AS percentage
         FROM salary_structure_components sc
         JOIN salary_components c ON c.id = sc.component_id
         WHERE sc.structure_id = $1 AND c.status = 'Active'`,
        [current.structure_id]
      );
      const calc = calculateStructure(lines.rows, current.ctc_annual);
      breakdown = calc.error
        ? { error: calc.error }
        : {
            earnings: calc.lines.filter((l) => l.type === "Earning"),
            deductions: calc.lines.filter((l) => l.type === "Deduction"),
            employerContributions: calc.lines.filter((l) => l.type === "Employer Contribution"),
            gross: calc.gross,
            totalDeductions: calc.deductions,
            employer: calc.employer,
            net: calc.net,
            monthlyCtc: calc.monthlyCtc,
            annualCtc: current.ctc_annual,
          };
    }

    return ok({ current, breakdown, assignments: assignments.rows });
  } catch (error) {
    return serverError("Get employee salary failed", error, "Unable to retrieve salary details.");
  }
}
