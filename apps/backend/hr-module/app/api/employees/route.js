
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, getActiveCompanyMembership } from "@/lib/session";
import { isSameOriginRequest } from "@/lib/security";

function validCompanyId(value) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value);
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
         employee_code,
         name,
         department,
         designation,
         email,
         phone,
         status,
         created_at,
         updated_at
       FROM employees
       WHERE company_id = $1
       ORDER BY name ASC`,
      [companyId]
    );

    return NextResponse.json({
      success: true,
      count: result.rowCount,
      employees: result.rows,
    });
  } catch (error) {
    console.error("List employees failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve employees." },
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

    const companyId =
      typeof body.companyId === "number" &&
      Number.isSafeInteger(body.companyId) &&
      body.companyId > 0
        ? String(body.companyId)
        : typeof body.companyId === "string"
          ? body.companyId.trim()
          : "";

    const employeeCode =
      typeof body.employeeCode === "string"
        ? body.employeeCode.trim()
        : "";

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const department =
      typeof body.department === "string" ? body.department.trim() : "";
    const designation =
      typeof body.designation === "string" ? body.designation.trim() : "";
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const status = body.status === undefined ? "Active" : body.status;

    if (
      !validCompanyId(companyId) ||
      employeeCode.length < 1 ||
      employeeCode.length > 30 ||
      name.length < 2 ||
      name.length > 200 ||
      department.length < 1 ||
      department.length > 150 ||
      designation.length < 1 ||
      designation.length > 150 ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phone.length > 30 ||
      !["Active", "Inactive"].includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter valid employee details and a valid companyId.",
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
      `INSERT INTO employees (
         company_id,
         employee_code,
         name,
         department,
         designation,
         email,
         phone,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING
         id,
         company_id,
         employee_code,
         name,
         department,
         designation,
         email,
         phone,
         status,
         created_at,
         updated_at`,
      [
        companyId,
        employeeCode,
        name,
        department,
        designation,
        email,
        phone || null,
        status,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Employee created successfully.",
        employee: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "Employee code or email already exists in this company.",
        },
        { status: 409 }
      );
    }

    console.error("Create employee failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create employee." },
      { status: 500 }
    );
  }
}
