
import { connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, ok, parseId, readJsonObject, requireCompanyAccess, serverError, trimmed } from "@/lib/api";
import { TIMEZONE, upsertAttendance } from "@/lib/attendance";
import { canReview, logApproval, reviewAuthority } from "@/lib/approvals";

/**
 * PATCH /api/attendance/regularizations/[regularizationId]
 * { action: approve | reject, reviewNote? } — managers (or an approval
 * delegate for requests raised by admins/HR managers), Pending only, never
 * for the reviewer's own request. Decisions go to approval_audit_log.
 * Approval writes the requested times to the attendance record.
 */
export async function PATCH(request, { params }) {
  await connection();

  let client;
  try {
    const id = parseId((await params).regularizationId);
    if (!id) return fail(400, "A valid regularizationId is required.");

    const access = await requireCompanyAccess(request, { mutation: true });
    if (access.error) return access.error;
    if (!(await canReview(access))) {
      return fail(403, "Only company admins, HR managers or an approval delegate can review regularizations.");
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
      `SELECT id, employee_id, status, to_char(attendance_date, 'YYYY-MM-DD') AS attendance_date,
              to_char(requested_check_in AT TIME ZONE $3::text, 'HH24:MI') AS check_in,
              to_char(requested_check_out AT TIME ZONE $3::text, 'HH24:MI') AS check_out
       FROM attendance_regularizations
       WHERE id = $1 AND company_id = $2
       FOR UPDATE`,
      [id, access.companyId, TIMEZONE]
    );
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return fail(404, "Regularization request not found.");
    }
    if (row.status !== "Pending") {
      await client.query("ROLLBACK");
      return fail(409, `Cannot ${action} a request with status '${row.status}'.`);
    }
    const review = await reviewAuthority(
      { companyId: access.companyId, user: access.user, membership: access.membership, employeeId: row.employee_id, noun: "regularization request" },
      client
    );
    if (review.status) {
      await client.query("ROLLBACK");
      return fail(review.status, review.message);
    }

    if (action === "approve") {
      await upsertAttendance(client, {
        companyId: access.companyId,
        employeeId: row.employee_id,
        date: row.attendance_date,
        checkIn: row.check_in,
        checkOut: row.check_out,
        regularized: true,
      });
    }

    const newStatus = action === "approve" ? "Approved" : "Rejected";
    await client.query(
      `UPDATE attendance_regularizations
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW()
       WHERE id = $4`,
      [newStatus, access.user.id, reviewNote, id]
    );
    await logApproval(client, {
      companyId: access.companyId,
      entityType: "regularization",
      entityId: id,
      employeeId: row.employee_id,
      action,
      actorUserId: access.user.id,
      authority: review.authority,
      note: reviewNote,
    });
    await client.query("COMMIT");

    return ok({ message: `Regularization ${newStatus.toLowerCase()}.`, status: newStatus });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Review regularization failed", error, "Unable to update regularization request.");
  } finally {
    client?.release();
  }
}
