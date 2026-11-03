import { connection } from "next/server";
import { pool } from "@/lib/db";
import { MANAGER_ROLES, ok, requireCompanyAccess, serverError } from "@/lib/api";

/**
 * GET /api/members?companyId=X[&includeSuspended=1]  (managers)
 * Logins of the company and the employee record each one is linked to. By
 * default only active logins are listed (used to link a login to an employee
 * record); includeSuspended=1 also lists suspended members for access management.
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES });
    if (access.error) return access.error;

    const includeSuspended = new URL(request.url).searchParams.get("includeSuspended") === "1";
    const result = await pool.query(
      `SELECT u.id AS user_id, u.full_name, u.email, cm.role,
              cm.status AS membership_status, cm.created_at AS member_since,
              e.id AS employee_id, e.name AS employee_name, e.employee_code,
              e.status AS employee_status
       FROM company_memberships cm
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN employees e ON e.company_id = cm.company_id AND e.user_id = cm.user_id
       WHERE cm.company_id = $1 AND u.status = 'active'
         AND cm.status = ANY($2::text[])
       ORDER BY cm.status ASC, u.full_name ASC`,
      [access.companyId, includeSuspended ? ["active", "suspended"] : ["active"]]
    );
    return ok({ count: result.rowCount, members: result.rows });
  } catch (error) {
    return serverError("List members failed", error, "Unable to retrieve company members.");
  }
}
