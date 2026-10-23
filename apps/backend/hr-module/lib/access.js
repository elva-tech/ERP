import { createHash, randomBytes } from "node:crypto";

/**
 * Company access management: invitations, role changes, suspension and the
 * audit trail. Every function takes the caller's transaction client; callers
 * must hold lockCompanyAccess() before reading and changing memberships so
 * that concurrent changes cannot remove the last active company admin.
 */

export const MEMBERSHIP_ROLES = ["company_admin", "hr_manager", "employee"];

/** Roles each actor role may grant, by invitation or role change. */
const GRANTABLE_ROLES = {
  company_admin: MEMBERSHIP_ROLES,
  hr_manager: ["employee"],
};

export function canGrantRole(actorRole, role) {
  return (GRANTABLE_ROLES[actorRole] || []).includes(role);
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const INVITATION_TTL_HOURS = positiveInt(process.env.INVITATION_TTL_HOURS, 72);

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** 256-bit random token; only its SHA-256 hash is stored. */
export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

/** Returns the hash for a well-formed token, or null. */
export function hashInvitationToken(token) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}

export function invitationState(row, now = new Date()) {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  if (new Date(row.expires_at) <= now) return "expired";
  return "pending";
}

export async function lockCompanyAccess(client, companyId) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('company_access'), $1::int)", [
    Number(companyId) % 2147483647,
  ]);
}

/** The actor's current role, re-read inside the transaction, or null. */
export async function currentActorRole(client, companyId, userId) {
  const result = await client.query(
    `SELECT cm.role
     FROM company_memberships cm
     JOIN companies c ON c.id = cm.company_id
     JOIN users u ON u.id = cm.user_id
     WHERE cm.company_id = $1 AND cm.user_id = $2
       AND cm.status = 'active' AND c.status = 'active' AND u.status = 'active'`,
    [companyId, userId]
  );
  return result.rows[0]?.role ?? null;
}

async function countActiveAdmins(client, companyId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM company_memberships cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.company_id = $1 AND cm.role = 'company_admin'
       AND cm.status = 'active' AND u.status = 'active'`,
    [companyId]
  );
  return result.rows[0].n;
}

export async function recordMembershipEvent(client, event) {
  await client.query(
    `INSERT INTO membership_events
       (company_id, user_id, invitation_id, action, previous_role, new_role, actor_user_id, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      event.companyId,
      event.userId ?? null,
      event.invitationId ?? null,
      event.action,
      event.previousRole ?? null,
      event.newRole ?? null,
      event.actorUserId,
      event.note ?? null,
    ]
  );
}

const LAST_ADMIN_MESSAGE =
  "This is the company's last active company admin. Make another member a company admin first.";

/**
 * Applies a role and/or status change to another member of the company.
 * Returns { membership } or { error: [httpStatus, message] }. The caller holds
 * lockCompanyAccess and owns the transaction.
 */
export async function changeMembership(client, { companyId, actorUserId, targetUserId, role, status, note }) {
  if (String(actorUserId) === String(targetUserId)) {
    return { error: [403, "You cannot change your own access."] };
  }

  const actorRole = await currentActorRole(client, companyId, actorUserId);
  if (!actorRole || !["company_admin", "hr_manager"].includes(actorRole)) {
    return { error: [403, "You do not have permission to perform this action."] };
  }

  const current = await client.query(
    `SELECT role, status FROM company_memberships
     WHERE company_id = $1 AND user_id = $2
     FOR UPDATE`,
    [companyId, targetUserId]
  );
  const membership = current.rows[0];
  if (!membership) return { error: [404, "Member not found in this company."] };
  if (!["active", "suspended"].includes(membership.status)) {
    return { error: [409, "Only active or suspended members can be changed here."] };
  }

  const nextRole = role ?? membership.role;
  const nextStatus = status ?? membership.status;

  if (actorRole !== "company_admin") {
    if (nextRole !== membership.role) {
      return { error: [403, "Only a company admin can change roles."] };
    }
    if (membership.role !== "employee") {
      return { error: [403, "Only a company admin can suspend or reactivate admin or HR access."] };
    }
  } else if (!canGrantRole(actorRole, nextRole)) {
    return { error: [400, "Role must be company_admin, hr_manager or employee."] };
  }

  if (nextRole === membership.role && nextStatus === membership.status) {
    return { membership: { ...membership, changed: false } };
  }

  if (membership.status === "suspended" && nextStatus === "active") {
    const linked = await client.query(
      "SELECT status FROM employees WHERE company_id = $1 AND user_id = $2",
      [companyId, targetUserId]
    );
    if (linked.rows[0] && linked.rows[0].status !== "Active") {
      return {
        error: [409, "Their employee record is inactive. Activate the employee record before restoring access."],
      };
    }
  }

  const losesAdmin =
    membership.role === "company_admin" &&
    membership.status === "active" &&
    (nextRole !== "company_admin" || nextStatus !== "active");
  if (losesAdmin && (await countActiveAdmins(client, companyId)) <= 1) {
    return { error: [409, LAST_ADMIN_MESSAGE] };
  }

  await client.query(
    `UPDATE company_memberships SET role = $1, status = $2
     WHERE company_id = $3 AND user_id = $4`,
    [nextRole, nextStatus, companyId, targetUserId]
  );

  if (nextRole !== membership.role) {
    await recordMembershipEvent(client, {
      companyId,
      userId: targetUserId,
      action: "role_changed",
      previousRole: membership.role,
      newRole: nextRole,
      actorUserId,
      note,
    });
  }
  if (nextStatus !== membership.status) {
    await recordMembershipEvent(client, {
      companyId,
      userId: targetUserId,
      action: nextStatus === "suspended" ? "suspended" : "reactivated",
      previousRole: membership.role,
      newRole: nextRole,
      actorUserId,
      note,
    });
  }

  return { membership: { role: nextRole, status: nextStatus, changed: true } };
}
