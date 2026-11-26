import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { pool } from "@/lib/db";
import { parseId, fail } from "@/lib/api";
import { buildMembershipAccessContext } from "@/lib/hrms-access";

/**
 * Returns IAM-shaped access context for the active company.
 * Used when tenant/org context changes without a full session reload.
 */
export async function GET(request) {
  await connection();

  const user = await getAuthenticatedUser();
  if (!user) {
    return fail(401, "Not authenticated.");
  }

  const companyId = parseId(
    new URL(request.url).searchParams.get("companyId"),
  );
  if (!companyId) {
    return fail(400, "companyId is required.");
  }

  const membershipResult = await pool.query(
    `SELECT
       cm.id,
       cm.company_id,
       cm.role,
       c.company_name,
       e.id AS employee_id,
       EXISTS (
         SELECT 1 FROM approval_delegates d
         WHERE d.company_id = cm.company_id AND d.user_id = cm.user_id AND d.revoked_at IS NULL
       ) AS is_approval_delegate
     FROM company_memberships cm
     JOIN companies c ON c.id = cm.company_id
     LEFT JOIN employees e ON e.company_id = cm.company_id AND e.user_id = cm.user_id
     WHERE cm.user_id = $1
       AND cm.company_id = $2
       AND cm.status = 'active'
       AND c.status = 'active'
     LIMIT 1`,
    [user.id, companyId],
  );

  const membership = membershipResult.rows[0];
  if (!membership) {
    return fail(403, "You do not have access to this company.");
  }

  const employeeId = membership.employee_id
    ? String(membership.employee_id)
    : null;

  const access = buildMembershipAccessContext({
    companyId: membership.company_id,
    companyName: membership.company_name,
    role: membership.role,
    employeeId,
    isApprovalDelegate: membership.is_approval_delegate,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      platformRole: user.platform_role,
    },
    access,
  });
}