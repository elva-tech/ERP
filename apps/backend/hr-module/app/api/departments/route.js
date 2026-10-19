
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  getAuthenticatedUser,
  getActiveCompanyMembership,
} from "@/lib/session";
import { isSameOriginRequest } from "@/lib/security";

function isValidCompanyId(value) {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value);
}

function getCompanyId(request) {
  return new URL(request.url).searchParams.get("companyId");
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

    const companyId = getCompanyId(request);

    if (!isValidCompanyId(companyId)) {
      return NextResponse.json(
        { success: false, message: "A valid companyId is required." },
        { status: 400 }
      );
    }

    const membership = await getActiveCompanyMembership(user.id, companyId);

    if (!membership) {
      return NextResponse.json(
        { success: false, message: "Active company membership required." },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `SELECT
         id,
         company_id,
         department_name,
         description,
         status,
         created_at,
         updated_at
       FROM departments
       WHERE company_id = $1
       ORDER BY department_name ASC`,
      [companyId]
    );

    return NextResponse.json({
      success: true,
      count: result.rowCount,
      departments: result.rows,
    });
  } catch (error) {
    console.error("List departments failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve departments." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Forbidden request origin." },
      { status: 403 }
    );
  }

  await connection();

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

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Request body must be a JSON object." },
        { status: 400 }
      );
    }

    const companyId =
      typeof body.companyId === "number" &&
      Number.isSafeInteger(body.companyId) &&
      body.companyId > 0
        ? String(body.companyId)
        : typeof body.companyId === "string"
          ? body.companyId.trim()
          : "";

    const departmentName =
      typeof body.departmentName === "string"
        ? body.departmentName.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const status = body.status === undefined ? "Active" : body.status;

    if (
      !isValidCompanyId(companyId) ||
      departmentName.length < 2 ||
      departmentName.length > 150 ||
      description.length > 5000 ||
      !["Active", "Inactive"].includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid companyId, department name, description, and status.",
        },
        { status: 400 }
      );
    }

    const membership = await getActiveCompanyMembership(user.id, companyId);

    if (
      !membership ||
      !["company_admin", "hr_manager"].includes(membership.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "An active company administrator or HR manager is required.",
        },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `INSERT INTO departments (
         company_id,
         department_name,
         description,
         status
       )
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         company_id,
         department_name,
         description,
         status,
         created_at,
         updated_at`,
      [companyId, departmentName, description || null, status]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Department created successfully.",
        department: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "A department with this name already exists in this company.",
        },
        { status: 409 }
      );
    }

    console.error("Create department failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create department." },
      { status: 500 }
    );
  }
}
