
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  MANAGER_ROLES,
  fail,
  ok,
  readJsonObject,
  requireCompanyAccess,
  serverError,
  trimmed,
} from "@/lib/api";

const RUN_COLUMNS = `r.id, r.company_id, r.pay_period_year, r.pay_period_month, r.status,
  r.total_gross::float8 AS total_gross, r.total_deductions::float8 AS total_deductions,
  r.total_net::float8 AS total_net, r.notes, r.processed_at, u.full_name AS processed_by_name,
  (SELECT COUNT(*)::int FROM payslips p WHERE p.payroll_run_id = r.id) AS payslip_count,
  r.policy_version, r.is_provisional, r.created_at, r.updated_at`;

/** GET /api/payroll/runs?companyId=X  (managers) */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES });
    if (access.error) return access.error;

    const result = await pool.query(
      `SELECT ${RUN_COLUMNS} FROM payroll_runs r LEFT JOIN users u ON u.id = r.processed_by
       WHERE r.company_id = $1
       ORDER BY r.pay_period_year DESC, r.pay_period_month DESC`,
      [access.companyId]
    );
    return ok({ count: result.rowCount, runs: result.rows });
  } catch (error) {
    return serverError("List payroll runs failed", error, "Unable to retrieve payroll runs.");
  }
}

/**
 * POST /api/payroll/runs { companyId, year, month, notes? }  (managers)
 * Only one non-cancelled run may exist per month (partial unique index);
 * cancelled runs are kept and do not block a new run.
 */
export async function POST(request) {
  await connection();

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

    const year = Number(body.year);
    const month = Number(body.month);
    const notes = trimmed(body.notes) || null;
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(400, "Enter a valid year.");
    if (!Number.isInteger(month) || month < 1 || month > 12) return fail(400, "Enter a valid month (1-12).");
    if (notes && notes.length > 2000) return fail(400, "Notes are too long.");

    const inserted = await pool.query(
      `INSERT INTO payroll_runs (company_id, pay_period_year, pay_period_month, status, notes)
       VALUES ($1, $2, $3, 'Draft', $4) RETURNING id`,
      [access.companyId, year, month, notes]
    );
    const run = await pool.query(
      `SELECT ${RUN_COLUMNS} FROM payroll_runs r LEFT JOIN users u ON u.id = r.processed_by WHERE r.id = $1`,
      [inserted.rows[0].id]
    );
    return ok({ message: "Payroll run created.", run: run.rows[0] }, 201);
  } catch (error) {
    if (error.code === "23505") {
      return fail(409, "An active payroll run already exists for this month. Cancel it before creating a new one.");
    }
    return serverError("Create payroll run failed", error, "Unable to create payroll run.");
  }
}
