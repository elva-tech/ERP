import { connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, ok, parseId, serverError } from "@/lib/api";
import { DOCUMENT_CATEGORIES, DOCUMENT_SELECT, documentAccess, logDocumentEvent } from "@/lib/documents";
import { MAX_DOCUMENT_BYTES, detectType, discardDocument, storeDocument } from "@/lib/document-storage";

/**
 * GET /api/employees/[employeeId]/documents?companyId=X (managers or the employee)
 */
export async function GET(request, { params }) {
  await connection();
  try {
    const employeeId = parseId((await params).employeeId);
    if (!employeeId) return fail(400, "A valid employeeId is required.");
    const access = await documentAccess(request, employeeId);
    if (access.error) return access.error;
    const result = await pool.query(
      `${DOCUMENT_SELECT}
       WHERE d.employee_id = $1 AND d.company_id = $2 AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC`,
      [employeeId, access.companyId]
    );
    return ok({ count: result.rowCount, maxBytes: MAX_DOCUMENT_BYTES, documents: result.rows });
  } catch (error) {
    return serverError("List documents failed", error, "Unable to retrieve documents.");
  }
}

/**
 * POST /api/employees/[employeeId]/documents?companyId=X (managers or the employee)
 * multipart/form-data: file, category, title. Only PDF, PNG and JPEG files
 * (detected from content) up to MAX_DOCUMENT_BYTES; photos must be images.
 * New documents start as Pending verification.
 */
export async function POST(request, { params }) {
  await connection();
  try {
    const employeeId = parseId((await params).employeeId);
    if (!employeeId) return fail(400, "A valid employeeId is required.");

    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_DOCUMENT_BYTES + 64 * 1024) {
      return fail(413, `Files must be at most ${Math.floor(MAX_DOCUMENT_BYTES / 1024 / 1024)} MB.`);
    }

    const access = await documentAccess(request, employeeId, { mutation: true });
    if (access.error) return access.error;

    let form;
    try {
      form = await request.formData();
    } catch {
      return fail(400, "Upload must be multipart form data.");
    }
    const file = form.get("file");
    const category = String(form.get("category") || "");
    const title = String(form.get("title") || "").trim();
    if (!file || typeof file === "string") return fail(400, "Choose a file to upload.");
    if (!DOCUMENT_CATEGORIES.includes(category)) return fail(400, "Choose a valid document category.");
    if (title.length < 2 || title.length > 200) return fail(400, "Title must be 2-200 characters.");
    if (file.size === 0) return fail(400, "The file is empty.");
    if (file.size > MAX_DOCUMENT_BYTES) {
      return fail(413, `Files must be at most ${Math.floor(MAX_DOCUMENT_BYTES / 1024 / 1024)} MB.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const type = detectType(buffer);
    if (!type) return fail(415, "Only PDF, PNG and JPEG files are accepted.");
    if (category === "Photo" && type.mime === "application/pdf") {
      return fail(415, "A profile photo must be a PNG or JPEG image.");
    }

    const stored = await storeDocument(access.companyId, buffer, type);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO employee_documents
           (company_id, employee_id, category, title, original_filename, mime_type, size_bytes, sha256, storage_key, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          access.companyId,
          employeeId,
          category,
          title,
          String(file.name || "document").slice(0, 255),
          type.mime,
          buffer.length,
          stored.sha256,
          stored.key,
          access.user.id,
        ]
      );
      const documentId = inserted.rows[0].id;
      await logDocumentEvent(client, {
        companyId: access.companyId,
        documentId,
        employeeId,
        action: "upload",
        userId: access.user.id,
        request,
      });
      await client.query("COMMIT");
      const row = await pool.query(`${DOCUMENT_SELECT} WHERE d.id = $1`, [documentId]);
      return ok({ message: "Document uploaded.", document: row.rows[0] }, 201);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      await discardDocument(stored.key);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return serverError("Upload document failed", error, "Unable to upload document.");
  }
}
