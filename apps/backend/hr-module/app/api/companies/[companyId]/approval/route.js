
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/session";
import { isSameOriginRequest } from "@/lib/security";

export async function PATCH(request, { params }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Forbidden request origin." },
      { status: 403 }
    );
  }

  try {
    const user = await getAuthenticatedUser();

    if (!user || user.platform_role !== "platform_admin") {
      return NextResponse.json(
        { success: false, message: "Platform administrator access required." },
        { status: 403 }
      );
    }

    const { companyId } = await params;

    if (!/^[1-9]\d*$/.test(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid company ID." },
        { status: 400 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const decision =
      typeof body.decision === "string"
        ? body.decision.trim().toLowerCase()
        : "";

    if (!["approve", "reject"].includes(decision)) {
      return NextResponse.json(
        {
          success: false,
          message: "Decision must be 'approve' or 'reject'.",
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const companyResult = await client.query(
        `SELECT id, company_name, status, onboarding_source
         FROM companies
         WHERE id = $1
         FOR UPDATE`,
        [companyId]
      );

      const company = companyResult.rows[0];

      if (!company) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          { success: false, message: "Company not found." },
          { status: 404 }
        );
      }

      if (
        company.onboarding_source !== "self_registration" ||
        company.status !== "pending"
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: "Only pending self-registered companies can be reviewed.",
          },
          { status: 409 }
        );
      }

      const newStatus = decision === "approve" ? "active" : "rejected";

      await client.query(
        `UPDATE companies
        SET status = $1::VARCHAR(20),
            approved_at = CASE
                WHEN $2::BOOLEAN THEN NOW()
                ELSE NULL
            END,
            approved_by = CASE
                WHEN $2::BOOLEAN THEN $3::BIGINT
                ELSE NULL
            END
        WHERE id = $4`,
        [
            newStatus,
            decision === "approve",
            user.id,
            companyId,
        ]
      );

      await client.query(
        `UPDATE company_memberships
         SET status = $1
         WHERE company_id = $2
           AND role = 'company_admin'
           AND status = 'pending'`,
        [decision === "approve" ? "active" : "suspended", companyId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message:
          decision === "approve"
            ? "Company approved successfully."
            : "Company rejected successfully.",
        company: {
          id: company.id,
          name: company.company_name,
          status: newStatus,
        },
      });

    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Company approval rollback failed:", rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Company approval failed:", error);

    return NextResponse.json(
        {
        success: false,
        message:
            process.env.NODE_ENV === "development"
            ? error.message
            : "Unable to process company approval.",
        },
        { status: 500 }
    );
  }
}
