
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { pool } from "@/lib/db";

export async function GET() {
  await connection();

  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    // Fetch company memberships for this user
    const membershipsResult = await pool.query(
      `SELECT
         cm.id,
         cm.company_id,
         cm.role,
         cm.status,
         c.company_name,
         c.status AS company_status,
         e.id AS employee_id,
         EXISTS (
           SELECT 1 FROM approval_delegates d
           WHERE d.company_id = cm.company_id AND d.user_id = cm.user_id AND d.revoked_at IS NULL
         ) AS is_approval_delegate
       FROM company_memberships cm
       JOIN companies c ON c.id = cm.company_id
       LEFT JOIN employees e ON e.company_id = cm.company_id AND e.user_id = cm.user_id
       WHERE cm.user_id = $1
         AND cm.status = 'active'
         AND c.status = 'active'
       ORDER BY c.company_name ASC`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        platformRole: user.platform_role,
      },
      memberships: membershipsResult.rows.map((m) => ({
        id: m.id,
        companyId: m.company_id,
        companyName: m.company_name,
        role: m.role,
        status: m.status,
        employeeId: m.employee_id ? String(m.employee_id) : null,
        isApprovalDelegate: m.is_approval_delegate,
      })),
    });
  } catch (error) {
    console.error("Session check failed:", error.message);

    return NextResponse.json(
      { success: false, message: "Unable to verify session." },
      { status: 500 }
    );
  }
}
