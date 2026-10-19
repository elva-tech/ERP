
import { connection } from "next/server";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  getAuthenticatedUser,
  getActiveCompanyMembership,
} from "@/lib/session";
import { isSameOriginRequest } from "@/lib/security";

function validCompanyId(value) {
  return (
    (typeof value === "string" || typeof value === "number") &&
    /^\d{1,19}$/.test(String(value)) &&
    BigInt(value) > 0n &&
    BigInt(value) <= 9223372036854775807n
  );
}

function validateDesignation(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "A valid JSON object is required.";
  }

  if (!validCompanyId(body.companyId)) {
    return "A valid companyId is required.";
  }

  if (
    typeof body.designationName !== "string" ||
    body.designationName.trim().length < 2 ||
    body.designationName.trim().length > 150
  ) {
    return "designationName must be between 2 and 150 characters.";
  }

  if (
    body.description != null &&
    (typeof body.description !== "string" ||
      body.description.length > 5000)
  ) {
    return "description must be a string of at most 5000 characters.";
  }

  if (
    body.status != null &&
    !["Active", "Inactive"].includes(body.status)
  ) {
    return "status must be Active or Inactive.";
  }

  return null;
}

async function requireMembership(userId, companyId) {
  return getActiveCompanyMembership(userId, companyId);
}

export async function GET(request) {
  await connection();

  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const companyId = new URL(request.url).searchParams.get("companyId");

    if (!validCompanyId(companyId)) {
      return NextResponse.json(
        { success: false, message: "A valid companyId is required." },
        { status: 400 }
      );
    }

    const membership = await requireMembership(user.id, companyId);

    if (!membership) {
      return NextResponse.json(
        { success: false, message: "Active company membership required." },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `SELECT id, company_id, designation_name, description, status,
              created_at, updated_at
       FROM designations
       WHERE company_id = $1
       ORDER BY designation_name ASC`,
      [companyId]
    );

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      designations: result.rows,
    });
  } catch (error) {
    console.error("List designations failed:", error);

    return NextResponse.json(
      { success: false, message: "Failed to retrieve designations." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  await connection();

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Invalid request origin." },
      { status: 403 }
    );
  }

  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
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

    const validationError = validateDesignation(body);

    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    const companyId = String(body.companyId);
    const designationName = body.designationName.trim();
    const description = body.description?.trim() || null;
    const status = body.status ?? "Active";

    const membership = await requireMembership(user.id, companyId);

    if (
      !membership ||
      !["company_admin", "hr_manager"].includes(membership.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Company admin or HR manager access required.",
        },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `INSERT INTO designations
         (company_id, designation_name, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, company_id, designation_name, description, status,
                 created_at, updated_at`,
      [companyId, designationName, description, status]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Designation created successfully.",
        designation: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "This designation already exists for this company.",
        },
        { status: 409 }
      );
    }

    console.error("Create designation failed:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create designation." },
      { status: 500 }
    );
  }
}
