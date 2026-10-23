import { connection } from "next/server";
import { pool } from "@/lib/db";
import { ADMIN_ROLES, fail, ok, parseId, requireCompanyAccess, serverError } from "@/lib/api";

/**
 * DELETE /api/approvals/delegates/[delegateId]?companyId=X (company_admin)
 * Revokes an active delegation. The row is kept for the audit trail.
 */
export async function DELETE(request, { params }) {
  await connection();
  try {
    const delegateId = parseId((await params).delegateId);
    if (!delegateId) return fail(400, "A valid delegateId is required.");
    const access = await requireCompanyAccess(request, { roles: ADMIN_ROLES, mutation: true });
    if (access.error) return access.error;

    const result = await pool.query(
      `UPDATE approval_delegates SET revoked_at = NOW(), revoked_by = $3
       WHERE id = $1 AND company_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [delegateId, access.companyId, access.user.id]
    );
    if (!result.rowCount) return fail(404, "Active delegation not found.");
    return ok({ message: "Approval delegation revoked." });
  } catch (error) {
    return serverError("Revoke approval delegate failed", error, "Unable to revoke approval delegate.");
  }
}
