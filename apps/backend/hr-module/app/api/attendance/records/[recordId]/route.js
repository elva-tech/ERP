import { connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, ok, parseId, readJsonObject, requireCompanyAccess, serverError, trimmed } from "@/lib/api";
import { readAttendance } from "@/lib/attendance";
import { canReview, logApproval, reviewAuthority } from "@/lib/approvals";

/**
 * PATCH /api/attendance/records/[recordId]
 * { action: approve | reject, reviewNote? }
 * Managers may review any overtime day, including their own employee record.
 * Only a day with overtime minutes and status Pending (or not yet reviewed) can be decided.
 * The decision is stored on the attendance row and written to approval_audit_log.
 */
export async function PATCH(request, { params }) {
  await connection();

  let client;
  try {
    const id = parseId((await params).recordId);
    if (!id) return fail(400, "A valid recordId is required.");

    const access = await requireCompanyAccess(request, { mutation: true });
    if (access.error) return access.error;
    if (!(await canReview(access))) {
      return fail(403, "Only company admins, HR managers or an approval delegate can review overtime.");
    }

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const action = trimmed(parsed.body.action);
    const reviewNote = trimmed(parsed.body.reviewNote) || null;
    if (!["approve", "reject"].includes(action)) return fail(400, "action must be 'approve' or 'reject'.");
    if (reviewNote && reviewNote.length > 2000) return fail(400, "Review note is too long.");

    client = await pool.connect();
    await client.query("BEGIN");

    const current = await client.query(
      `SELECT id, employee_id, overtime_minutes, overtime_status
       FROM attendance_records
       WHERE id = $1 AND company_id = $2
       FOR UPDATE`,
      [id, access.companyId]
    );
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return fail(404, "Attendance record not found.");
    }
    if (!row.overtime_minutes || row.overtime_minutes <= 0) {
      await client.query("ROLLBACK");
      return fail(409, "This day has no overtime to review.");
    }
    if (row.overtime_status && row.overtime_status !== "Pending") {
      await client.query("ROLLBACK");
      return fail(409, `Cannot ${action} overtime with status '${row.overtime_status}'.`);
    }

    const review = await reviewAuthority(
      {
        companyId: access.companyId,
        user: access.user,
        membership: access.membership,
        employeeId: row.employee_id,
        noun: "overtime record",
      },
      client
    );
    if (review.status) {
      await client.query("ROLLBACK");
      return fail(review.status, review.message);
    }

    const newStatus = action === "approve" ? "Approved" : "Rejected";
    await client.query(
      `UPDATE attendance_records
       SET overtime_status = $1, overtime_reviewed_by = $2, overtime_reviewed_at = NOW(),
           overtime_review_note = $3, updated_at = NOW()
       WHERE id = $4`,
      [newStatus, access.user.id, reviewNote, id]
    );
    await logApproval(client, {
      companyId: access.companyId,
      entityType: "overtime",
      entityId: id,
      employeeId: row.employee_id,
      action,
      actorUserId: access.user.id,
      authority: review.authority,
      note: reviewNote,
    });
    await client.query("COMMIT");

    return ok({ message: `Overtime ${newStatus.toLowerCase()}.`, status: newStatus, record: await readAttendance(id) });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Review overtime failed", error, "Unable to update the overtime decision.");
  } finally {
    client?.release();
  }
}
