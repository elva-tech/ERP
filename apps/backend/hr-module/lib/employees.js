import { pool } from "@/lib/db";
import { isValidDate, parseId } from "@/lib/api";
import { TIMEZONE } from "@/lib/attendance";

export const EMPLOYEE_COLUMNS = `id, company_id, employee_code, name, department,
  designation, email, phone, status, user_id, created_at, updated_at,
  to_char(date_of_joining, 'YYYY-MM-DD') AS date_of_joining,
  to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
  gender, employment_type, work_location, reporting_manager_id`;

export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Consultant"];

/** Directory fields an ordinary employee may see about colleagues (no contact details or login link). */
export const PUBLIC_EMPLOYEE_COLUMNS = `id, company_id, employee_code, name, department,
  designation, status`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Next sequential employee code for a company: one more than the highest all-digit code,
 * zero-padded to at least three digits (001, 002, ...). Codes with letters are left alone.
 * Must run inside a transaction: the per-company advisory lock is held until commit,
 * so concurrent creations cannot draw the same number.
 */
export async function nextEmployeeCode(client, companyId) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended('employee_code:' || $1::text, 0))", [companyId]);
  const result = await client.query(
    `SELECT (COALESCE(MAX(employee_code::numeric), 0) + 1)::text AS next
     FROM employees WHERE company_id = $1 AND employee_code ~ '^[0-9]{1,18}$'`,
    [companyId]
  );
  return result.rows[0].next.padStart(3, "0");
}

const FIELD_RULES = {
  employeeCode: { min: 1, max: 30, label: "Employee code" },
  name: { min: 2, max: 200, label: "Name" },
  department: { min: 1, max: 150, label: "Department" },
  designation: { min: 1, max: 150, label: "Designation" },
};

/**
 * Validates employee input. With `partial`, only provided fields are checked.
 * Returns { values } with normalised fields, or { message } on failure.
 */
export function validateEmployeeInput(body, { partial = false } = {}) {
  const values = {};

  for (const [field, rule] of Object.entries(FIELD_RULES)) {
    if (body[field] === undefined && partial) continue;
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (value.length < rule.min || value.length > rule.max) {
      return { message: `${rule.label} must be ${rule.min}-${rule.max} characters.` };
    }
    values[field] = value;
  }

  if (body.email !== undefined || !partial) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(email) || email.length > 255) {
      return { message: "Enter a valid email address." };
    }
    values.email = email;
  }

  if (body.phone !== undefined) {
    if (body.phone !== null && typeof body.phone !== "string") {
      return { message: "Phone must be text." };
    }
    const phone = (body.phone || "").trim();
    if (phone.length > 30 || (phone && !/^[0-9+()\-\s]{6,30}$/.test(phone))) {
      return { message: "Enter a valid phone number." };
    }
    values.phone = phone || null;
  }

  if (body.status !== undefined) {
    if (!["Active", "Inactive"].includes(body.status)) {
      return { message: "Status must be Active or Inactive." };
    }
    values.status = body.status;
  } else if (!partial) {
    values.status = "Active";
  }

  if (body.userId !== undefined) {
    if (body.userId === null || body.userId === "") {
      values.userId = null;
    } else {
      const userId = parseId(body.userId);
      if (!userId) return { message: "Linked login is invalid." };
      values.userId = userId;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const [field, label] of [
    ["dateOfJoining", "Date of joining"],
    ["dateOfBirth", "Date of birth"],
  ]) {
    if (body[field] === undefined) continue;
    if (body[field] === null || body[field] === "") {
      values[field] = null;
      continue;
    }
    if (!isValidDate(body[field]) || body[field] < "1900-01-01") return { message: `${label} must be a valid date.` };
    values[field] = body[field];
  }
  if (values.dateOfBirth && values.dateOfBirth >= today) {
    return { message: "Date of birth must be in the past." };
  }
  if (values.dateOfBirth && values.dateOfJoining && values.dateOfJoining <= values.dateOfBirth) {
    return { message: "Date of joining must be after the date of birth." };
  }

  for (const [field, allowed, label] of [
    ["gender", GENDERS, "Gender"],
    ["employmentType", EMPLOYMENT_TYPES, "Employment type"],
  ]) {
    if (body[field] === undefined) continue;
    if (body[field] === null || body[field] === "") values[field] = null;
    else if (allowed.includes(body[field])) values[field] = body[field];
    else return { message: `${label} must be one of: ${allowed.join(", ")}.` };
  }

  if (body.workLocation !== undefined) {
    if (body.workLocation !== null && typeof body.workLocation !== "string") {
      return { message: "Work location must be text." };
    }
    const location = (body.workLocation || "").trim();
    if (location.length > 200) return { message: "Work location must be at most 200 characters." };
    values.workLocation = location || null;
  }

  if (body.reportingManagerId !== undefined) {
    if (body.reportingManagerId === null || body.reportingManagerId === "") {
      values.reportingManagerId = null;
    } else {
      const managerId = parseId(body.reportingManagerId);
      if (!managerId) return { message: "Reporting manager is invalid." };
      values.reportingManagerId = managerId;
    }
  }

  return { values };
}

