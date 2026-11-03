// Read-only tenant integrity report. Counts rows whose company does not match
// the company of the record they reference, and references to missing rows.
// Run before applying 20261023100000_tenant_foreign_keys: every count must be 0.
//
//   node scripts/check-tenant-integrity.mjs
//
// DATABASE_URL is taken from the environment, falling back to .env.local.
// Only the database name and counts are printed.

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", override: false, quiet: true });

const REFERENCES = [
  ["attendance_records", "employee_id", "employees"],
  ["attendance_records", "shift_id", "shifts"],
  ["attendance_regularizations", "employee_id", "employees"],
  ["employee_advances", "employee_id", "employees"],
  ["employee_document_events", "document_id", "employee_documents"],
  ["employee_document_events", "employee_id", "employees"],
  ["employee_salary_assignments", "employee_id", "employees"],
  ["employee_salary_assignments", "structure_id", "salary_structures"],
  ["leave_balances", "employee_id", "employees"],
  ["leave_balances", "leave_type_id", "leave_types"],
  ["leave_requests", "employee_id", "employees"],
  ["leave_requests", "leave_type_id", "leave_types"],
  ["payroll_advance_recoveries", "advance_id", "employee_advances"],
  ["payroll_advance_recoveries", "employee_id", "employees"],
  ["payroll_advance_recoveries", "payroll_run_id", "payroll_runs"],
  ["payslips", "employee_id", "employees"],
  ["payslips", "payroll_run_id", "payroll_runs"],
  ["raw_punches", "device_id", "biometric_devices"],
  ["raw_punches", "employee_id", "employees"],
  ["rosters", "employee_id", "employees"],
  ["rosters", "shift_id", "shifts"],
  ["approval_audit_log", "employee_id", "employees"],
];

const SPECIAL_CHECKS = [
  [
    "employees.user_id without a membership in the employee's company",
    `SELECT COUNT(*)::int AS n FROM employees e
      WHERE e.user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM company_memberships m
                         WHERE m.company_id = e.company_id AND m.user_id = e.user_id)`,
  ],
  [
    "approval_delegates.user_id without a membership in the delegate's company",
    `SELECT COUNT(*)::int AS n FROM approval_delegates d
      WHERE NOT EXISTS (SELECT 1 FROM company_memberships m
                         WHERE m.company_id = d.company_id AND m.user_id = d.user_id)`,
  ],
  [
    "salary_structure_components joining a structure and component of different companies",
    `SELECT COUNT(*)::int AS n FROM salary_structure_components sc
       JOIN salary_structures s ON s.id = sc.structure_id
       JOIN salary_components c ON c.id = sc.component_id
      WHERE s.company_id <> c.company_id`,
  ],
  [
    "employee_document_events whose employee differs from the document's employee",
    `SELECT COUNT(*)::int AS n FROM employee_document_events ev
       JOIN employee_documents d ON d.id = ev.document_id
      WHERE d.employee_id <> ev.employee_id`,
  ],
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let problems = 0;

try {
  await pool.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  const { rows } = await pool.query("SELECT current_database() AS db");
  console.log(`Database: ${rows[0].db}`);

  for (const [child, column, parent] of REFERENCES) {
    const { rows: [result] } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.company_id <> c.company_id)::int AS mismatched,
         COUNT(*) FILTER (WHERE p.id IS NULL)::int AS missing,
         COUNT(*)::int AS total
       FROM ${child} c
       LEFT JOIN ${parent} p ON p.id = c.${column}
       WHERE c.${column} IS NOT NULL`
    );
    problems += result.mismatched + result.missing;
    const flag = result.mismatched + result.missing > 0 ? "PROBLEM" : "ok";
    console.log(
      `${flag.padEnd(7)} ${child}.${column} -> ${parent}: ` +
        `${result.total} references, ${result.mismatched} cross-company, ${result.missing} missing parent`
    );
  }

  for (const [label, sql] of SPECIAL_CHECKS) {
    const { rows: [result] } = await pool.query(sql);
    problems += result.n;
    console.log(`${(result.n > 0 ? "PROBLEM" : "ok").padEnd(7)} ${label}: ${result.n}`);
  }

  console.log(problems === 0 ? "No tenant inconsistencies found." : `${problems} inconsistent rows found.`);
  process.exitCode = problems === 0 ? 0 : 2;
} catch (error) {
  console.error("Integrity check failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
