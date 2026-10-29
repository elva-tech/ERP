import { NextResponse, connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, ok, parseId, readJsonObject, serverError, trimmed } from "@/lib/api";
import { DOCUMENT_SELECT, documentAccess, logDocumentEvent } from "@/lib/documents";
import { readDocument, safeFilename } from "@/lib/document-storage";

async function ids(params) {
  const { employeeId, documentId } = await params;
  return { employeeId: parseId(employeeId), documentId: parseId(documentId) };
}

/**
 * GET /api/employees/[employeeId]/documents/[documentId]?companyId=X[&download=1]
 * Streams the file to managers or the employee (inline unless download=1).
 * Every access is written to employee_document_events.
 */
export async function GET(request, { params }) {
  await connection();
  try {
    const { employeeId, documentId } = await ids(params);
    if (!employeeId || !documentId) return fail(400, "A valid employeeId and documentId are required.");
    const access = await documentAccess(request, employeeId);
    if (access.error) return access.error;

    const result = await pool.query(
      `SELECT id, original_filename, mime_type, storage_key FROM employee_documents
       WHERE id = $1 AND employee_id = $2 AND company_id = $3 AND deleted_at IS NULL`,
      [documentId, employeeId, access.companyId]
    );
    const doc = result.rows[0];
    if (!doc) return fail(404, "Document not found.");

    const download = new URL(request.url).searchParams.get("download") === "1";
    const body = await readDocument(doc.storage_key);
    await logDocumentEvent(pool, {
      companyId: access.companyId,
      documentId,
      employeeId,
      action: download ? "download" : "view",
      userId: access.user.id,
      request,
    });

    const filename = safeFilename(doc.original_filename);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": doc.mime_type,
        "Content-Length": String(body.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      },
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return serverError("Read document failed", error, "The stored file is missing. Ask HR to upload it again.");
    }
    return serverError("Read document failed", error, "Unable to open document.");
  }
}

/**
 * PATCH .../documents/[documentId] { action: verify | reject, note? }
 * Managers only, and never for their own documents.
 */
export async function PATCH(request, { params }) {
  await connection();
  let client;
  try {
    const { employeeId, documentId } = await ids(params);
    if (!employeeId || !documentId) return fail(400, "A valid employeeId and documentId are required.");
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const access = await documentAccess(request, employeeId, { mutation: true });
    if (access.error) return access.error;
    if (!access.manager) return fail(403, "Only company admins or HR managers can verify documents.");
    if (access.own) return fail(403, "You cannot verify or reject your own documents.");

    const action = trimmed(parsed.body.action);
    const note = trimmed(parsed.body.note) || null;
    if (!["verify", "reject"].includes(action)) return fail(400, "action must be 'verify' or 'reject'.");
    if (action === "reject" && !note) return fail(400, "Enter the reason for rejecting the document.");
    if (note && note.length > 2000) return fail(400, "Note is too long.");

    client = await pool.connect();
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE employee_documents
       SET verification_status = $1, verification_note = $2, verified_by = $3, verified_at = NOW(), updated_at = NOW()
       WHERE id = $4 AND employee_id = $5 AND company_id = $6 AND deleted_at IS NULL
       RETURNING id`,
      [action === "verify" ? "Verified" : "Rejected", note, access.user.id, documentId, employeeId, access.companyId]
    );
    if (!updated.rowCount) {
      await client.query("ROLLBACK");
      return fail(404, "Document not found.");
    }
    await logDocumentEvent(client, {
      companyId: access.companyId,
      documentId,
      employeeId,
      action,
      userId: access.user.id,
      request,
    });
    await client.query("COMMIT");
    const row = await pool.query(`${DOCUMENT_SELECT} WHERE d.id = $1`, [documentId]);
    return ok({ message: action === "verify" ? "Document verified." : "Document rejected.", document: row.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Verify document failed", error, "Unable to update document.");
  } finally {
    client?.release();
  }
}

/**
 * DELETE .../documents/[documentId]?companyId=X (managers)
 * Soft delete: the document is hidden but the row, file and audit trail are
 * kept for retention review.
 */
export async function DELETE(request, { params }) {
  await connection();
  let client;
  try {
    const { employeeId, documentId } = await ids(params);
    if (!employeeId || !documentId) return fail(400, "A valid employeeId and documentId are required.");
    const access = await documentAccess(request, employeeId, { mutation: true });
    if (access.error) return access.error;
    if (!access.manager) return fail(403, "Only company admins or HR managers can delete documents.");

    client = await pool.connect();
    await client.query("BEGIN");
    const deleted = await client.query(
      `UPDATE employee_documents SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
       WHERE id = $2 AND employee_id = $3 AND company_id = $4 AND deleted_at IS NULL
       RETURNING id`,
      [access.user.id, documentId, employeeId, access.companyId]
    );
    if (!deleted.rowCount) {
      await client.query("ROLLBACK");
      return fail(404, "Document not found.");
    }
    await logDocumentEvent(client, {
      companyId: access.companyId,
      documentId,
      employeeId,
      action: "delete",
      userId: access.user.id,
      request,
    });
    await client.query("COMMIT");
    return ok({ message: "Document removed." });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Delete document failed", error, "Unable to delete document.");
  } finally {
    client?.release();
  }
}