/**
 * Writes system employment-history rows for department/designation and
 * status changes. A designation change is recorded as "Role Change" (the
 * system cannot tell a promotion from other changes; HR can add a manual
 * entry); a department-only change as "Transfer".
 */
export async function recordEmploymentChanges(db, { companyId, employeeId, before, after, userId }) {
  const sameText = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();
  const events = [];
  const departmentChanged = !sameText(before.department, after.department);
  const designationChanged = !sameText(before.designation, after.designation);
  if (departmentChanged || designationChanged) {
    events.push({
      type: designationChanged ? "Role Change" : "Transfer",
      previousStatus: null,
      newStatus: null,
    });
  }
  if (before.status !== after.status) {
    events.push({ type: "Status Change", previousStatus: before.status, newStatus: after.status });
  }
  for (const event of events) {
    await db.query(
      `INSERT INTO employee_employment_history
         (company_id, employee_id, event_type, effective_date, department, designation,
          previous_department, previous_designation, previous_status, new_status, source, recorded_by)
       VALUES ($1, $2, $3, (NOW() AT TIME ZONE $4::text)::date, $5, $6, $7, $8, $9, $10, 'system', $11)`,
      [
        companyId,
        employeeId,
        event.type,
        TIMEZONE,
        after.department,
        after.designation,
        before.department,
        before.designation,
        event.previousStatus,
        event.newStatus,
        userId,
      ]
    );
  }
}

/**
 * The reporting manager must be another employee of the same company and
 * must not report (directly or indirectly) to this employee.
 */
export async function checkReportingManager(companyId, employeeId, managerId, db = pool) {
  if (managerId == null) return null;
  if (employeeId && String(employeeId) === String(managerId)) {
    return "An employee cannot be their own reporting manager.";
  }
  const manager = await db.query("SELECT 1 FROM employees WHERE id = $1 AND company_id = $2", [managerId, companyId]);
  if (!manager.rowCount) return "The selected reporting manager does not exist in this company.";
  if (!employeeId) return null;
  const chain = await db.query(
    `WITH RECURSIVE chain(id, depth) AS (
       SELECT reporting_manager_id, 1 FROM employees WHERE id = $1 AND company_id = $2
       UNION ALL
       SELECT e.reporting_manager_id, c.depth + 1 FROM employees e JOIN chain c ON e.id = c.id
       WHERE c.id IS NOT NULL AND c.depth < 100
     )
     SELECT 1 FROM chain WHERE id = $3 LIMIT 1`,
    [managerId, companyId, employeeId]
  );
  return chain.rowCount ? "This reporting line would create a cycle." : null;
}

export function duplicateEmployeeMessage(error) {
  if (error?.constraint === "employees_company_id_user_id_key") {
    return "This login is already linked to another employee in this company.";
  }
  return "Employee code or email already exists in this company.";
}

/**
 * A login may only be linked to an employee record when the user has an
 * active membership in the same company. Returns an error message or null.
 */
export async function checkUserLink(companyId, userId) {
  if (userId == null) return null;
  const result = await pool.query(
    `SELECT 1 FROM company_memberships
     WHERE company_id = $1 AND user_id = $2 AND status = 'active'
     LIMIT 1`,
    [companyId, userId]
  );
  return result.rowCount ? null : "The selected login is not an active member of this company.";
}

/**
 * Ensures the department/designation names refer to records of the same
 * company. New assignments must point to Active records.
 */
export async function checkOrgReferences(companyId, values, current = null) {
  const checks = [
    ["department", "departments", "department_name", "Department"],
    ["designation", "designations", "designation_name", "Designation"],
  ];

  for (const [field, table, column, label] of checks) {
    if (values[field] === undefined) continue;

    const result = await pool.query(
      `SELECT ${column} AS name, status FROM ${table}
       WHERE company_id = $1 AND LOWER(${column}) = LOWER($2)
       LIMIT 1`,
      [companyId, values[field]]
    );
    const row = result.rows[0];

    if (!row) {
      return `${label} "${values[field]}" does not exist in this company.`;
    }

    const unchanged =
      current && String(current[field]).toLowerCase() === row.name.toLowerCase();
    if (row.status !== "Active" && !unchanged) {
      return `${label} "${row.name}" is inactive.`;
    }

    values[field] = row.name;
  }

  return null;
}
