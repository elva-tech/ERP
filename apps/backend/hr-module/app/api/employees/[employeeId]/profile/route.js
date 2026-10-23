import { connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, isManager, isOwnRecord, ok, parseId, requireCompanyAccess, serverError } from "@/lib/api";
import { EMPLOYEE_COLUMNS, PUBLIC_EMPLOYEE_COLUMNS } from "@/lib/employees";
import { SECTIONS, sectionSelectList } from "@/lib/profile-sections";

/**
 * GET /api/employees/[employeeId]/profile?companyId=X
 * Profile header and personal/employment sections. Managers and the employee
 * get the full profile (bank numbers masked except for managers); other
 * members only get the directory fields. Attendance, leave, salary and
 * documents are loaded from their own endpoints.
 */
export async function GET(request, { params }) {
  await connection();
  try {
    const employeeId = parseId((await params).employeeId);
    if (!employeeId) return fail(400, "A valid employeeId is required.");
    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const manager = isManager(access.membership);
    const self = !manager && (await isOwnRecord(access.companyId, access.user, employeeId));
    const full = manager || self;

    const employee = await pool.query(
      `SELECT ${full ? EMPLOYEE_COLUMNS : PUBLIC_EMPLOYEE_COLUMNS} FROM employees WHERE id = $1 AND company_id = $2`,
      [employeeId, access.companyId]
    );
    if (!employee.rowCount) return fail(404, "Employee not found.");
    const profile = { access: manager ? "manager" : self ? "self" : "directory", employee: employee.rows[0] };
    if (!full) return ok(profile);

    const query = (sql, values = [employeeId, access.companyId]) => pool.query(sql, values).then((r) => r.rows);
    const sectionRows = (name) =>
      query(
        `SELECT ${sectionSelectList(SECTIONS[name], { unmasked: manager })} FROM ${SECTIONS[name].table}
         WHERE employee_id = $1 AND company_id = $2 ORDER BY ${SECTIONS[name].orderBy}`
      );

    const [manager_, reports, addresses, contacts, bankAccounts, history, photo, login] = await Promise.all([
      query(
        `SELECT m.id, m.name, m.employee_code, m.designation, m.department
         FROM employees e JOIN employees m ON m.id = e.reporting_manager_id AND m.company_id = e.company_id
         WHERE e.id = $1 AND e.company_id = $2`
      ),
      query(
        `SELECT id, name, employee_code, designation, department, status FROM employees
         WHERE reporting_manager_id = $1 AND company_id = $2 ORDER BY name`
      ),
      sectionRows("addresses"),
      sectionRows("contacts"),
      sectionRows("bankAccounts"),
      sectionRows("history"),
      query(
        `SELECT id FROM employee_documents
         WHERE employee_id = $1 AND company_id = $2 AND category = 'Photo' AND deleted_at IS NULL
           AND verification_status <> 'Rejected'
         ORDER BY created_at DESC LIMIT 1`
      ),
      manager
        ? query(
            `SELECT u.email, cm.role FROM employees e
             JOIN users u ON u.id = e.user_id
             LEFT JOIN company_memberships cm ON cm.company_id = e.company_id AND cm.user_id = e.user_id AND cm.status = 'active'
             WHERE e.id = $1 AND e.company_id = $2`
          )
        : Promise.resolve([]),
    ]);

    return ok({
      ...profile,
      reportingManager: manager_[0] ?? null,
      directReports: reports,
      addresses,
      contacts,
      bankAccounts,
      history,
      photoDocumentId: photo[0] ? String(photo[0].id) : null,
      login: login[0] ?? null,
    });
  } catch (error) {
    return serverError("Get employee profile failed", error, "Unable to retrieve employee profile.");
  }
}
