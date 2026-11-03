
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/session";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    const user = await getAuthenticatedUser();

    if (!user || user.platform_role !== "platform_admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Platform administrator access required.",
        },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `SELECT
         c.id AS company_id,
         c.company_name,
         c.created_at AS registered_at,
         u.id AS admin_user_id,
         u.full_name AS admin_name,
         u.email AS admin_email
       FROM companies c
       JOIN company_memberships cm
         ON cm.company_id = c.id
       JOIN users u
         ON u.id = cm.user_id
       WHERE c.status = 'pending'
         AND c.onboarding_source = 'self_registration'
         AND cm.role = 'company_admin'
         AND cm.status = 'pending'
       ORDER BY c.created_at ASC`
    );

    return NextResponse.json({
      success: true,
      count: result.rowCount,
      companies: result.rows,
    });
  } catch (error) {
    console.error("Pending companies API failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve pending companies.",
      },
      { status: 500 }
    );
  }
}
