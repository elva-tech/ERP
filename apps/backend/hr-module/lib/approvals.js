import { pool } from "@/lib/db";
import { MANAGER_ROLES, isManager, isOwnRecord } from "@/lib/api";

/**
 * Separation of duties for leave, regularization and advance reviews:
 * - nobody may review a request for their own employee record;
 * - company admins and HR managers review everyone else's requests;
 * - a member a company admin has designated as an approval delegate may
 *   review requests raised by the company's admins/HR managers only. This
 *   resolves the case where the only admin needs their own request reviewed
 *   without removing the self-approval rule.
 * Every decision is written to approval_audit_log with the authority used.
 */

export async function isActiveDelegate(companyId, userId, db = pool) {
  const result = await db.query(
    `SELECT 1 FROM approval_delegates d
     JOIN company_memberships cm ON cm.company_id = d.company_id AND cm.user_id = d.user_id AND cm.status = 'active'
     WHERE d.company_id = $1 AND d.user_id = $2 AND d.revoked_at IS NULL
     LIMIT 1`,
    [companyId, userId]
  );
  return result.rowCount > 0;
}

/** Whether the member may review any request at all (managers or delegates). */
export async function canReview(access, db = pool) {
  return isManager(access.membership) || isActiveDelegate(access.companyId, access.user.id, db);
}

/** Role of the login linked to an employee record (null when not linked). */
async function requesterRole(companyId, employeeId, db) {
  const result = await db.query(
    `SELECT cm.role FROM employees e
     JOIN company_memberships cm ON cm.company_id = e.company_id AND cm.user_id = e.user_id AND cm.status = 'active'
     WHERE e.id = $1 AND e.company_id = $2`,
    [employeeId, companyId]
  );
  return result.rows[0]?.role ?? null;
}

/**
 * Returns { authority: "manager" | "delegate" } or { status, message }.
 * noun: "leave request", "regularization request", "advance request".
 */
export async function reviewAuthority({ companyId, user, membership, employeeId, noun }, db = pool) {
  if (await isOwnRecord(companyId, user, employeeId, db)) {
    return { status: 403, message: `You cannot approve or reject your own ${noun}.` };
  }
  if (isManager(membership)) return { authority: "manager" };
  if (!(await isActiveDelegate(companyId, user.id, db))) {
    return { status: 403, message: `Only company admins, HR managers or an approval delegate can review a ${noun}.` };
  }
  const role = await requesterRole(companyId, employeeId, db);
  if (!MANAGER_ROLES.includes(role)) {
    return {
      status: 403,
      message: "Approval delegates can only review requests raised by company admins or HR managers.",
    };
  }
  return { authority: "delegate" };
}

export async function logApproval(db, { companyId, entityType, entityId, employeeId, action, actorUserId, authority, note = null }) {
  await db.query(
    `INSERT INTO approval_audit_log (company_id, entity_type, entity_id, employee_id, action, actor_user_id, authority, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [companyId, entityType, entityId, employeeId, action, actorUserId, authority, note]
  );
}
