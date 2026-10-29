import { pool } from "@/lib/db";
import { fail, isManager, isOwnRecord, requireCompanyAccess } from "@/lib/api";

export const DOCUMENT_CATEGORIES = ["Identity", "Address Proof", "Education", "Employment", "Payroll", "Photo", "Other"];

export const DOCUMENT_SELECT = `
  SELECT d.id, d.employee_id, d.category, d.title, d.original_filename, d.mime_type, d.size_bytes,
         d.verification_status, d.verification_note, d.verified_at, v.full_name AS verified_by_name,
         d.created_at, u.full_name AS uploaded_by_name
  FROM employee_documents d
  JOIN users u ON u.id = d.uploaded_by
  LEFT JOIN users v ON v.id = d.verified_by`;

/**
 * Access to an employee's documents: managers, or the employee for their own
 * record. Anyone else gets 404 so document existence is not revealed.
 */
export async function documentAccess(request, employeeId, { mutation = false } = {}) {
  const access = await requireCompanyAccess(request, { mutation });
  if (access.error) return access;
  const employee = await pool.query("SELECT id FROM employees WHERE id = $1 AND company_id = $2", [
    employeeId,
    access.companyId,
  ]);
  if (!employee.rowCount) return { error: fail(404, "Employee not found.") };
  const manager = isManager(access.membership);
  const own = await isOwnRecord(access.companyId, access.user, employeeId);
  if (!manager && !own) return { error: fail(404, "Employee not found.") };
  return { ...access, manager, own };
}

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "").trim().slice(0, 64) || null;
}

export async function logDocumentEvent(db, { companyId, documentId, employeeId, action, userId, request }) {
  await db.query(
    `INSERT INTO employee_document_events (company_id, document_id, employee_id, action, actor_user_id, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [companyId, documentId, employeeId, action, userId, clientIp(request)]
  );
}
