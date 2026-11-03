
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  ADMIN_ROLES,
  MANAGER_ROLES,
  fail,
  isManager,
  isOwnRecord,
  ok,
  parseId,
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
  recordEmploymentChanges,
  validateEmployeeInput,
} from "@/lib/employees";
import { changeMembership, lockCompanyAccess } from "@/lib/access";

const COLUMN_MAP = {
  employeeCode: "employee_code",
  name: "name",
  department: "department",
  designation: "designation",
  email: "email",
  phone: "phone",
  status: "status",
  userId: "user_id",
  dateOfJoining: "date_of_joining",
  dateOfBirth: "date_of_birth",
  gender: "gender",
  employmentType: "employment_type",
  workLocation: "work_location",
  reportingManagerId: "reporting_manager_id",
};

async function loadEmployee(employeeId, companyId, columns = EMPLOYEE_COLUMNS) {
  const result = await pool.query(
    `SELECT ${columns} FROM employees
     WHERE id = $1 AND company_id = $2
     LIMIT 1`,
    [employeeId, companyId]
  );
  return result.rows[0] ?? null;
}

export async function GET(request, { params }) {
  await connection();

  try {
    const employeeId = parseId((await params).employeeId);
    if (!employeeId) return fail(400, "A valid employeeId is required.");

    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const fullAccess =
      isManager(access.membership) ||
      (await isOwnRecord(access.companyId, access.user, employeeId));
    const employee = await loadEmployee(
      employeeId,
      access.companyId,
      fullAccess ? EMPLOYEE_COLUMNS : PUBLIC_EMPLOYEE_COLUMNS
    );
    if (!employee) return fail(404, "Employee not found.");

    return ok({ employee });
  } catch (error) {
    return serverError("Get employee failed", error, "Unable to retrieve employee.");
  }
}

/**
 * PATCH /api/employees/[employeeId] (managers)
 * Department, designation and status changes are recorded in the employee's
 * employment history (source "system") in the same transaction.
 */
export async function PATCH(request, { params }) {
  await connection();

  let client;
  try {
    const employeeId = parseId((await params).employeeId);
    if (!employeeId) return fail(400, "A valid employeeId is required.");

    const access = await requireCompanyAccess(request, {
      roles: MANAGER_ROLES,
      mutation: true,
    });
    if (access.error) return access.error;

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;

    const { values, message } = validateEmployeeInput(parsed.body, { partial: true });
    if (message) return fail(400, message);

    const fields = Object.keys(values).filter((key) => COLUMN_MAP[key]);
    if (fields.length === 0) return fail(400, "No valid fields provided for update.");

    const current = await loadEmployee(employeeId, access.companyId);
    if (!current) return fail(404, "Employee not found.");

    const birth = values.dateOfBirth !== undefined ? values.dateOfBirth : current.date_of_birth;
    const joining = values.dateOfJoining !== undefined ? values.dateOfJoining : current.date_of_joining;
    if (birth && joining && joining <= birth) {
      return fail(400, "Date of joining must be after the date of birth.");
    }

    const referenceError = await checkOrgReferences(access.companyId, values, current);
    if (referenceError) return fail(400, referenceError);

    if (values.userId !== undefined) {
      const linkError = await checkUserLink(access.companyId, values.userId);
      if (linkError) return fail(400, linkError);
    }

    const linkedUserId = values.userId !== undefined ? values.userId : current.user_id;
    const deactivating = values.status === "Inactive" && current.status !== "Inactive";
    if (deactivating && linkedUserId && String(linkedUserId) === String(access.user.id)) {
      return fail(403, "You cannot deactivate your own employee record.");
    }

    client = await pool.connect();
    await client.query("BEGIN");

    let accessSuspended = false;
    if (deactivating && linkedUserId) {
      // Deactivation suspends the linked login's access to this company only.
      await lockCompanyAccess(client, access.companyId);
      const change = await changeMembership(client, {
        companyId: access.companyId,
        actorUserId: access.user.id,
        targetUserId: linkedUserId,
        status: "suspended",
        note: "Employee record deactivated",
      });
      if (change.error) {
        await client.query("ROLLBACK");
        return fail(...change.error);
      }
      accessSuspended = change.membership.changed;
    }

    if (values.reportingManagerId !== undefined) {
      // Serialise reporting-line changes so concurrent edits cannot form a cycle.
      await client.query("SELECT pg_advisory_xact_lock(hashtext('employee_reporting_lines'), $1::int)", [
        Number(access.companyId) % 2147483647,
      ]);
      const managerError = await checkReportingManager(access.companyId, employeeId, values.reportingManagerId, client);
      if (managerError) {
        await client.query("ROLLBACK");
        return fail(400, managerError);
      }
    }

    const assignments = fields.map((key, index) => `${COLUMN_MAP[key]} = $${index + 1}`);
    const result = await client.query(
      `UPDATE employees
       SET ${assignments.join(", ")}, updated_at = NOW()
       WHERE id = $${fields.length + 1} AND company_id = $${fields.length + 2}
       RETURNING ${EMPLOYEE_COLUMNS}`,
      [...fields.map((key) => values[key]), employeeId, access.companyId]
    );

    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return fail(404, "Employee not found.");
    }
    await recordEmploymentChanges(client, {
      companyId: access.companyId,
      employeeId,
      before: current,
      after: result.rows[0],
      userId: access.user.id,
    });
    await client.query("COMMIT");

    return ok({
      message: accessSuspended
        ? "Employee deactivated. Their access to this company has been suspended."
        : "Employee updated successfully.",
      employee: result.rows[0],
      accessSuspended,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") {
      return fail(409, duplicateEmployeeMessage(error));
    }
    return serverError("Update employee failed", error, "Unable to update employee.");
  } finally {
    client?.release();
  }
}

export async function DELETE(request, { params }) {
  await connection();

  try {
    const employeeId = parseId((await params).employeeId);
    if (!employeeId) return fail(400, "A valid employeeId is required.");

    const access = await requireCompanyAccess(request, {
      roles: ADMIN_ROLES,
      mutation: true,
    });
    if (access.error) return access.error;

    const result = await pool.query(
      `DELETE FROM employees
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [employeeId, access.companyId]
    );

    if (!result.rowCount) return fail(404, "Employee not found.");

    return ok({ message: "Employee deleted successfully.", employeeId: result.rows[0].id });
  } catch (error) {
    if (error.code === "23503") {
      return fail(
        409,
        "This employee has attendance, leave, payroll, document or reporting-line records. Deactivate the employee instead of deleting."
      );
    }
    return serverError("Delete employee failed", error, "Unable to delete employee.");
  }
}
