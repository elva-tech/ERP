import { connection } from "next/server";
import { pool } from "@/lib/db";
import { MANAGER_ROLES, fail, ok, parseId, requireCompanyAccess, serverError } from "@/lib/api";
import { canGrantRole, currentActorRole, lockCompanyAccess, recordMembershipEvent } from "@/lib/access";

/**
 * DELETE /api/invitations/[invitationId]?companyId=X  (managers)
 * Revokes an unused invitation of this company. HR managers may only revoke
 * invitations for roles they could issue themselves.
 */
export async function DELETE(request, { params }) {
  await connection();

  let client;
  try {
    const invitationId = parseId((await params).invitationId);
    if (!invitationId) return fail(400, "A valid invitationId is required.");

    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES, mutation: true });
    if (access.error) return access.error;

    client = await pool.connect();
    await client.query("BEGIN");
    await lockCompanyAccess(client, access.companyId);

    const result = await client.query(
      `SELECT role, accepted_at, revoked_at FROM company_invitations
       WHERE id = $1 AND company_id = $2
       FOR UPDATE`,
      [invitationId, access.companyId]
    );
    const invitation = result.rows[0];
    if (!invitation) {
      await client.query("ROLLBACK");
      return fail(404, "Invitation not found.");
    }
    if (invitation.accepted_at || invitation.revoked_at) {
      await client.query("ROLLBACK");
      return fail(409, invitation.accepted_at ? "This invitation has already been accepted." : "This invitation is already revoked.");
    }
    const actorRole = await currentActorRole(client, access.companyId, access.user.id);
    if (!canGrantRole(actorRole, invitation.role)) {
      await client.query("ROLLBACK");
      return fail(403, "You cannot revoke an invitation for this role.");
    }

    await client.query(
      "UPDATE company_invitations SET revoked_at = NOW(), revoked_by = $1 WHERE id = $2",
      [access.user.id, invitationId]
    );
    await recordMembershipEvent(client, {
      companyId: access.companyId,
      invitationId,
      action: "invitation_revoked",
      actorUserId: access.user.id,
    });
    await client.query("COMMIT");

    return ok({ message: "Invitation revoked." });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Revoke invitation failed", error, "Unable to revoke invitation.");
  } finally {
    client?.release();
  }
}
