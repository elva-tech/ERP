
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  MANAGER_ROLES,
  fail,
  isManager,
  ok,
  readJsonObject,
  requireCompanyAccess,
  serverError,
} from "@/lib/api";
import {
  EMPLOYEE_COLUMNS,
  PUBLIC_EMPLOYEE_COLUMNS,
  checkOrgReferences,
  checkReportingManager,
  checkUserLink,
  duplicateEmployeeMessage,
  validateEmployeeInput,
} from "@/lib/employees";

export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const status = new URL(request.url).searchParams.get("status");
    const values = [access.companyId];
    let filter = "";
    if (status === "Active" || status === "Inactive") {
      values.push(status);
      filter = " AND status = $2";
    }

    const columns = isManager(access.membership) ? EMPLOYEE_COLUMNS : PUBLIC_EMPLOYEE_COLUMNS;
    const result = await pool.query(
      `SELECT ${columns}
       FROM employees
       WHERE company_id = $1${filter}
       ORDER BY name ASC`,
      values
    );

    return ok({ count: result.rowCount, employees: result.rows });
  } catch (error) {
    return serverError("List employees failed", error, "Unable to retrieve employees.");
  }
}

export async function POST(request) {
  await connection();

  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;

    const access = await requireCompanyAccess(request, {
      roles: MANAGER_ROLES,
      companyId: parsed.body.companyId ?? "",
      mutation: true,
    });
    if (access.error) return access.error;

    const { values, message } = validateEmployeeInput(parsed.body);
    if (message) return fail(400, message);

    const referenceError = await checkOrgReferences(access.companyId, values);
    if (referenceError) return fail(400, referenceError);

    const linkError = await checkUserLink(access.companyId, values.userId ?? null);
    if (linkError) return fail(400, linkError);

    const managerError = await checkReportingManager(access.companyId, null, values.reportingManagerId ?? null);
    if (managerError) return fail(400, managerError);

    const result = await pool.query(
      `INSERT INTO employees
         (company_id, employee_code, name, department, designation, email, phone, status, user_id,
          date_of_joining, date_of_birth, gender, employment_type, work_location, reporting_manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING ${EMPLOYEE_COLUMNS}`,
      [
        access.companyId,
        values.employeeCode,
        values.name,
        values.department,
        values.designation,
        values.email,
        values.phone ?? null,
        values.status,
        values.userId ?? null,
        values.dateOfJoining ?? null,
        values.dateOfBirth ?? null,
        values.gender ?? null,
        values.employmentType ?? null,
        values.workLocation ?? null,
        values.reportingManagerId ?? null,
      ]
    );

    return ok(
      { message: "Employee created successfully.", employee: result.rows[0] },
      201
    );
  } catch (error) {
    if (error.code === "23505") {
      return fail(409, duplicateEmployeeMessage(error));
    }
    return serverError("Create employee failed", error, "Unable to create employee.");
  }
}
