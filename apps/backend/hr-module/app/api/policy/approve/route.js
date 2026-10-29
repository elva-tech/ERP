import { connection } from "next/server";
import { pool } from "@/lib/db";
import { ADMIN_ROLES, fail, ok, readJsonObject, requireCompanyAccess, serverError } from "@/lib/api";
import { missingPolicyDecisions } from "@/lib/rules/payroll-rules.mjs";
import { readPolicy, snapshotOf } from "@/lib/policy";

/**
 * POST /api/policy/approve { companyId, version } (company_admin)
 * Approves the current draft when every required decision is set. The
 * version must match what the admin reviewed, so a concurrent edit cannot be
 * approved unseen.
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

    const version = Number(parsed.body.version);
    if (!Number.isInteger(version) || version < 1) return fail(400, "The reviewed policy version is required.");

    client = await pool.connect();
    await client.query("BEGIN");
    const current = await client.query("SELECT * FROM company_policies WHERE company_id = $1 FOR UPDATE", [access.companyId]);
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return fail(409, "Save the policy settings before approving them.");
    }
    if (row.version !== version) {
      await client.query("ROLLBACK");
      return fail(409, "The policy changed since you reviewed it. Reload and review it again.");
    }
    if (row.status === "Approved") {
      await client.query("ROLLBACK");
      return fail(409, "This policy version is already approved.");
    }
    const missing = missingPolicyDecisions(row);
    if (missing.length) {
      await client.query("ROLLBACK");
      return fail(400, `The policy is incomplete. Decide: ${missing.join(", ")}.`, { missing });
    }

    await client.query(
      `UPDATE company_policies
       SET status = 'Approved', approved_snapshot = $1, approved_by = $2, approved_at = NOW()
       WHERE company_id = $3`,
      [JSON.stringify(snapshotOf(row)), access.user.id, access.companyId]
    );
    await client.query("COMMIT");

    return ok({ message: `Policy version ${version} approved.`, ...(await readPolicy(access.companyId)) });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Approve policy failed", error, "Unable to approve the company policy.");
  } finally {
    client?.release();
  }
}
