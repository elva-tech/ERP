
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  ADMIN_ROLES,
  MANAGER_ROLES,
  fail,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
  trimmed,
} from "@/lib/api";
import { PAYSLIP_SELECT, calculateStructure, payslipColumns, round2 } from "@/lib/payroll";
import { computeLop, roundNetPay } from "@/lib/rules/payroll-rules.mjs";
import { eachDate, weekdayName } from "@/lib/rules/leave-days.mjs";
import { workCalendar } from "@/lib/leave";
import { approvedPolicy } from "@/lib/policy";

async function readRun(db, runId, companyId, lock = false) {
  const result = await db.query(
    `SELECT id, pay_period_year, pay_period_month, status,
            total_gross::float8 AS total_gross, total_deductions::float8 AS total_deductions,
            total_net::float8 AS total_net, notes, processed_at, policy_version, is_provisional
     FROM payroll_runs WHERE id = $1 AND company_id = $2 ${lock ? "FOR UPDATE" : ""}`,
    [runId, companyId]
  );
  return result.rows[0];
}

/**
 * Unpaid-leave and absence days for the month, as defined by the approved
 * policy: approved requests of unpaid leave types (weekly offs/holidays are
 * skipped when the policy excludes them) and, in "unpaid_leave_and_absence"
 * mode, attendance marked Absent (1 day) or Half Day (0.5) on other dates.
 */
async function lopInputs(client, { companyId, employeeId, monthStart, monthEnd, policy }) {
  const calendar =
    policy.leave_day_counting === "exclude_weekly_offs_and_holidays"
      ? await workCalendar(client, { companyId, employeeId, from: monthStart, to: monthEnd })
      : null;
  const leaves = await client.query(
    `SELECT to_char(GREATEST(lr.from_date, $3::date), 'YYYY-MM-DD') AS f,
            to_char(LEAST(lr.to_date, $4::date), 'YYYY-MM-DD') AS t
     FROM leave_requests lr JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.company_id = $1 AND lr.employee_id = $2 AND lr.status = 'Approved' AND lt.is_paid = false
       AND lr.from_date <= $4::date AND lr.to_date >= $3::date`,
    [companyId, employeeId, monthStart, monthEnd]
  );
  const leaveDates = new Set();
  for (const row of leaves.rows) {
    for (const date of eachDate(row.f, row.t)) {
      if (calendar) {
        const off = calendar.weeklyOffFor(date);
        if ((off && off.trim().toLowerCase() === weekdayName(date)) || calendar.holidays.has(date)) continue;
      }
      leaveDates.add(date);
    }
  }

  let absenceDays = 0;
  const absenceDates = [];
  if (policy.lop_mode === "unpaid_leave_and_absence") {
    const absences = await client.query(
      `SELECT to_char(attendance_date, 'YYYY-MM-DD') AS d, status FROM attendance_records
       WHERE company_id = $1 AND employee_id = $2 AND attendance_date BETWEEN $3::date AND $4::date
         AND status IN ('Absent', 'Half Day')`,
      [companyId, employeeId, monthStart, monthEnd]
    );
    for (const row of absences.rows) {
      if (leaveDates.has(row.d)) continue;
      absenceDays += row.status === "Absent" ? 1 : 0.5;
      absenceDates.push({ date: row.d, status: row.status });
    }
  }
  return { unpaidLeaveDays: leaveDates.size, unpaidLeaveDates: [...leaveDates].sort(), absenceDays, absenceDates };
}

/** GET /api/payroll/runs/[runId]?companyId=X — run with its payslips (managers). */
export async function GET(request, { params }) {
  await connection();

  try {
    const runId = parseId((await params).runId);
    if (!runId) return fail(400, "A valid runId is required.");

    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES });
    if (access.error) return access.error;

    const run = await readRun(pool, runId, access.companyId);
    if (!run) return fail(404, "Payroll run not found.");

    const payslips = await pool.query(
      `${PAYSLIP_SELECT} WHERE p.payroll_run_id = $1 AND p.company_id = $2 ORDER BY e.name`,
      [runId, access.companyId]
    );
    return ok({ run, payslips: payslips.rows });
  } catch (error) {
    return serverError("Get payroll run failed", error, "Unable to retrieve payroll run.");
  }
}

