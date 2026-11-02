
import { connection } from "next/server";
import { pool } from "@/lib/db";
import { createPayrollRun, PAYROLL_RUN_COLUMNS } from "@/lib/payroll-run-creation";
import {
  MANAGER_ROLES,
  fail,
  ok,
  readJsonObject,
  requireCompanyAccess,
  serverError,
  trimmed,
} from "@/lib/api";

/** GET /api/payroll/runs?companyId=X  (managers) */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES });
    if (access.error) return access.error;

    const result = await pool.query(
      `SELECT ${PAYROLL_RUN_COLUMNS} FROM payroll_runs r LEFT JOIN users u ON u.id = r.processed_by
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

    const year = Number(body.year);
    const month = Number(body.month);
    const notes = trimmed(body.notes) || null;
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(400, "Enter a valid year.");
    if (!Number.isInteger(month) || month < 1 || month > 12) return fail(400, "Enter a valid month (1-12).");
    if (notes && notes.length > 2000) return fail(400, "Notes are too long.");

    const rawIdempotencyKey = request.headers.get("Idempotency-Key");
    if (
      rawIdempotencyKey !== null &&
      (!rawIdempotencyKey.trim() || rawIdempotencyKey.length > 255 || /[\u0000-\u001f\u007f]/.test(rawIdempotencyKey))
    ) {
      return fail(400, "Idempotency-Key must be 1-255 printable characters.");
    }

    client = await pool.connect();
    const result = await createPayrollRun(client, {
      companyId: access.companyId,
      userId: access.user.id,
      year,
      month,
      notes,
      idempotencyKey: rawIdempotencyKey?.trim() || null,
    });
    return ok(result.body, result.status);
  } catch (error) {
    if (error.code === "23505") {
      return fail(409, "An active payroll run already exists for this month. Cancel it before creating a new one.");
    }
    return serverError("Create payroll run failed", error, "Unable to create payroll run.");
  } finally {
    client?.release();
  }
}
