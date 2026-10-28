import { useState } from "react";
import { apiRequest, sendJson, withQuery } from "../api";
import { canManage, formatDate, formatMoney, inputClass, isAdmin, linkButton, primaryButton, submitButton, secondaryButton, useAction, useApi } from "./helpers";
import { DataTable, Field, Notice, PageHeader, Panel, StatGrid, StatusBadge } from "./ui";
import { useConfirm } from "./useConfirm";

const TREATMENT = {
  configured_components: "Use the salary components configured in each structure",
  not_applicable: "Not applicable to this company",
};

/** Each setting records a company decision; no rates or thresholds are supplied by the system. */
const POLICY_SETTINGS = [
  {
    key: "lopMode",
    column: "lop_mode",
    label: "Loss of pay (LOP)",
    help: "Which days reduce earnings in payroll.",
    options: {
      none: "No loss-of-pay deduction",
      unpaid_leave: "Deduct approved unpaid leave days",
      unpaid_leave_and_absence: "Deduct approved unpaid leave and absent days",
    },
  },
  {
    key: "lopDayBasis",
    column: "lop_day_basis",
    label: "LOP day basis",
    help: "Divisor used to prorate earnings for one LOP day.",
    options: { calendar_days: "Calendar days in the month", fixed_days: "A fixed number of days" },
    when: (v) => v.lopMode && v.lopMode !== "none",
  },
  {
    key: "lopFixedDays",
    column: "lop_fixed_days",
    label: "Fixed days per month",
    help: "Whole number between 1 and 31.",
    number: [1, 31],
    when: (v) => v.lopMode && v.lopMode !== "none" && v.lopDayBasis === "fixed_days",
  },
  {
    key: "netPayRounding",
    column: "net_pay_rounding",
    label: "Net pay rounding",
    options: { none: "No rounding (keep paise)", nearest_rupee: "Round to the nearest rupee", round_up_rupee: "Round up to the next rupee" },
  },
  { key: "pfTreatment", column: "pf_treatment", label: "Provident Fund (PF)", options: TREATMENT },
  { key: "esicTreatment", column: "esic_treatment", label: "ESIC", options: TREATMENT },
  { key: "professionalTaxTreatment", column: "professional_tax_treatment", label: "Professional tax", options: TREATMENT },
  { key: "tdsTreatment", column: "tds_treatment", label: "TDS (income tax)", options: TREATMENT },
  {
    key: "overtimePayTreatment",
    column: "overtime_pay_treatment",
    label: "Overtime pay",
    help: "Overtime minutes are always tracked in attendance.",
    options: { not_paid: "Not paid through payroll", configured_components: "Paid only through configured salary components" },
  },
  {
    key: "leaveDayCounting",
    column: "leave_day_counting",
    label: "Leave day counting",
    options: { calendar_days: "Count every calendar day in the request", exclude_weekly_offs_and_holidays: "Exclude rostered weekly offs and company holidays" },
  },
  {
    key: "nightShiftWindowMinutes",
    column: "night_shift_window_minutes",
    label: "Night-shift punch window (minutes, optional)",
    help: "How far before shift start / after shift end punches are accepted for overnight shifts (0–720). Leave blank to keep overnight shifts out of automatic punch pairing.",
    number: [0, 720],
    optional: true,
  },
];

function policyToForm(policy) {
  return Object.fromEntries(POLICY_SETTINGS.map((s) => [s.key, policy?.[s.column] ?? ""]));
}

export function PayrollPolicy({ companyId, role }) {
  const policy = useApi(canManage(role) ? withQuery("/api/policy", { companyId }) : null);
  const action = useAction();
  const data = policy.data;

  if (!canManage(role)) return <Notice notice={{ type: "info", message: "The payroll policy is available to HR managers and company admins." }} />;

  return (
    <section className="space-y-5">
      <PageHeader title="Payroll & Leave Policy" subtitle="Company decisions that payroll, leave and attendance processing follow" />
      <Notice notice={{ type: "info", message: "The system does not supply statutory rates, thresholds or tax slabs. PF, ESIC, professional tax and TDS amounts come only from the salary components your company configures. Confirm each decision with your payroll or compliance advisor before approving." }} />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      {policy.loading && !data ? (
        <Panel><p className="text-sm text-muted">Loading policy…</p></Panel>
      ) : policy.error ? (
        <Notice notice={{ type: "error", message: policy.error }} />
      ) : (
        data && <PolicyEditor key={`${data.policy.version}-${data.policy.status}`} companyId={companyId} admin={isAdmin(role)} data={data} reload={policy.reload} action={action} />
      )}
    </section>
  );
}

