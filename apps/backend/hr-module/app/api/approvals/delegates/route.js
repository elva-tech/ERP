import { connection } from "next/server";
import { pool } from "@/lib/db";
import { ADMIN_ROLES, fail, ok, parseId, readJsonObject, requireCompanyAccess, serverError, trimmed } from "@/lib/api";

const DELEGATE_SELECT = `
  SELECT d.id, d.user_id, u.full_name, u.email, cm.role, d.reason,
         d.granted_at, g.full_name AS granted_by_name,
         d.revoked_at, r.full_name AS revoked_by_name
  FROM approval_delegates d
  JOIN users u ON u.id = d.user_id
  JOIN users g ON g.id = d.granted_by
  LEFT JOIN users r ON r.id = d.revoked_by
  LEFT JOIN company_memberships cm ON cm.company_id = d.company_id AND cm.user_id = d.user_id`;

/**
 * GET /api/approvals/delegates?companyId=X (company_admin)
 * Current and revoked approval delegates of the company.
 */
export async function GET(request) {
  await connection();
  try {
    const access = await requireCompanyAccess(request, { roles: ADMIN_ROLES });
    if (access.error) return access.error;
    const result = await pool.query(
      `${DELEGATE_SELECT} WHERE d.company_id = $1 ORDER BY d.revoked_at IS NOT NULL, d.granted_at DESC`,
      [access.companyId]
    );
    return ok({ count: result.rowCount, delegates: result.rows });
  } catch (error) {
    return serverError("List approval delegates failed", error, "Unable to retrieve approval delegates.");
  }
}

/**
 * POST /api/approvals/delegates { companyId, userId, reason } (company_admin)
 * Authorises another active member to review requests raised by the
 * company's admins/HR managers. An admin cannot designate themselves.
 */
export async function POST(request) {
  await connection();
  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const access = await requireCompanyAccess(request, {
      roles: ADMIN_ROLES,
      companyId: parsed.body.companyId ?? "",
      mutation: true,
    });
    if (access.error) return access.error;

    const userId = parseId(parsed.body.userId);
    const reason = trimmed(parsed.body.reason);
    if (!userId) return fail(400, "Select the member to designate.");
    if (!reason) return fail(400, "Enter the reason for this delegation.");
    if (reason.length > 1000) return fail(400, "Reason is too long.");
    if (String(userId) === String(access.user.id)) {
      return fail(400, "You cannot designate yourself as an approval delegate.");
    }

    const member = await pool.query(
      `SELECT 1 FROM company_memberships cm JOIN users u ON u.id = cm.user_id
       WHERE cm.company_id = $1 AND cm.user_id = $2 AND cm.status = 'active' AND u.status = 'active'`,
      [access.companyId, userId]
    );
    if (!member.rowCount) return fail(400, "The selected user is not an active member of this company.");

    const inserted = await pool.query(
      `INSERT INTO approval_delegates (company_id, user_id, granted_by, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, user_id) WHERE revoked_at IS NULL DO NOTHING
       RETURNING id`,
      [access.companyId, userId, access.user.id, reason]
    );
    if (!inserted.rowCount) return fail(409, "This member is already an active approval delegate.");

    const row = await pool.query(`${DELEGATE_SELECT} WHERE d.id = $1`, [inserted.rows[0].id]);
    return ok({ message: "Approval delegate added.", delegate: row.rows[0] }, 201);
  } catch (error) {
    return serverError("Add approval delegate failed", error, "Unable to add approval delegate.");
  }
}
