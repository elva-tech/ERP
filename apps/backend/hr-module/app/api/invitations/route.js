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
import {
  INVITATION_TTL_HOURS,
  MEMBERSHIP_ROLES,
  canGrantRole,
  createInvitationToken,
  currentActorRole,
  hashInvitationToken,
  invitationState,
  lockCompanyAccess,
  recordMembershipEvent,
} from "@/lib/access";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function present(row) {
  return {
    id: String(row.id),
    email: row.email,
    role: row.role,
    employee_id: row.employee_id ? String(row.employee_id) : null,
    employee_name: row.employee_name ?? null,
    invited_by_name: row.invited_by_name ?? null,
    created_at: row.created_at,
    expires_at: row.expires_at,
    accepted_at: row.accepted_at,
    revoked_at: row.revoked_at,
    state: invitationState(row),
  };
}

/**
 * GET /api/invitations?companyId=X  (managers)
 * The company's 100 most recent invitations. Tokens are never returned.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES });
    if (access.error) return access.error;

    const result = await pool.query(
      `SELECT i.id, i.email, i.role, i.employee_id, i.created_at, i.expires_at,
              i.accepted_at, i.revoked_at, e.name AS employee_name, u.full_name AS invited_by_name
       FROM company_invitations i
       LEFT JOIN employees e ON e.id = i.employee_id AND e.company_id = i.company_id
       JOIN users u ON u.id = i.invited_by
       WHERE i.company_id = $1
       ORDER BY i.created_at DESC
       LIMIT 100`,
      [access.companyId]
    );
    return ok({ count: result.rowCount, invitations: result.rows.map(present) });
  } catch (error) {
    return serverError("List invitations failed", error, "Unable to retrieve invitations.");
  }
}

/**
 * POST /api/invitations?companyId=X  (managers)
 * { email, role, employeeId? } issues a one-time link for this company only.
 * Company admins may invite any role; HR managers may invite employees only.
 * A new invitation for the same email or employee replaces the open one.
 * The token is returned once, in this response, and only its hash is stored.
 */
export async function POST(request) {
  await connection();

  let client;
  try {
    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES, mutation: true });
    if (access.error) return access.error;

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const email = trimmed(parsed.body.email).toLowerCase();
    const role = parsed.body.role;
    const employeeId =
      parsed.body.employeeId === undefined || parsed.body.employeeId === null || parsed.body.employeeId === ""
        ? null
        : parseId(parsed.body.employeeId);

    if (!email || email.length > 255 || !EMAIL_PATTERN.test(email)) {
      return fail(400, "Enter a valid email address.");
    }
    if (!MEMBERSHIP_ROLES.includes(role)) {
      return fail(400, "Role must be company_admin, hr_manager or employee.");
    }
    if (parsed.body.employeeId !== undefined && parsed.body.employeeId !== null && parsed.body.employeeId !== "" && !employeeId) {
      return fail(400, "employeeId must be a valid ID.");
    }

    client = await pool.connect();
    await client.query("BEGIN");
    await lockCompanyAccess(client, access.companyId);

    const actorRole = await currentActorRole(client, access.companyId, access.user.id);
    if (!canGrantRole(actorRole, role)) {
      await client.query("ROLLBACK");
      return fail(403, "You cannot invite someone with this role.");
    }

    const existingMember = await client.query(
      `SELECT cm.status FROM company_memberships cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.company_id = $1 AND u.email = $2`,
      [access.companyId, email]
    );
    if (existingMember.rowCount) {
      await client.query("ROLLBACK");
      return fail(
        409,
        existingMember.rows[0].status === "suspended"
          ? "This person is already a member whose access is suspended. Reactivate them from Users & Access instead."
          : "This person is already a member of this company."
      );
    }

    if (employeeId) {
      const employee = await client.query(
        "SELECT status, user_id FROM employees WHERE id = $1 AND company_id = $2 FOR UPDATE",
        [employeeId, access.companyId]
      );
      const row = employee.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return fail(400, "The selected employee record does not exist in this company.");
      }
      if (row.user_id) {
        await client.query("ROLLBACK");
        return fail(409, "The selected employee record is already linked to a login.");
      }
      if (row.status !== "Active") {
        await client.query("ROLLBACK");
        return fail(400, "The selected employee record is inactive.");
      }
    }

    const replaced = await client.query(
      `UPDATE company_invitations
       SET revoked_at = NOW(), revoked_by = $2
       WHERE company_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL
         AND (email = $3 OR ($4::bigint IS NOT NULL AND employee_id = $4::bigint))
       RETURNING id`,
      [access.companyId, access.user.id, email, employeeId]
    );
    for (const row of replaced.rows) {
      await recordMembershipEvent(client, {
        companyId: access.companyId,
        invitationId: row.id,
        action: "invitation_revoked",
        actorUserId: access.user.id,
        note: "Replaced by a new invitation",
      });
    }

    const token = createInvitationToken();
    const inserted = await client.query(
      `INSERT INTO company_invitations
         (company_id, email, role, employee_id, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + make_interval(hours => $7))
       RETURNING id, email, role, employee_id, created_at, expires_at, accepted_at, revoked_at`,
      [access.companyId, email, role, employeeId, hashInvitationToken(token), access.user.id, INVITATION_TTL_HOURS]
    );
    const invitation = inserted.rows[0];
    await recordMembershipEvent(client, {
      companyId: access.companyId,
      invitationId: invitation.id,
      action: "invited",
      newRole: role,
      actorUserId: access.user.id,
      note: email,
    });
    await client.query("COMMIT");

    return ok(
      {
        message: "Invitation created. Share the link with the invitee; it is shown only once.",
        invitation: present(invitation),
        token,
      },
      201
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") return fail(409, "An open invitation already exists. Try again.");
    return serverError("Create invitation failed", error, "Unable to create invitation.");
  } finally {
    client?.release();
  }
}
