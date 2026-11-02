import { connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, ok, readJsonObject, serverError } from "@/lib/api";
import { hashInvitationToken, invitationState } from "@/lib/access";
import { isSafeRequestOrigin } from "@/lib/security";

const UNAVAILABLE = {
  expired: "This invitation has expired. Ask your administrator for a new link.",
  accepted: "This invitation has already been used.",
  revoked: "This invitation has been withdrawn. Ask your administrator for a new link.",
};

/**
 * POST /api/invitations/lookup  { token }  (public)
 * Describes a pending invitation so the invitee can confirm the company and
 * choose between creating an account and signing in. The token is sent in
 * the body, never in a URL, so it does not end up in server logs.
 */
export async function POST(request) {
  await connection();

  try {
    if (!isSafeRequestOrigin(request)) return fail(403, "Forbidden request origin.");

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const tokenHash = hashInvitationToken(parsed.body.token);
    if (!tokenHash) return fail(404, "This invitation link is not valid.");

    const result = await pool.query(
      `SELECT i.email, i.role, i.expires_at, i.accepted_at, i.revoked_at,
              c.company_name, c.status AS company_status, e.name AS employee_name,
              EXISTS (SELECT 1 FROM users u WHERE u.email = i.email) AS account_exists
       FROM company_invitations i
       JOIN companies c ON c.id = i.company_id
       LEFT JOIN employees e ON e.id = i.employee_id AND e.company_id = i.company_id
       WHERE i.token_hash = $1`,
      [tokenHash]
    );
    const invitation = result.rows[0];
    if (!invitation) return fail(404, "This invitation link is not valid.");

    const state = invitationState(invitation);
    if (state !== "pending") return fail(410, UNAVAILABLE[state], { state });
    if (invitation.company_status !== "active") {
      return fail(403, "This company is not active. Contact your administrator.");
    }

    return ok({
      invitation: {
        companyName: invitation.company_name,
        email: invitation.email,
        role: invitation.role,
        employeeName: invitation.employee_name,
        expiresAt: invitation.expires_at,
        accountExists: invitation.account_exists,
      },
    });
  } catch (error) {
    return serverError("Invitation lookup failed", error, "Unable to check this invitation.");
  }
}