/**
 * PATCH /api/payroll/runs/[runId] { action }
 * - process  (managers, Draft): (re)generates draft payslips from salary
 *   assignments effective in the month and reserves advance EMI recoveries.
 *   An advance can only be reserved up to its balance minus what other draft
 *   runs already hold, so two open runs never recover the same money.
 *   Applies the approved company policy (LOP proration, net-pay rounding);
 *   without one the run is marked provisional.
 * - finalize (company_admin, Draft with payslips): refuses provisional runs,
 *   runs processed under an older policy version, negative net pay and
 *   stale reservations, then marks Completed, payslips Generated, and
 *   converts the run's reservations into recoveries (reducing balances).
 * - cancel   (company_admin, Draft): marks Cancelled and releases the run's
 *   reservations. The run stays for audit; the month can be run again.
 * The run row is locked for the whole transaction, so the same run cannot be
 * processed, finalized or cancelled concurrently.
 */
export async function PATCH(request, { params }) {
  await connection();

  let client;
  try {
    const runId = parseId((await params).runId);
    if (!runId) return fail(400, "A valid runId is required.");

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const action = trimmed(parsed.body.action);
    if (!["process", "finalize", "cancel"].includes(action)) {
      return fail(400, "action must be 'process', 'finalize', or 'cancel'.");
    }

    const access = await requireCompanyAccess(request, {
      roles: action === "process" ? MANAGER_ROLES : ADMIN_ROLES,
      mutation: true,
    });
    if (access.error) return access.error;

    client = await pool.connect();
    await client.query("BEGIN");

    const run = await readRun(client, runId, access.companyId, true);
    if (!run) {
      await client.query("ROLLBACK");
      return fail(404, "Payroll run not found.");
    }
    if (run.status !== "Draft") {
      await client.query("ROLLBACK");
      return fail(409, `Cannot ${action} a payroll run with status '${run.status}'.`);
    }

    let result;
    if (action === "process") result = await processRun(client, run, access);
    else if (action === "finalize") result = await finalizeRun(client, run, access);
    else {
      const released = await client.query(
        `UPDATE payroll_advance_recoveries SET status = 'Released', updated_at = NOW()
         WHERE payroll_run_id = $1 AND status = 'Reserved'`,
        [runId]
      );
      await client.query(
        "UPDATE payroll_runs SET status = 'Cancelled', updated_at = NOW() WHERE id = $1",
        [runId]
      );
      result = {
        message: "Payroll run cancelled.",
        releasedRecoveries: released.rowCount,
      };
    }

    if (result.error) {
      await client.query("ROLLBACK");
      return fail(result.status || 400, result.error, result.extra);
    }
    await client.query("COMMIT");

    return ok({ ...result, run: await readRun(pool, runId, access.companyId) });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Update payroll run failed", error, "Unable to update payroll run.");
  } finally {
    client?.release();
  }
}

