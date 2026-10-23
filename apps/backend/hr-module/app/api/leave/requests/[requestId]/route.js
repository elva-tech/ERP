
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  fail,
  findOwnEmployee,
  isManager,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
  trimmed,
} from "@/lib/api";
import { LEAVE_REQUEST_SELECT, available, lockBalance } from "@/lib/leave";
import { canReview, logApproval, reviewAuthority } from "@/lib/approvals";

export async function GET(request, { params }) {
  await connection();

  try {
    const requestId = parseId((await params).requestId);
    if (!requestId) return fail(400, "A valid requestId is required.");

    const access = await requireCompanyAccess(request);
    if (access.error) return access.error;

    const result = await pool.query(
      `${LEAVE_REQUEST_SELECT} WHERE lr.id = $1 AND lr.company_id = $2`,
      [requestId, access.companyId]
    );
    const row = result.rows[0];
    if (!row) return fail(404, "Leave request not found.");

    if (!isManager(access.membership)) {
      const own = await findOwnEmployee(access.companyId, access.user);
      if (!own || String(own.id) !== String(row.employee_id)) {
        return fail(404, "Leave request not found.");
      }
    }

    return ok({ request: row });
  } catch (error) {
    return serverError("Get leave request failed", error, "Unable to retrieve leave request.");
  }
}

/**
 * PATCH /api/leave/requests/[requestId]  { action: approve | reject | cancel, reviewNote? }
 * - approve/reject: company_admin or hr_manager (or an approval delegate for
 *   requests raised by admins/HR managers), only while Pending, and never for
 *   the reviewer's own request. Decisions are written to approval_audit_log.
 * - cancel: managers, or the employee for their own request; Pending or
 *   Approved. Cancelling an approved request restores the balance.
 */
export async function PATCH(request, { params }) {
  await connection();

  let client;
  try {
    const requestId = parseId((await params).requestId);
    if (!requestId) return fail(400, "A valid requestId is required.");

    const access = await requireCompanyAccess(request, { mutation: true });
    if (access.error) return access.error;

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;

    const action = trimmed(parsed.body.action);
    const reviewNote = trimmed(parsed.body.reviewNote) || null;
    if (!["approve", "reject", "cancel"].includes(action)) {
      return fail(400, "action must be 'approve', 'reject', or 'cancel'.");
    }
    if (reviewNote && reviewNote.length > 2000) return fail(400, "Review note is too long.");

    const manager = isManager(access.membership);
    if (action !== "cancel" && !(await canReview(access))) {
      return fail(403, "Only company admins, HR managers or an approval delegate can approve or reject leave.");
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const current = await client.query(
      `SELECT lr.id, lr.employee_id, lr.leave_type_id, lr.status, lr.days::float8 AS days,
              to_char(lr.from_date, 'YYYY-MM-DD') AS from_date,
              lt.name AS leave_type_name, lt.is_paid, lt.days_per_year::float8 AS days_per_year
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.id = $1 AND lr.company_id = $2
       FOR UPDATE OF lr`,
      [requestId, access.companyId]
    );
    const leave = current.rows[0];
    if (!leave) {
      await client.query("ROLLBACK");
      return fail(404, "Leave request not found.");
    }

    const own = await findOwnEmployee(access.companyId, access.user, client);
    const isOwn = Boolean(own) && String(own.id) === String(leave.employee_id);
    let authority = isOwn ? "employee" : "manager";
    if (action === "cancel") {
      if (!manager && !isOwn) {
        await client.query("ROLLBACK");
        return fail(404, "Leave request not found.");
      }
    } else {
      const review = await reviewAuthority(
        { companyId: access.companyId, user: access.user, membership: access.membership, employeeId: leave.employee_id, noun: "leave request" },
        client
      );
      if (review.status) {
        await client.query("ROLLBACK");
        return fail(review.status, review.message);
      }
      authority = review.authority;
    }

    const allowedFrom = action === "cancel" ? ["Pending", "Approved"] : ["Pending"];
    if (!allowedFrom.includes(leave.status)) {
      await client.query("ROLLBACK");
      return fail(409, `Cannot ${action} a request with status '${leave.status}'.`);
    }

    const year = Number(leave.from_date.slice(0, 4));
    const leaveType = { id: leave.leave_type_id, days_per_year: leave.days_per_year };

    if (action === "approve" && leave.is_paid) {
      const balance = await lockBalance(client, {
        companyId: access.companyId,
        employeeId: leave.employee_id,
        leaveType,
        year,
      });
      if (leave.days > available(balance)) {
        await client.query("ROLLBACK");
        return fail(
          400,
          `Insufficient ${leave.leave_type_name} balance to approve: ${leave.days} day(s) requested, ${Math.max(available(balance), 0)} available.`
        );
      }
      await client.query(
        "UPDATE leave_balances SET used = used + $1, updated_at = NOW() WHERE id = $2",
        [leave.days, balance.id]
      );
    }

    if (action === "cancel" && leave.status === "Approved" && leave.is_paid) {
      await client.query(
        `UPDATE leave_balances SET used = GREATEST(used - $1, 0), updated_at = NOW()
         WHERE company_id = $2 AND employee_id = $3 AND leave_type_id = $4 AND year = $5`,
        [leave.days, access.companyId, leave.employee_id, leave.leave_type_id, year]
      );
    }

    const newStatus = { approve: "Approved", reject: "Rejected", cancel: "Cancelled" }[action];
    await client.query(
      `UPDATE leave_requests
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW()
       WHERE id = $4`,
      [newStatus, access.user.id, reviewNote, requestId]
    );
    if (action !== "cancel") {
      await logApproval(client, {
        companyId: access.companyId,
        entityType: "leave_request",
        entityId: requestId,
        employeeId: leave.employee_id,
        action,
        actorUserId: access.user.id,
        authority,
        note: reviewNote,
      });
    }

    await client.query("COMMIT");

    const updated = await pool.query(`${LEAVE_REQUEST_SELECT} WHERE lr.id = $1`, [requestId]);
    return ok({
      message: `Leave request ${newStatus.toLowerCase()} successfully.`,
      status: newStatus,
      request: updated.rows[0],
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Update leave request failed", error, "Unable to update leave request.");
  } finally {
    client?.release();
  }
}
