import { createHash } from "node:crypto";

export const PAYROLL_RUN_COLUMNS = `r.id, r.company_id, r.pay_period_year, r.pay_period_month, r.status,
  r.total_gross::float8 AS total_gross, r.total_deductions::float8 AS total_deductions,
  r.total_net::float8 AS total_net, r.notes, r.processed_at, u.full_name AS processed_by_name,
  (SELECT COUNT(*)::int FROM payslips p WHERE p.payroll_run_id = r.id) AS payslip_count,
  r.policy_version, r.is_provisional, r.created_at, r.updated_at`;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createPayrollRun(client, {
  companyId,
  userId,
  year,
  month,
  notes,
  idempotencyKey,
}) {
  const keyHash = idempotencyKey ? sha256(idempotencyKey) : null;
  const requestHash = sha256(JSON.stringify([companyId, year, month, notes]));

  await client.query("BEGIN");

  try {
    if (keyHash) {
      const claim = await client.query(
        `INSERT INTO payroll_run_idempotency
           (company_id, user_id, key_hash, request_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, user_id, key_hash) DO NOTHING
         RETURNING key_hash`,
        [companyId, userId, keyHash, requestHash],
      );

      if (!claim.rowCount) {
        const existing = await client.query(
          `SELECT request_hash, response_status, response_body
           FROM payroll_run_idempotency
           WHERE company_id = $1 AND user_id = $2 AND key_hash = $3
           FOR UPDATE`,
          [companyId, userId, keyHash],
        );
        const prior = existing.rows[0];

        if (!prior || prior.request_hash !== requestHash) {
          await client.query("COMMIT");
          return {
            status: 409,
            body: { message: "Idempotency key was already used for a different request." },
          };
        }

        if (!prior.response_status || !prior.response_body) {
          await client.query("ROLLBACK");
          return {
            status: 409,
            body: { message: "The original payroll request is still processing." },
          };
        }

        await client.query("COMMIT");
        return {
          status: Number(prior.response_status),
          body: prior.response_body,
          replayed: true,
        };
      }
    }

    const inserted = await client.query(
      `INSERT INTO payroll_runs
         (company_id, pay_period_year, pay_period_month, status, notes)
       VALUES ($1, $2, $3, 'Draft', $4)
       RETURNING id`,
      [companyId, year, month, notes],
    );
    const run = await client.query(
      `SELECT ${PAYROLL_RUN_COLUMNS}
       FROM payroll_runs r LEFT JOIN users u ON u.id = r.processed_by
       WHERE r.id = $1`,
      [inserted.rows[0].id],
    );
    const body = { message: "Payroll run created.", run: run.rows[0] };

    if (keyHash) {
      await client.query(
        `UPDATE payroll_run_idempotency
         SET response_status = $4, response_body = $5::jsonb
         WHERE company_id = $1 AND user_id = $2 AND key_hash = $3`,
        [companyId, userId, keyHash, 201, JSON.stringify(body)],
      );
    }

    await client.query("COMMIT");
    return { status: 201, body, replayed: false };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}