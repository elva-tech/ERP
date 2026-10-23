
import { connection } from "next/server";
import { pool } from "@/lib/db";
import { fail, isManager, ok, parseId, readJsonObject, requireCompanyAccess, serverError, trimmed } from "@/lib/api";
import { ADVANCE_SELECT } from "@/lib/payroll";
import { canReview, logApproval, reviewAuthority } from "@/lib/approvals";

/**
 * PATCH /api/payroll/advances/[advanceId] { action: approve | reject | close, emiAmount? }
 * approve: Pending -> Active (EMI required, from body or request).
 * reject: Pending -> Rejected. close: Active -> Closed (manual settlement).
 * approve/reject: managers, or an approval delegate for advances of admins/HR
 * managers; never the requester. close: managers only.
 */
export async function PATCH(request, { params }) {
  await connection();

  let client;
  try {
    const advanceId = parseId((await params).advanceId);
    if (!advanceId) return fail(400, "A valid advanceId is required.");

    const access = await requireCompanyAccess(request, { mutation: true });
    if (access.error) return access.error;

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const action = trimmed(parsed.body.action);
    if (!["approve", "reject", "close"].includes(action)) {
      return fail(400, "action must be 'approve', 'reject', or 'close'.");
    }
    const manager = isManager(access.membership);
    if (action === "close" ? !manager : !(await canReview(access))) {
      return fail(
        403,
        action === "close"
          ? "Only company admins or HR managers can close an advance."
          : "Only company admins, HR managers or an approval delegate can review an advance."
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const current = await client.query(
      `SELECT id, employee_id, status, amount::float8 AS amount, emi_amount::float8 AS emi_amount
       FROM employee_advances WHERE id = $1 AND company_id = $2 FOR UPDATE`,
      [advanceId, access.companyId]
    );
    const advance = current.rows[0];
    if (!advance) {
      await client.query("ROLLBACK");
      return fail(404, "Advance not found.");
    }

    const allowed = { approve: "Pending", reject: "Pending", close: "Active" }[action];
    if (advance.status !== allowed) {
      await client.query("ROLLBACK");
      return fail(409, `Cannot ${action} an advance with status '${advance.status}'.`);
    }

    let authority = "manager";
    if (action !== "close") {
      const review = await reviewAuthority(
        { companyId: access.companyId, user: access.user, membership: access.membership, employeeId: advance.employee_id, noun: "advance request" },
        client
      );
      if (review.status) {
        await client.query("ROLLBACK");
        return fail(review.status, review.message);
      }
      authority = review.authority;
    }

    if (action === "close") {
      const reserved = await client.query(
        `SELECT 1 FROM payroll_advance_recoveries
         WHERE advance_id = $1 AND status = 'Reserved' LIMIT 1`,
        [advanceId]
      );
      if (reserved.rowCount) {
        await client.query("ROLLBACK");
        return fail(
          409,
          "A draft payroll run has reserved a recovery from this advance. Finalize or cancel that run first."
        );
      }
    }

    if (action === "approve") {
      const raw = parsed.body.emiAmount;
      const emi = raw === undefined || raw === "" ? advance.emi_amount : Number(raw);
      if (!Number.isFinite(emi) || emi <= 0 || emi > advance.amount) {
        await client.query("ROLLBACK");
        return fail(400, "Set a monthly EMI amount greater than 0 and not more than the advance amount.");
      }
      await client.query(
        `UPDATE employee_advances
         SET status = 'Active', emi_amount = $1, balance = amount, approved_by = $2, approved_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [Math.round(emi * 100) / 100, access.user.id, advanceId]
      );
    } else {
      await client.query(
        "UPDATE employee_advances SET status = $1, updated_at = NOW() WHERE id = $2",
        [action === "reject" ? "Rejected" : "Closed", advanceId]
      );
    }
    if (action !== "close") {
      await logApproval(client, {
        companyId: access.companyId,
        entityType: "advance",
        entityId: advanceId,
        employeeId: advance.employee_id,
        action,
        actorUserId: access.user.id,
        authority,
      });
    }
    await client.query("COMMIT");

    const updated = await pool.query(`${ADVANCE_SELECT} WHERE a.id = $1`, [advanceId]);
    return ok({ message: `Advance ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "closed"}.`, advance: updated.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Update advance failed", error, "Unable to update advance.");
  } finally {
    client?.release();
  }
}
