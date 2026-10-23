import { connection } from "next/server";
import { pool } from "@/lib/db";
import { MANAGER_ROLES, isManager, ok, requireCompanyAccess, serverError } from "@/lib/api";
import { isActiveDelegate } from "@/lib/approvals";
import { TIMEZONE } from "@/lib/attendance";

/**
 * GET /api/approvals/pending?companyId=X (any member)
 * Pending leave, regularization and advance requests the signed-in member is
 * allowed to review: everything except their own for admins/HR managers;
 * only requests raised by admins/HR managers (except their own) for an
 * approval delegate; nothing for other members.
 */
export async function GET(request) {
  await connection();
  try {
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const manager = isManager(access.membership);
    const delegate = !manager && (await isActiveDelegate(access.companyId, access.user.id));
    if (!manager && !delegate) {
      return ok({ authority: null, leaveRequests: [], regularizations: [], advances: [] });
    }

    // $1 company, $2 reviewer user id, $3 restrict to manager-role requesters.
    const scope = `
      e.company_id = $1
      AND (e.user_id IS NULL OR e.user_id <> $2)
      AND (NOT $3::boolean OR EXISTS (
        SELECT 1 FROM company_memberships cm
        WHERE cm.company_id = e.company_id AND cm.user_id = e.user_id
          AND cm.status = 'active' AND cm.role = ANY($4::text[])))`;
    const values = [access.companyId, access.user.id, delegate, MANAGER_ROLES];

    const [leave, regularizations, advances] = await Promise.all([
      pool.query(
        `SELECT lr.id, lr.employee_id, e.name AS employee_name, e.employee_code, lt.name AS leave_type_name,
                to_char(lr.from_date, 'YYYY-MM-DD') AS from_date, to_char(lr.to_date, 'YYYY-MM-DD') AS to_date,
                lr.days::float8 AS days, lr.reason, lr.created_at
         FROM leave_requests lr
         JOIN employees e ON e.id = lr.employee_id
         JOIN leave_types lt ON lt.id = lr.leave_type_id
         WHERE lr.company_id = $1 AND lr.status = 'Pending' AND ${scope}
         ORDER BY lr.created_at`,
        values
      ),
      pool.query(
        `SELECT r.id, r.employee_id, e.name AS employee_name, e.employee_code,
                to_char(r.attendance_date, 'YYYY-MM-DD') AS attendance_date,
                to_char(r.requested_check_in AT TIME ZONE $5::text, 'HH24:MI') AS requested_check_in,
                to_char(r.requested_check_out AT TIME ZONE $5::text, 'HH24:MI') AS requested_check_out,
                r.reason, r.created_at
         FROM attendance_regularizations r
         JOIN employees e ON e.id = r.employee_id
         WHERE r.company_id = $1 AND r.status = 'Pending' AND ${scope}
         ORDER BY r.created_at`,
        [...values, TIMEZONE]
      ),
      pool.query(
        `SELECT a.id, a.employee_id, e.name AS employee_name, e.employee_code,
                a.amount::float8 AS amount, a.emi_amount::float8 AS emi_amount, a.purpose, a.created_at
         FROM employee_advances a
         JOIN employees e ON e.id = a.employee_id
         WHERE a.company_id = $1 AND a.status = 'Pending' AND ${scope}
         ORDER BY a.created_at`,
        values
      ),
    ]);

    return ok({
      authority: manager ? "manager" : "delegate",
      leaveRequests: leave.rows,
      regularizations: regularizations.rows,
      advances: advances.rows,
    });
  } catch (error) {
    return serverError("List pending approvals failed", error, "Unable to retrieve pending approvals.");
  }
}
