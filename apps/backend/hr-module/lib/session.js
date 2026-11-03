
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { hashSessionToken } from "@/lib/auth";

const SESSION_COOKIE_NAME = "hrms_session";

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.full_name,
       u.platform_role,
       u.status,
       s.id AS session_id
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
       AND u.status = 'active'
     LIMIT 1`,
    [tokenHash]
  );

  return result.rows[0] ?? null;
}

export async function getActiveCompanyMembership(userId, companyId) {
  if (!userId || !companyId) {
    return null;
  }

  const result = await pool.query(
    `SELECT
       cm.id,
       cm.company_id,
       cm.user_id,
       cm.role,
       cm.status
     FROM company_memberships cm
     JOIN companies c ON c.id = cm.company_id
     WHERE cm.user_id = $1
       AND cm.company_id = $2
       AND cm.status = 'active'
       AND c.status = 'active'
     LIMIT 1`,
    [userId, companyId]
  );

  return result.rows[0] ?? null;
}
