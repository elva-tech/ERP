
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  getAuthenticatedUser,
  getActiveCompanyMembership,
} from "@/lib/session";
import { isSameOriginRequest } from "@/lib/security";

function validId(value) {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value);
}

function parseCompanyId(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function validateEmployee(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const employeeCode =
    typeof body.employeeCode === "string" ? body.employeeCode.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const department =
    typeof body.department === "string" ? body.department.trim() : "";
  const designation =
    typeof body.designation === "string" ? body.designation.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const status = body.status;

  if (
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
    (status !== undefined && !["Active", "Inactive"].includes(status))
  ) {
    return "Enter valid employee details.";
  }

  return null;
}

function employeeValues(body) {
  return [
    body.employeeCode.trim(),
    body.name.trim(),
    body.department.trim(),
    body.designation.trim(),
    body.email.trim().toLowerCase(),
    typeof body.phone === "string" ? body.phone.trim() || null : null,
    body.status ?? "Active",
  ];
}

async function authorizeEmployee(request, employeeId, requiredRoles = []) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  const companyId = parseCompanyId(
    new URL(request.url).searchParams.get("companyId")
  );

  if (!validId(employeeId) || !validId(companyId)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "A valid employeeId and companyId are required.",
        },
        { status: 400 }
      ),
    };
  }

  const membership = await getActiveCompanyMembership(user.id, companyId);

  if (!membership) {
    return {
      error: NextResponse.json(
        { success: false, message: "Active company membership required." },
        { status: 403 }
      ),
    };
  }

  if (requiredRoles.length && !requiredRoles.includes(membership.role)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "You do not have permission to perform this action.",
        },
        { status: 403 }
      ),
    };
  }

  return { user, companyId };
}

export async function GET(request, { params }) {
  await connection();

  try {
    const { employeeId } = await params;
    const access = await authorizeEmployee(request, employeeId);

    if (access.error) return access.error;

    const result = await pool.query(
      `SELECT id, company_id, employee_code, name, department,
              designation, email, phone, status, created_at, updated_at
       FROM employees
       WHERE id = $1 AND company_id = $2
       LIMIT 1`,
      [employeeId, access.companyId]
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { success: false, message: "Employee not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Get employee failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve employee." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Forbidden request origin." },
      { status: 403 }
    );
  }

  await connection();

  try {
    const { employeeId } = await params;
    const access = await authorizeEmployee(request, employeeId, [
      "company_admin",
      "hr_manager",
    ]);

    if (access.error) return access.error;

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const validationError = validateEmployee(body);

    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    const [
      employeeCode,
      name,
      department,
      designation,
      email,
      phone,
      status,
    ] = employeeValues(body);

    const result = await pool.query(
      `UPDATE employees
       SET employee_code = $1,
           name = $2,
           department = $3,
           designation = $4,
           email = $5,
           phone = $6,
           status = $7,
           updated_at = NOW()
       WHERE id = $8 AND company_id = $9
       RETURNING id, company_id, employee_code, name, department,
                 designation, email, phone, status, created_at, updated_at`,
      [
        employeeCode,
        name,
        department,
        designation,
        email,
        phone,
        status,
        employeeId,
        access.companyId,
      ]
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { success: false, message: "Employee not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully.",
      employee: result.rows[0],
    });
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

    console.error("Update employee failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update employee." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Forbidden request origin." },
      { status: 403 }
    );
  }

  await connection();

  try {
    const { employeeId } = await params;
    const access = await authorizeEmployee(request, employeeId, [
      "company_admin",
    ]);

    if (access.error) return access.error;

    const result = await pool.query(
      `DELETE FROM employees
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [employeeId, access.companyId]
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { success: false, message: "Employee not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully.",
      employeeId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Delete employee failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to delete employee." },
      { status: 500 }
    );
  }
}
