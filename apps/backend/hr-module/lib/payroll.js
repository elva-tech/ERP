/**
 * Payroll helpers. The calculation rules themselves (component resolution,
 * rounding, loss-of-pay proration) live in lib/rules/payroll-rules.mjs so
 * they can be unit tested; see that file for the documented rules.
 */
import { calculateStructure, round2 } from "@/lib/rules/payroll-rules.mjs";

export { calculateStructure, round2 };

export const PAYSLIP_SELECT = `SELECT
  p.id, p.payroll_run_id, p.employee_id, e.name AS employee_name, e.employee_code,
  e.department, e.designation,
  p.basic_pay::float8 AS basic_pay, p.hra::float8 AS hra, p.da::float8 AS da,
  p.other_earnings::float8 AS other_earnings, p.gross_pay::float8 AS gross_pay,
  p.pf_employee::float8 AS pf_employee, p.esic_employee::float8 AS esic_employee,
  p.professional_tax::float8 AS professional_tax, p.tds::float8 AS tds,
  p.other_deductions::float8 AS other_deductions, p.total_deductions::float8 AS total_deductions,
  p.net_salary::float8 AS net_salary, p.pf_employer::float8 AS pf_employer,
  p.esic_employer::float8 AS esic_employer, p.working_days, p.paid_days,
  p.lop_days::float8 AS lop_days, p.status, p.calculation_detail, p.created_at, p.updated_at
  FROM payslips p
  JOIN employees e ON e.id = p.employee_id`;

export const ADVANCE_SELECT = `SELECT
  a.id, a.employee_id, e.name AS employee_name, e.employee_code, e.department,
  a.amount::float8 AS amount, a.emi_amount::float8 AS emi_amount, a.balance::float8 AS balance,
  a.purpose, a.status, a.approved_at, u.full_name AS approved_by_name, a.created_at, a.updated_at
  FROM employee_advances a
  JOIN employees e ON e.id = a.employee_id
  LEFT JOIN users u ON u.id = a.approved_by`;

/**
 * Maps calculated lines onto the fixed payslip columns by component name.
 * Anything not recognised goes to other_earnings / other_deductions; the
 * full breakdown is always kept in calculation_detail.
 */
export function payslipColumns(lines) {
  const cols = {
    basic_pay: 0, hra: 0, da: 0, other_earnings: 0,
    pf_employee: 0, esic_employee: 0, professional_tax: 0, tds: 0, other_deductions: 0,
    pf_employer: 0, esic_employer: 0,
  };
  const is = (name, patterns) => patterns.some((p) => p.test(name));
  for (const line of lines) {
    const name = line.name.toLowerCase();
    let column;
    if (line.type === "Earning") {
      if (is(name, [/^basic\b/])) column = "basic_pay";
      else if (is(name, [/\bhra\b/, /house rent/])) column = "hra";
      else if (is(name, [/^da$/, /dearness/])) column = "da";
      else column = "other_earnings";
    } else if (line.type === "Deduction") {
      if (is(name, [/\bpf\b/, /\bepf\b/, /provident/])) column = "pf_employee";
      else if (is(name, [/\besic?\b/, /state insurance/])) column = "esic_employee";
      else if (is(name, [/professional tax/, /^pt$/])) column = "professional_tax";
      else if (is(name, [/\btds\b/, /income tax/])) column = "tds";
      else column = "other_deductions";
    } else {
      if (is(name, [/\bpf\b/, /\bepf\b/, /\beps\b/, /provident/])) column = "pf_employer";
      else if (is(name, [/\besic?\b/, /state insurance/])) column = "esic_employer";
      else continue;
    }
    cols[column] = round2(cols[column] + line.amount);
  }
  return cols;
}
