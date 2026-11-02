import { NextResponse, connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, readJsonObject, serverError, trimmed } from "@/lib/api";
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "@/lib/auth";
import {
  canGrantRole,
  currentActorRole,
  hashInvitationToken,
  invitationState,
  lockCompanyAccess,
  recordMembershipEvent,
} from "@/lib/access";
import {
  clientIp,
  lockIdentifier,
  loginIdentifier,
  recordAttempt,
  retryAfterSeconds,
} from "@/lib/login-throttle";
import { isSafeRequestOrigin } from "@/lib/security";
import { getAuthenticatedUser } from "@/lib/session";

const SESSION_COOKIE_NAME = "hrms_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

const UNAVAILABLE = {
  expired: "This invitation has expired. Ask your administrator for a new link.",
  accepted: "This invitation has already been used.",
  revoked: "This invitation has been withdrawn. Ask your administrator for a new link.",
};

/**
 * POST /api/invitations/accept  { token, fullName?, password? }  (public)
 *
 * The membership is always created in the invitation's own company with the
 * invitation's role; nothing in the request can choose another tenant.
 * - No account for the invited email: fullName and password (12-72 characters)
 *   create it. The administrator never sees or sets this password.
 * - Existing account: the invitee must already be signed in as that account,
 *   or prove it with the account password (throttled like sign-in).
 * The invitation is locked for the whole transaction, so it can be used once.
 */
export async function POST(request) {
  await connection();

  let client;
  try {
    if (!isSafeRequestOrigin(request)) return fail(403, "Forbidden request origin.");

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const tokenHash = hashInvitationToken(parsed.body.token);
    if (!tokenHash) return fail(404, "This invitation link is not valid.");
    const password = typeof parsed.body.password === "string" ? parsed.body.password : "";
    const fullName = trimmed(parsed.body.fullName);

    const sessionUser = await getAuthenticatedUser();

    client = await pool.connect();
    await client.query("BEGIN");

    const found = await client.query(
      `SELECT i.id, i.company_id, i.email, i.role, i.employee_id, i.invited_by,
              i.expires_at, i.accepted_at, i.revoked_at,
              c.company_name, c.status AS company_status
       FROM company_invitations i
       JOIN companies c ON c.id = i.company_id
       WHERE i.token_hash = $1
       FOR UPDATE OF i`,
      [tokenHash]
    );
    const invitation = found.rows[0];
    const reject = async (status, message, extra) => {
      await client.query("ROLLBACK");
      return fail(status, message, extra);
    };

    if (!invitation) return reject(404, "This invitation link is not valid.");
    const state = invitationState(invitation);
    if (state !== "pending") return reject(410, UNAVAILABLE[state], { state });
    if (invitation.company_status !== "active") {
      return reject(403, "This company is not active. Contact your administrator.");
    }

    const companyId = String(invitation.company_id);
    await lockCompanyAccess(client, companyId);

    // The issuer must still be allowed to grant this role.
    const issuerRole = await currentActorRole(client, companyId, invitation.invited_by);
    if (!canGrantRole(issuerRole, invitation.role)) {
      return reject(410, "This invitation is no longer valid. Ask your administrator for a new link.", {
        state: "invalid",
      });
    }

    const existing = await client.query(
      "SELECT id, status, password_hash FROM users WHERE email = $1 FOR UPDATE",
      [invitation.email]
    );
    const account = existing.rows[0];
    let userId;
    let issueSession = false;

    if (account) {
      if (account.status !== "active") return reject(403, "This account is disabled. Contact your administrator.");

      if (sessionUser) {
        if (String(sessionUser.id) !== String(account.id)) {
          return reject(403, "You are signed in with a different account. Sign out, then open the invitation link again.", {
            code: "wrong_account",
          });
        }
      } else {
        if (!password || password.length > 72) {
          return reject(401, "Sign in with your existing account to accept this invitation.", {
            requiresLogin: true,
          });
        }
        const identifierHash = loginIdentifier(invitation.email);
        const ip = clientIp(request);
        await lockIdentifier(client, identifierHash);
        const retryAfter = await retryAfterSeconds(client, identifierHash, ip);
        if (retryAfter > 0) {
          await client.query("ROLLBACK");
          const minutes = Math.ceil(retryAfter / 60);
          return NextResponse.json(
            {
              success: false,
              message: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
            },
            { status: 429, headers: { "Retry-After": String(retryAfter) } }
          );
        }
        if (!(await verifyPassword(password, account.password_hash))) {
          // Nothing but the failed attempt is written before this point.
          await recordAttempt(client, identifierHash, ip, false);
          await client.query("COMMIT");
          return fail(401, "Incorrect password for this account.", { requiresLogin: true });
        }
        await recordAttempt(client, identifierHash, ip, true);
        issueSession = true;
      }
      userId = String(account.id);
    } else {
      if (sessionUser) {
        return reject(403, "This invitation is for a different email address. Sign out, then open the link again.", {
          code: "wrong_account",
        });
      }
      if (fullName.length < 2 || fullName.length > 200) {
        return reject(400, "Enter your full name (2-200 characters).");
      }
      if (password.length < 12 || password.length > 72) {
        return reject(400, "Choose a password of 12-72 characters.");
      }
      const created = await client.query(
        `INSERT INTO users (email, password_hash, full_name, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id`,
        [invitation.email, await hashPassword(password), fullName]
      );
      userId = String(created.rows[0].id);
      issueSession = true;
    }

    const membership = await client.query(
      "SELECT status FROM company_memberships WHERE company_id = $1 AND user_id = $2",
      [companyId, userId]
    );
    if (membership.rowCount) {
      return reject(409, "You are already a member of this company.");
    }
    await client.query(
      `INSERT INTO company_memberships (company_id, user_id, role, status)
       VALUES ($1, $2, $3, 'active')`,
      [companyId, userId, invitation.role]
    );

    if (invitation.employee_id) {
      const linked = await client.query(
        `UPDATE employees SET user_id = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3 AND user_id IS NULL AND status = 'Active'
         RETURNING id`,
        [userId, invitation.employee_id, companyId]
      );
      if (!linked.rowCount) {
        return reject(409, "The employee record for this invitation is no longer available. Ask your administrator for a new link.");
      }
    }

    await client.query(
      "UPDATE company_invitations SET accepted_at = NOW(), accepted_by = $1 WHERE id = $2",
      [userId, invitation.id]
    );
    await recordMembershipEvent(client, {
      companyId,
      userId,
      invitationId: invitation.id,
      action: "invitation_accepted",
      newRole: invitation.role,
      actorUserId: userId,
    });

    let token;
    let expiresAt;
    if (issueSession) {
      token = createSessionToken();
      expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
      await client.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
        userId,
        hashSessionToken(token),
        expiresAt,
      ]);
    }
    await client.query("COMMIT");

    const response = NextResponse.json({
      success: true,
      message: `You have joined ${invitation.company_name}.`,
      companyId,
      companyName: invitation.company_name,
      role: invitation.role,
    });
    if (token) {
      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });
    }
    return response;
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") return fail(409, "This invitation could not be accepted. Try again.");
    return serverError("Accept invitation failed", error, "Unable to accept this invitation.");
  } finally {
    client?.release();
  }
}
