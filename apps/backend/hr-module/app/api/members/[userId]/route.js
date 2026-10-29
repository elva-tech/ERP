import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  MANAGER_ROLES,
  fail,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
  trimmed,
} from "@/lib/api";
import { MEMBERSHIP_ROLES, changeMembership, lockCompanyAccess } from "@/lib/access";

/**
 * PATCH /api/members/[userId]?companyId=X  (managers)
 * { role?, status?: "active" | "suspended", note? }
 * Company admins may change roles and suspend or reactivate any other member;
 * HR managers may only suspend or reactivate members with the employee role.
 * Nobody can change their own access, and the last active company admin can
 * never be demoted or suspended. Changes apply to this company only.
 */
export async function PATCH(request, { params }) {
  await connection();

  let client;
  try {
    const targetUserId = parseId((await params).userId);
    if (!targetUserId) return fail(400, "A valid userId is required.");

    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES, mutation: true });
    if (access.error) return access.error;

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const { role, status } = parsed.body;
    const note = trimmed(parsed.body.note).slice(0, 500) || null;

    if (role !== undefined && !MEMBERSHIP_ROLES.includes(role)) {
      return fail(400, "Role must be company_admin, hr_manager or employee.");
    }
    if (status !== undefined && !["active", "suspended"].includes(status)) {
      return fail(400, "Status must be active or suspended.");
    }
    if (role === undefined && status === undefined) {
      return fail(400, "Provide a role or status to change.");
    }

    client = await pool.connect();
    await client.query("BEGIN");
    await lockCompanyAccess(client, access.companyId);
    const change = await changeMembership(client, {
      companyId: access.companyId,
      actorUserId: access.user.id,
      targetUserId,
      role,
      status,
      note,
    });
    if (change.error) {
      await client.query("ROLLBACK");
      return fail(...change.error);
    }
    await client.query("COMMIT");

    const { role: newRole, status: newStatus, changed } = change.membership;
    return ok({
      message: changed ? "Access updated." : "No changes were needed.",
      member: { user_id: targetUserId, role: newRole, membership_status: newStatus },
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Update member failed", error, "Unable to update member access.");
  } finally {
    client?.release();
  }
}