function PolicyEditor({ companyId, admin, data, reload, action }) {
  const p = data.policy;
  const [form, setForm] = useState(() => policyToForm(p));
  const [notes, setNotes] = useState(p.notes || "");
  const confirm = useConfirm();
  const approved = p.approved_snapshot;
  const missing = data.missing || [];
  const dirty = POLICY_SETTINGS.some((s) => String(form[s.key] ?? "") !== String(p[s.column] ?? "")) || (notes || "") !== (p.notes || "");

  async function save(event) {
    event.preventDefault();
    const body = { companyId, notes };
    for (const s of POLICY_SETTINGS) {
      const value = form[s.key];
      body[s.key] = value === "" ? null : s.number ? Number(value) : value;
    }
    const result = await action.run(() => sendJson("PUT", "/api/policy", body));
    if (result) reload();
  }

  async function approve() {
    if (!(await confirm.ask({ title: `Approve policy version ${p.version}`, message: "Payroll processed after approval will use these settings.", confirmLabel: "Approve policy" }))) return;
    const result = await action.run(() => sendJson("POST", "/api/policy/approve", { companyId, version: p.version }));
    if (result) reload();
  }

  return (
          <>
            <StatGrid stats={[
              { label: "Draft version", value: p.version || "Not saved" },
              { label: "Draft status", value: p.status, tone: p.status === "Approved" ? "text-success" : "text-warning-strong" },
              { label: "Version used by payroll", value: approved ? `v${approved.version}` : "None", tone: approved ? "text-success" : "text-danger" },
              { label: "Undecided settings", value: missing.length, tone: missing.length ? "text-danger" : "text-success" },
            ]} />
            {!approved && (
              <Notice notice={{ type: "error", message: "No policy has been approved. Payroll runs are calculated as provisional (no LOP, no rounding) and cannot be finalized until a policy is approved." }} />
            )}
            {approved && p.status === "Draft" && (
              <Notice notice={{ type: "info", message: `Draft version ${p.version} has unapproved changes. Payroll keeps using approved version ${approved.version}; draft payroll runs must be reprocessed after approval before they can be finalized.` }} />
            )}
            {missing.length > 0 && (
              <Notice notice={{ type: "error", message: `Decisions still needed before approval: ${missing.join(", ")}.` }} />
            )}
            <Panel title="Policy settings" subtitle={p.updated_at ? `Last saved ${formatDate(p.updated_at)}${p.updated_by_name ? ` by ${p.updated_by_name}` : ""}${p.approved_at ? ` · approved ${formatDate(p.approved_at)}${p.approved_by_name ? ` by ${p.approved_by_name}` : ""}` : ""}` : "Not saved yet"}>
              <form onSubmit={save} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {POLICY_SETTINGS.filter((s) => !s.when || s.when(form)).map((s) => (
                    <Field key={s.key} label={s.label} required={!s.optional}>
                      {s.options ? (
                        <select disabled={!admin} value={form[s.key] ?? ""} onChange={(e) => setForm({ ...form, [s.key]: e.target.value })} className={`${inputClass} ${form[s.key] === "" && !s.optional ? "border-danger/40" : ""}`}>
                          <option value="">Not decided</option>
                          {Object.entries(s.options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      ) : (
                        <input type="number" disabled={!admin} min={s.number[0]} max={s.number[1]} step="1" value={form[s.key] ?? ""} onChange={(e) => setForm({ ...form, [s.key]: e.target.value })} className={inputClass} />
                      )}
                      {s.help && <p className="mt-1 text-[11px] font-normal text-muted">{s.help}</p>}
                      {approved && String(approved[s.column] ?? "") !== String(p[s.column] ?? "") && (
                        <p className="mt-1 text-[11px] font-semibold text-warning-strong">Approved value: {approved[s.column] == null ? "not set" : s.options?.[approved[s.column]] || approved[s.column]}</p>
                      )}
                    </Field>
                  ))}
                </div>
                <Field label="Notes (who decided, references, effective date)">
                  <textarea rows={3} disabled={!admin} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
                </Field>
                {admin ? (
                  <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                    <button type="submit" disabled={action.busy || !dirty} className={secondaryButton}>Save draft</button>
                    <button type="button" disabled={action.busy || dirty || p.status !== "Draft" || !p.version || missing.length > 0} onClick={approve} className={primaryButton}>
                      Approve version {p.version || ""}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted">Only company admins can change or approve the policy.</p>
                )}
                {admin && dirty && <p className="text-right text-xs text-muted">Save the draft before approving it.</p>}
              </form>
            </Panel>
            {confirm.dialog}
          </>
  );
}

export function ApprovalDelegation({ companyId, role }) {
  const admin = isAdmin(role);
  const members = useApi(admin ? withQuery("/api/members", { companyId }) : null);
  const delegates = useApi(admin ? withQuery("/api/approvals/delegates", { companyId }) : null);
  const [form, setForm] = useState({ userId: "", reason: "" });
  const action = useAction();
  const confirm = useConfirm();

  if (!admin) return <Notice notice={{ type: "info", message: "Approval delegation is managed by company admins." }} />;

  const active = (delegates.data?.delegates || []).filter((d) => !d.revoked_at);
  const activeIds = new Set(active.map((d) => String(d.user_id)));

  async function grant(event) {
    event.preventDefault();
    const result = await action.run(() => sendJson("POST", "/api/approvals/delegates", { companyId, userId: form.userId, reason: form.reason }));
    if (result) { setForm({ userId: "", reason: "" }); delegates.reload(); }
  }

  async function revoke(row) {
    if (!(await confirm.ask({ title: "Revoke delegation", message: `Revoke approval delegation for ${row.full_name}? They will no longer be able to approve requests raised by admins and HR managers.`, confirmLabel: "Revoke", danger: true }))) return;
    const result = await action.run(() => apiRequest(withQuery(`/api/approvals/delegates/${row.id}`, { companyId }), { method: "DELETE" }));
    if (result) delegates.reload();
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Approval Delegation" subtitle="Second approvers for requests raised by admins and HR managers" />
      <Notice notice={{ type: "info", message: "A delegate can approve or reject leave, attendance regularization and salary advance requests raised by company admins and HR managers — for example when the only admin needs their own leave approved. Nobody can approve their own request, and every decision is recorded in the approval audit log." }} />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <Panel title="Add delegate">
        <form onSubmit={grant} className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
          <Field label="Member" required>
            <select required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className={inputClass}>
              <option value="">{members.loading ? "Loading…" : "Select member"}</option>
              {(members.data?.members || []).filter((m) => !activeIds.has(String(m.user_id))).map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.email}) — {m.role.replace("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Reason" required><input required maxLength={1000} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Second approver for the company admin's own requests" className={inputClass} /></Field>
          <button type="submit" disabled={action.busy} className={submitButton}>Add delegate</button>
        </form>
        {members.error && <p className="mt-3 text-sm text-danger">{members.error}</p>}
      </Panel>
      <Panel title="Delegates" padded={false}>
        <DataTable
          loading={delegates.loading}
          error={delegates.error}
          rows={delegates.data?.delegates || []}
          empty="No approval delegates designated."
          columns={[
            { key: "full_name", label: "Member", render: (d) => <div><p className="font-semibold">{d.full_name}</p><p className="text-xs text-muted">{d.email}</p></div> },
            { key: "role", label: "Role", render: (d) => (d.role || "—").replace("_", " ") },
            { key: "reason", label: "Reason", render: (d) => <span className="whitespace-normal">{d.reason}</span> },
            { key: "granted", label: "Granted", render: (d) => <div><p>{formatDate(d.granted_at)}</p><p className="text-xs text-muted">{d.granted_by_name}</p></div> },
            { key: "status", label: "Status", render: (d) => (d.revoked_at ? <div><StatusBadge status="Revoked" /><p className="mt-1 text-xs text-muted">{formatDate(d.revoked_at)} · {d.revoked_by_name}</p></div> : <StatusBadge status="Active" />) },
            { key: "actions", label: "", render: (d) => !d.revoked_at && <button type="button" onClick={() => revoke(d)} className={`${linkButton} text-danger`}>Revoke</button> },
          ]}
        />
      </Panel>
      {confirm.dialog}
    </section>
  );
}

export function MyApprovals({ companyId }) {
  const pending = useApi(withQuery("/api/approvals/pending", { companyId }));
  const action = useAction();
  const confirm = useConfirm();
  const data = pending.data;

  async function review(kind, row, verb) {
    const path = { leave: "/api/leave/requests", regularization: "/api/attendance/regularizations", advance: "/api/payroll/advances" }[kind];
    const noun = { leave: "leave request", regularization: "regularization", advance: "salary advance" }[kind];
    let body = { action: verb };
    if (kind === "advance" && verb === "approve") {
      if (row.amount == null) {
        const amount = await confirm.ask({
          title: "Approve advance",
          message: `${row.employee_name} requested an advance repaid over ${row.requested_months} month(s). Enter the approved amount.`,
          confirmLabel: "Next",
          input: { label: "Approved advance amount (₹)", type: "number", min: "1", step: "0.01", required: true, defaultValue: "" },
        });
        if (amount === null) return;
        body.amount = Number(amount);
      }
      const input = await confirm.ask({
        title: "Approve advance",
        message: `Approve ${formatMoney(row.amount ?? body.amount)} for ${row.employee_name}? The EMI is recovered through monthly payroll.`,
        confirmLabel: "Approve",
        input: { label: "Monthly EMI to recover (₹)", type: "number", min: "1", step: "0.01", required: true, defaultValue: row.emi_amount ?? "" },
      });
      if (input === null) return;
      body.emiAmount = Number(input);
    } else if (verb === "reject") {
      const note = await confirm.ask({ title: `Reject ${noun}`, message: `Reject the ${noun} from ${row.employee_name}?`, confirmLabel: "Reject", danger: true, input: { label: "Reason for rejection (optional)" } });
      if (note === null) return;
      body = { action: verb, reviewNote: note.trim() || undefined };
    }
    const result = await action.run(() => sendJson("PATCH", withQuery(`${path}/${row.id}`, { companyId }), body));
    if (result) pending.reload();
  }

  const buttons = (kind) => ({ key: "actions", label: "", render: (row) => (
    <div className="flex gap-3">
      <button type="button" disabled={action.busy} onClick={() => review(kind, row, "approve")} className={`${linkButton} text-success`}>Approve</button>
      <button type="button" disabled={action.busy} onClick={() => review(kind, row, "reject")} className={`${linkButton} text-danger`}>Reject</button>
    </div>
  ) });
  const employee = { key: "employee_name", label: "Employee", render: (r) => <div><p className="font-semibold">{r.employee_name}</p><p className="text-xs text-muted">{r.employee_code}</p></div> };

  return (
    <section className="space-y-5">
      <PageHeader title="My Approvals" subtitle="Requests waiting for your decision">
        <button type="button" onClick={pending.reload} className={secondaryButton}>↻ Refresh</button>
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      {pending.error && <Notice notice={{ type: "error", message: pending.error }} />}
      {data && data.authority === null && <Notice notice={{ type: "info", message: "You have no approval responsibilities in this company." }} />}
      {data?.authority === "delegate" && <Notice notice={{ type: "info", message: "You are an approval delegate: you see requests raised by company admins and HR managers. Your own requests are never shown here." }} />}
      {(pending.loading || data?.authority) && (
        <>
          <StatGrid stats={[
            { label: "Leave requests", value: data ? data.leaveRequests.length : "…", tone: "text-warning-strong" },
            { label: "Regularizations", value: data ? data.regularizations.length : "…", tone: "text-warning-strong" },
            { label: "Salary advances", value: data ? data.advances.length : "…", tone: "text-warning-strong" },
          ]} />
          <Panel title="Leave requests" padded={false}>
            <DataTable loading={pending.loading} rows={data?.leaveRequests || []} empty="No pending leave requests." columns={[
              employee,
              { key: "leave_type_name", label: "Type" },
              { key: "dates", label: "Dates", render: (r) => `${formatDate(r.from_date)} – ${formatDate(r.to_date)}` },
              { key: "days", label: "Days" },
              { key: "reason", label: "Reason", render: (r) => <span className="whitespace-normal">{r.reason || "—"}</span> },
              buttons("leave"),
            ]} />
          </Panel>
          <Panel title="Attendance regularizations" padded={false}>
            <DataTable loading={pending.loading} rows={data?.regularizations || []} empty="No pending regularizations." columns={[
              employee,
              { key: "attendance_date", label: "Date", render: (r) => formatDate(r.attendance_date) },
              { key: "times", label: "Requested", render: (r) => `${r.requested_check_in || "—"} – ${r.requested_check_out || "—"}` },
              { key: "reason", label: "Reason", render: (r) => <span className="whitespace-normal">{r.reason || "—"}</span> },
              buttons("regularization"),
            ]} />
          </Panel>
          <Panel title="Salary advances" padded={false}>
            <DataTable loading={pending.loading} rows={data?.advances || []} empty="No pending advance requests." columns={[
              employee,
              { key: "amount", label: "Amount", render: (r) => formatMoney(r.amount) },
              { key: "requested_months", label: "Months", render: (r) => r.requested_months ?? "—" },
              { key: "emi_amount", label: "Requested EMI", render: (r) => formatMoney(r.emi_amount) },
              { key: "purpose", label: "Purpose", render: (r) => <span className="whitespace-normal">{r.purpose || "—"}</span> },
              buttons("advance"),
            ]} />
          </Panel>
        </>
      )}
      {confirm.dialog}
    </section>
  );
}

export function LeaveCarryForward({ companyId, role }) {
  const [fromYear, setFromYear] = useState(new Date().getFullYear());
  const [preview, setPreview] = useState(null);
  const action = useAction();
  const confirm = useConfirm();
  if (!isAdmin(role)) return <Notice notice={{ type: "info", message: "Year-end carry-forward is run by company admins." }} />;

  async function run(apply) {
    if (apply && !(await confirm.ask({ title: `Apply carry-forward to ${fromYear + 1}`, message: `Write carry-forward balances into ${fromYear + 1}? Re-running overwrites the previous carry-forward values.`, confirmLabel: "Apply" }))) return;
    const result = await action.run(() => sendJson("POST", "/api/leave/carry-forward", { companyId, fromYear, apply }));
    if (result) setPreview(result);
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Leave Carry Forward" subtitle="Move unused paid leave into the next year, capped by each leave type's carry-forward limit" />
      <Notice notice={{ type: "info", message: "Only active, paid leave types marked “carry forward” are included. Unused = allocation + carried forward − used − pending. Expiry of carried-forward days is not applied automatically because no expiry rule has been configured." }} />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From year"><input type="number" min="2000" max="2099" value={fromYear} onChange={(e) => { setFromYear(Number(e.target.value)); setPreview(null); }} className={`${inputClass} w-32`} /></Field>
          <button type="button" disabled={action.busy} onClick={() => run(false)} className={secondaryButton}>Preview</button>
          <button type="button" disabled={action.busy || !preview || preview.applied || !preview.results.length} onClick={() => run(true)} className={primaryButton}>Apply to {fromYear + 1}</button>
        </div>
      </Panel>
      {preview && (
        <>
          {preview.warnings.map((w) => <Notice key={w} notice={{ type: "info", message: w }} />)}
          <Panel title={preview.applied ? `Applied to ${preview.toYear}` : `Preview for ${preview.toYear}`} padded={false}>
            <DataTable
              rows={preview.results}
              rowKey={(r) => `${r.employeeId}-${r.leaveTypeId}`}
              empty="No active employees with carry-forward leave types."
              columns={[
                { key: "employeeName", label: "Employee", className: "font-semibold" },
                { key: "leaveTypeName", label: "Leave type" },
                { key: "unused", label: "Unused" },
                { key: "pending", label: "Pending" },
                { key: "carryForward", label: "Carried forward", className: "font-semibold text-navy" },
              ]}
            />
          </Panel>
        </>
      )}
      {confirm.dialog}
    </section>
  );
}