async function processRun(client, run, access) {
  const companyId = access.companyId;
  const monthStart = `${run.pay_period_year}-${String(run.pay_period_month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(run.pay_period_year, run.pay_period_month, 0)).getUTCDate();
  const monthEnd = `${monthStart.slice(0, 8)}${String(daysInMonth).padStart(2, "0")}`;
  const policy = await approvedPolicy(companyId, client);

  const assignments = await client.query(
    `SELECT DISTINCT ON (e.id) e.id AS employee_id, e.name, a.id AS assignment_id,
            a.structure_id, s.name AS structure_name, a.ctc_annual::float8 AS ctc_annual
     FROM employees e
     JOIN employee_salary_assignments a ON a.employee_id = e.id AND a.company_id = e.company_id
     JOIN salary_structures s ON s.id = a.structure_id
     WHERE e.company_id = $1 AND e.status = 'Active'
       AND a.effective_from <= ($2::date + INTERVAL '1 month' - INTERVAL '1 day')
       AND (a.effective_to IS NULL OR a.effective_to >= $2::date)
     ORDER BY e.id, a.effective_from DESC`,
    [companyId, monthStart]
  );

  const unassigned = await client.query(
    `SELECT e.id, e.name FROM employees e
     WHERE e.company_id = $1 AND e.status = 'Active'
       AND NOT (e.id = ANY($2::bigint[]))
     ORDER BY e.name`,
    [companyId, assignments.rows.map((a) => a.employee_id)]
  );

  const linesByStructure = new Map();
  const errors = [];
  const slips = [];

  for (const assignment of assignments.rows) {
    if (!linesByStructure.has(assignment.structure_id)) {
      const lines = await client.query(
        `SELECT sc.component_id, c.name, c.component_type, c.calculation_type, c.percentage_of,
                c.is_statutory, sc.amount::float8 AS amount, sc.percentage::float8 AS percentage
         FROM salary_structure_components sc
         JOIN salary_components c ON c.id = sc.component_id
         WHERE sc.structure_id = $1 AND c.status = 'Active'`,
        [assignment.structure_id]
      );
      linesByStructure.set(assignment.structure_id, lines.rows);
    }
    const lines = linesByStructure.get(assignment.structure_id);
    if (!lines.length) {
      errors.push(`${assignment.name}: salary structure "${assignment.structure_name}" has no active components.`);
      continue;
    }
    let lop = computeLop({ mode: "none", daysInMonth });
    let lopDetail = null;
    if (policy?.lop_mode && policy.lop_mode !== "none") {
      lopDetail = await lopInputs(client, {
        companyId,
        employeeId: assignment.employee_id,
        monthStart,
        monthEnd,
        policy,
      });
      try {
        lop = computeLop({
          mode: policy.lop_mode,
          basis: policy.lop_day_basis,
          fixedDays: policy.lop_fixed_days,
          daysInMonth,
          unpaidLeaveDays: lopDetail.unpaidLeaveDays,
          absenceDays: lopDetail.absenceDays,
        });
      } catch (error) {
        errors.push(`${assignment.name}: ${error.message}`);
        continue;
      }
    }

    const calc = calculateStructure(lines, assignment.ctc_annual, { earningsFactor: lop.factor });
    if (calc.error) {
      errors.push(`${assignment.name}: ${calc.error}`);
      continue;
    }

    // Lock the employee's active advances first so concurrent processing of
    // another run (or a manual close) waits. The reservation totals are read in
    // a separate statement so they include anything committed while waiting.
    await client.query(
      `SELECT id FROM employee_advances
       WHERE company_id = $1 AND employee_id = $2 AND status = 'Active'
       ORDER BY created_at, id
       FOR UPDATE`,
      [companyId, assignment.employee_id]
    );
    const advances = await client.query(
      `SELECT a.id, a.emi_amount::float8 AS emi_amount, a.balance::float8 AS balance,
              COALESCE((
                SELECT SUM(r.amount) FROM payroll_advance_recoveries r
                WHERE r.advance_id = a.id AND r.status = 'Reserved' AND r.payroll_run_id <> $3
              ), 0)::float8 AS reserved_elsewhere
       FROM employee_advances a
       WHERE a.company_id = $1 AND a.employee_id = $2 AND a.status = 'Active' AND a.balance > 0
       ORDER BY a.created_at, a.id`,
      [companyId, assignment.employee_id, run.id]
    );
    const recoveries = advances.rows
      .map((adv) => {
        const remaining = round2(adv.balance - adv.reserved_elsewhere);
        return {
          advanceId: String(adv.id),
          amount: round2(Math.max(0, Math.min(adv.emi_amount ?? adv.balance, remaining))),
        };
      })
      .filter((r) => r.amount > 0);
    const recoveryTotal = round2(recoveries.reduce((s, r) => s + r.amount, 0));

    const cols = payslipColumns(calc.lines);
    cols.other_deductions = round2(cols.other_deductions + recoveryTotal);
    let gross = calc.gross;
    let totalDeductions = round2(calc.deductions + recoveryTotal);
    let net = round2(gross - totalDeductions);

    let rounding = null;
    if (policy?.net_pay_rounding && policy.net_pay_rounding !== "none") {
      const rounded = roundNetPay(net, policy.net_pay_rounding);
      rounding = { mode: policy.net_pay_rounding, adjustment: rounded.adjustment };
      if (rounded.adjustment > 0) {
        cols.other_earnings = round2(cols.other_earnings + rounded.adjustment);
        gross = round2(gross + rounded.adjustment);
      } else if (rounded.adjustment < 0) {
        cols.other_deductions = round2(cols.other_deductions - rounded.adjustment);
        totalDeductions = round2(totalDeductions - rounded.adjustment);
      }
      net = rounded.net;
    }

    slips.push({
      employeeId: assignment.employee_id,
      cols,
      gross,
      totalDeductions,
      net,
      lop,
      detail: {
        structureId: String(assignment.structure_id),
        structureName: assignment.structure_name,
        assignmentId: String(assignment.assignment_id),
        ctcAnnual: assignment.ctc_annual,
        monthlyCtc: calc.monthlyCtc,
        lines: calc.lines,
        employerContributions: calc.employer,
        advanceRecoveries: recoveries,
        policyVersion: policy?.version ?? null,
        provisional: !policy,
        prorationApplied: lop.applied,
        lop: lop.applied
          ? {
              mode: policy.lop_mode,
              basis: policy.lop_day_basis,
              basisDays: lop.basisDays,
              lopDays: lop.lopDays,
              paidDays: lop.paidDays,
              factor: lop.factor,
              unpaidLeaveDates: lopDetail.unpaidLeaveDates,
              absenceDates: lopDetail.absenceDates,
            }
          : null,
        netPayRounding: rounding,
        notes: [
          "Calculated from company-configured components only; no statutory rates are built in.",
          policy
            ? `Company policy version ${policy.version} applied.`
            : "PROVISIONAL: no approved company payroll policy. LOP proration and net-pay rounding were not applied; this run cannot be finalized.",
        ],
      },
    });
  }

  if (errors.length) {
    return { error: "Payroll could not be processed. Fix the salary setup and retry.", extra: { errors } };
  }

  await client.query("DELETE FROM payslips WHERE payroll_run_id = $1", [run.id]);
  await client.query(
    "DELETE FROM payroll_advance_recoveries WHERE payroll_run_id = $1 AND status = 'Reserved'",
    [run.id]
  );
  for (const slip of slips) {
    for (const recovery of slip.detail.advanceRecoveries) {
      await client.query(
        `INSERT INTO payroll_advance_recoveries (company_id, payroll_run_id, advance_id, employee_id, amount, status)
         VALUES ($1, $2, $3, $4, $5, 'Reserved')`,
        [companyId, run.id, recovery.advanceId, slip.employeeId, recovery.amount]
      );
    }
    const c = slip.cols;
    const lop = slip.lop;
    await client.query(
      `INSERT INTO payslips (payroll_run_id, company_id, employee_id, basic_pay, hra, da, other_earnings,
         gross_pay, pf_employee, esic_employee, professional_tax, tds, other_deductions, total_deductions,
         net_salary, pf_employer, esic_employer, status, calculation_detail, working_days, paid_days, lop_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'Draft', $18, $19, $20, $21)`,
      [
        run.id, companyId, slip.employeeId, c.basic_pay, c.hra, c.da, c.other_earnings, slip.gross,
        c.pf_employee, c.esic_employee, c.professional_tax, c.tds, c.other_deductions, slip.totalDeductions,
        slip.net, c.pf_employer, c.esic_employer, JSON.stringify(slip.detail),
        lop.applied && Number.isInteger(lop.basisDays) ? lop.basisDays : null,
        lop.applied && Number.isInteger(lop.paidDays) ? lop.paidDays : null,
        lop.lopDays,
      ]
    );
  }

  const totals = slips.reduce(
    (acc, s) => ({ gross: acc.gross + s.gross, deductions: acc.deductions + s.totalDeductions, net: acc.net + s.net }),
    { gross: 0, deductions: 0, net: 0 }
  );
  await client.query(
    `UPDATE payroll_runs SET total_gross = $1, total_deductions = $2, total_net = $3,
       processed_by = $4, processed_at = NOW(), updated_at = NOW(),
       policy_version = $6, is_provisional = $7
     WHERE id = $5`,
    [
      round2(totals.gross), round2(totals.deductions), round2(totals.net), access.user.id, run.id,
      policy?.version ?? null, !policy,
    ]
  );

  const negativeNet = slips
    .filter((s) => s.net < 0)
    .map((s) => {
      const assignment = assignments.rows.find((a) => String(a.employee_id) === String(s.employeeId));
      return { employeeId: String(s.employeeId), name: assignment?.name ?? "", netSalary: s.net };
    });

  return {
    message: `Generated ${slips.length} draft payslip(s).`,
    processed: slips.length,
    skipped: unassigned.rows.map((e) => ({ employeeId: String(e.id), name: e.name, reason: "No salary assignment for this month." })),
    warnings: [
      ...(negativeNet.length
        ? [`${negativeNet.length} payslip(s) have negative net salary. Correct the salary setup or advance EMIs before finalizing.`]
        : []),
      ...(!policy
        ? ["Provisional: the company payroll policy has not been approved, so loss-of-pay and rounding rules were not applied and this run cannot be finalized."]
        : []),
    ],
    provisional: !policy,
    policyVersion: policy?.version ?? null,
    negativeNet,
  };
}

async function finalizeRun(client, run, access) {
  const policy = await approvedPolicy(access.companyId, client);
  if (!policy) {
    return {
      error: "Payroll cannot be finalized until a company admin approves the HR & payroll policy.",
      status: 409,
    };
  }
  if (run.is_provisional || run.policy_version !== policy.version) {
    return {
      error: "This run was processed under a different (or no) approved policy. Process it again before finalizing.",
      status: 409,
    };
  }

  const payslips = await client.query(
    `SELECT p.id, p.employee_id, e.name, p.net_salary::float8 AS net_salary, p.calculation_detail
     FROM payslips p JOIN employees e ON e.id = p.employee_id
     WHERE p.payroll_run_id = $1
     ORDER BY e.name`,
    [run.id]
  );
  if (!payslips.rowCount) return { error: "Process the payroll run before finalizing.", status: 409 };

  const negative = payslips.rows.filter((slip) => slip.net_salary < 0);
  if (negative.length) {
    return {
      error: "Payroll cannot be finalized while any payslip has a negative net salary.",
      status: 409,
      extra: {
        negativeNet: negative.map((slip) => ({
          employeeId: String(slip.employee_id),
          name: slip.name,
          netSalary: slip.net_salary,
        })),
      },
    };
  }

  // Lock order matches processing (employee, then advance creation order).
  const reservations = await client.query(
    `SELECT r.id, r.advance_id, r.amount::float8 AS amount,
            a.status AS advance_status, a.balance::float8 AS balance
     FROM payroll_advance_recoveries r
     JOIN employee_advances a ON a.id = r.advance_id
     WHERE r.payroll_run_id = $1 AND r.status = 'Reserved'
     ORDER BY a.employee_id, a.created_at, a.id
     FOR UPDATE OF r, a`,
    [run.id]
  );

  const expected = round2(
    payslips.rows.reduce(
      (sum, slip) =>
        sum + (slip.calculation_detail?.advanceRecoveries ?? []).reduce((s, r) => s + Number(r.amount), 0),
      0
    )
  );
  const reserved = round2(reservations.rows.reduce((sum, r) => sum + r.amount, 0));
  const stale = reservations.rows.some((r) => r.advance_status !== "Active" || r.balance < r.amount);
  if (expected !== reserved || stale) {
    return {
      error: "Advance recoveries for this run are out of date. Process the run again before finalizing.",
      status: 409,
    };
  }

  for (const reservation of reservations.rows) {
    await client.query(
      `UPDATE employee_advances
       SET balance = balance - $1,
           status = CASE WHEN balance - $1 <= 0 THEN 'Closed' ELSE status END,
           updated_at = NOW()
       WHERE id = $2`,
      [reservation.amount, reservation.advance_id]
    );
    await client.query(
      "UPDATE payroll_advance_recoveries SET status = 'Recovered', updated_at = NOW() WHERE id = $1",
      [reservation.id]
    );
  }

  await client.query("UPDATE payslips SET status = 'Generated', updated_at = NOW() WHERE payroll_run_id = $1", [run.id]);
  await client.query("UPDATE payroll_runs SET status = 'Completed', updated_at = NOW() WHERE id = $1", [run.id]);
  return { message: `Payroll finalized; ${payslips.rowCount} payslip(s) generated.` };
}
