import { useState } from "react";
import { sendJson, withQuery } from "../api";
import MasterCrud from "./MasterCrud";
import {
  MONTH_NAMES,
  canManage,
  downloadCsv,
  formatDate,
  inputClass,
  linkButton,
  primaryButton,
  secondaryButton,
  todayLocal,
  useAction,
  useApi,
} from "./helpers";
import {
  AwaitingApprover,
  DataTable,
  EmployeeSelect,
  Field,
  Modal,
  Notice,
  PageHeader,
  Panel,
  StatGrid,
  StatusBadge,
} from "./ui";
import { useConfirm } from "./useConfirm";

const LEAVE_RULES_NOTE =
  "Days are counted as calendar days between the dates (weekly offs and holidays are not excluded). Paid leave requires sufficient balance; requests cannot span two calendar years.";

function requestColumns({ manager, onAction, busy, showEmployee = true, ownEmployeeId = null }) {
  const isOwn = (r) => ownEmployeeId && String(r.employee_id) === String(ownEmployeeId);
  return [
    ...(showEmployee
      ? [
          { key: "employee_name", label: "Employee", className: "font-semibold text-slate-800" },
          { key: "department", label: "Department" },
        ]
      : []),
    { key: "leave_type_name", label: "Leave type" },
    { key: "from_date", label: "From", render: (r) => formatDate(r.from_date) },
    { key: "to_date", label: "To", render: (r) => formatDate(r.to_date) },
    { key: "days", label: "Days" },
    { key: "reason", label: "Reason", render: (r) => <span className="block max-w-xs truncate" title={r.reason || ""}>{r.reason || "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "reviewed_by_name", label: "Reviewed by", render: (r) => r.reviewed_by_name || "—" },
    ...(onAction
      ? [{
          key: "actions",
          label: "Actions",
          render: (r) => (
            <span className="flex gap-3">
              {manager && r.status === "Pending" && (isOwn(r) ? <AwaitingApprover /> : (
                <>
                  <button type="button" disabled={busy} onClick={() => onAction(r, "approve")} className={`${linkButton} text-emerald-700`}>Approve</button>
                  <button type="button" disabled={busy} onClick={() => onAction(r, "reject")} className={`${linkButton} text-red-600`}>Reject</button>
                </>
              ))}
              {(r.status === "Pending" || r.status === "Approved") && (
                <button type="button" disabled={busy} onClick={() => onAction(r, "cancel")} className={`${linkButton} text-slate-600`}>Cancel</button>
              )}
              {!["Pending", "Approved"].includes(r.status) && "—"}
            </span>
          ),
        }]
      : []),
  ];
}

function useLeaveActions(companyId, reload) {
  const action = useAction();
  const confirm = useConfirm();
  async function onAction(request, verb) {
    if (verb === "cancel" && !(await confirm.ask({ title: "Cancel leave request", message: `Cancel ${request.employee_name ? `${request.employee_name}'s` : "this"} leave request (${formatDate(request.from_date)} – ${formatDate(request.to_date)})?`, confirmLabel: "Cancel request", cancelLabel: "Keep request", danger: true }))) return;
    let note = "";
    if (verb === "reject") {
      note = await confirm.ask({ title: "Reject leave request", message: `Reject the leave request from ${request.employee_name || "this employee"}?`, confirmLabel: "Reject", danger: true, input: { label: "Reason for rejection (optional)" } });
      if (note === null) return;
    }
    const result = await action.run(() =>
      sendJson("PATCH", withQuery(`/api/leave/requests/${request.id}`, { companyId }), { action: verb, reviewNote: note.trim() || undefined })
    );
    if (result) reload();
  }
  return { ...action, onAction, dialog: confirm.dialog };
}

function ApplyLeaveModal({ companyId, role, employees, onClose, onSaved }) {
  const manager = canManage(role);
  const types = useApi(withQuery("/api/leave/types", { companyId }));
  const [form, setForm] = useState({ employeeId: "", leaveTypeId: "", fromDate: todayLocal(), toDate: todayLocal(), reason: "" });
  const action = useAction();
  const activeTypes = (types.data?.leaveTypes || []).filter((t) => t.status === "Active");

  async function submit(event) {
    event.preventDefault();
    const result = await action.run(() =>
      sendJson("POST", "/api/leave/requests", { companyId, ...form, employeeId: manager ? form.employeeId : undefined })
    );
    if (result) onSaved();
  }

  return (
    <Modal title="Apply for leave" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Notice notice={action.notice} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {manager && <Field label="Employee" required className="sm:col-span-2"><EmployeeSelect employees={employees} value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} required /></Field>}
          <Field label="Leave type" required className="sm:col-span-2">
            <select required value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} className={inputClass}>
              <option value="">{activeTypes.length ? "Select leave type" : "No leave types configured"}</option>
              {activeTypes.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_paid ? "" : " (unpaid)"}</option>)}
            </select>
          </Field>
          <Field label="From" required><input type="date" required value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value, toDate: form.toDate < e.target.value ? e.target.value : form.toDate })} className={inputClass} /></Field>
          <Field label="To" required><input type="date" required min={form.fromDate} value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} className={inputClass} /></Field>
          <Field label="Reason" className="sm:col-span-2"><textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputClass} /></Field>
        </div>
        <p className="text-xs text-slate-500">{LEAVE_RULES_NOTE}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={action.busy} className={primaryButton}>{action.busy ? "Submitting…" : "Submit"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function LeaveDashboard({ companyId, role, employees, onNavigate }) {
  const today = todayLocal();
  const requests = useApi(withQuery("/api/leave/requests", { companyId }));
  const [applying, setApplying] = useState(false);
  const rows = requests.data?.requests || [];
  const thisMonth = today.slice(0, 7);
  const onLeaveToday = rows.filter((r) => r.status === "Approved" && r.from_date <= today && r.to_date >= today);
  const pending = rows.filter((r) => r.status === "Pending");
  const approvedThisMonth = rows.filter((r) => r.status === "Approved" && r.from_date.slice(0, 7) === thisMonth);

  return (
    <section className="space-y-5">
      <PageHeader title="Leave Dashboard" subtitle="Leave activity across the company">
        <button type="button" onClick={() => setApplying(true)} className={primaryButton}>+ Apply Leave</button>
      </PageHeader>
      {requests.error && <Notice notice={{ type: "error", message: requests.error }} />}
      <StatGrid stats={[
        { label: "Active employees", value: employees.filter((e) => e.status === "Active").length },
        { label: "On leave today", value: requests.loading ? "…" : onLeaveToday.length },
        { label: "Pending requests", value: requests.loading ? "…" : pending.length, tone: "text-amber-600" },
        { label: "Approved this month", value: requests.loading ? "…" : approvedThisMonth.length, tone: "text-emerald-600" },
      ]} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="On leave today" padded={false}>
          <DataTable rows={onLeaveToday} loading={requests.loading} empty="Nobody is on approved leave today." columns={requestColumns({}).slice(0, 5)} />
        </Panel>
        <Panel title="Pending requests" actions={canManage(role) && <button type="button" onClick={() => onNavigate("Leave Approvals")} className={secondaryButton}>Open approvals</button>} padded={false}>
          <DataTable rows={pending.slice(0, 10)} loading={requests.loading} empty="No pending requests." columns={requestColumns({}).slice(0, 5)} />
        </Panel>
      </div>
      {applying && <ApplyLeaveModal companyId={companyId} role={role} employees={employees} onClose={() => setApplying(false)} onSaved={() => { setApplying(false); requests.reload(); }} />}
    </section>
  );
}

export function LeaveRequests({ companyId, role, employees, ownEmployeeId }) {
  const manager = canManage(role);
  const [status, setStatus] = useState("");
  const [applying, setApplying] = useState(false);
  const requests = useApi(withQuery("/api/leave/requests", { companyId, status }));
  const actions = useLeaveActions(companyId, requests.reload);
  const rows = requests.data?.requests || [];
  const count = (s) => rows.filter((r) => r.status === s).length;

  return (
    <section className="space-y-5">
      <PageHeader title="Leave Requests" subtitle={manager ? "All leave applications in the company" : "Your leave applications"}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["Pending", "Approved", "Rejected", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button type="button" onClick={() => setApplying(true)} className={primaryButton}>+ New Leave Request</button>
      </PageHeader>
      <Notice notice={actions.notice} onClose={() => actions.setNotice(null)} />
      <StatGrid stats={[
        { label: "Shown", value: rows.length },
        { label: "Pending", value: count("Pending"), tone: "text-amber-600" },
        { label: "Approved", value: count("Approved"), tone: "text-emerald-600" },
        { label: "Rejected", value: count("Rejected"), tone: "text-red-600" },
      ]} />
      <Panel title="Requests" padded={false}>
        <DataTable loading={requests.loading} error={requests.error} rows={rows} empty="No leave requests." columns={requestColumns({ manager, onAction: actions.onAction, busy: actions.busy, ownEmployeeId })} />
      </Panel>
      {applying && <ApplyLeaveModal companyId={companyId} role={role} employees={employees} onClose={() => setApplying(false)} onSaved={() => { setApplying(false); requests.reload(); }} />}
      {actions.dialog}
    </section>
  );
}

export function LeaveApprovals({ companyId, role, ownEmployeeId }) {
  const requests = useApi(canManage(role) ? withQuery("/api/leave/requests", { companyId, status: "Pending" }) : null);
  const actions = useLeaveActions(companyId, requests.reload);
  if (!canManage(role)) return <Notice notice={{ type: "info", message: "Leave approvals are available to HR managers and company admins." }} />;

  return (
    <section className="space-y-5">
      <PageHeader title="Leave Approvals" subtitle="Approve or reject pending leave requests. Approval deducts from the leave balance.">
        <button type="button" onClick={requests.reload} className={secondaryButton}>↻ Refresh queue</button>
      </PageHeader>
      <Notice notice={actions.notice} onClose={() => actions.setNotice(null)} />
      <StatGrid stats={[{ label: "Pending requests", value: requests.data?.count ?? "…", tone: "text-amber-600" }]} />
      <Panel title="Approval queue" padded={false}>
        <DataTable loading={requests.loading} error={requests.error} rows={requests.data?.requests || []} empty="No requests awaiting approval." columns={requestColumns({ manager: true, onAction: actions.onAction, busy: actions.busy, ownEmployeeId })} />
      </Panel>
      {actions.dialog}
    </section>
  );
}

export function LeaveBalance({ companyId, role }) {
  const manager = canManage(role);
  const [year, setYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState(null);
  const balances = useApi(withQuery("/api/leave/balances", { companyId, year }));
  const action = useAction();
  const rows = balances.data?.balances || [];

  async function save(event) {
    event.preventDefault();
    const result = await action.run(() =>
      sendJson("POST", "/api/leave/balances", { companyId, employeeId: editing.employee_id, leaveTypeId: editing.leave_type_id, year, allocated: Number(editing.allocated), carryForward: Number(editing.carry_forward) })
    );
    if (result) { setEditing(null); balances.reload(); }
  }

  const columns = [
    { key: "employee_name", label: "Employee", className: "font-semibold" },
    { key: "employee_code", label: "Code" },
    { key: "leave_type_name", label: "Leave type", render: (r) => `${r.leave_type_name}${r.is_paid ? "" : " (unpaid)"}` },
    { key: "allocated", label: "Allocated", render: (r) => <>{r.allocated}{r.is_default_allocation && <span className="ml-1 text-[10px] text-slate-400">(policy default)</span>}</> },
    { key: "carry_forward", label: "Carry forward" },
    { key: "used", label: "Used" },
    { key: "pending", label: "Pending" },
    { key: "available", label: "Available", className: "font-semibold text-brand-600" },
  ];

  return (
    <section className="space-y-5">
      <PageHeader title="Leave Balance" subtitle="Entitlement, usage and availability per employee and leave type. Available = allocated + carry forward − used − pending.">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          {[-1, 0, 1].map((d) => { const y = new Date().getFullYear() + d; return <option key={y} value={y}>{y}</option>; })}
        </select>
        <button type="button" disabled={!rows.length} onClick={() => downloadCsv(`leave-balances-${year}.csv`, columns.map((c) => ({ key: c.key, label: c.label })), rows)} className={secondaryButton}>Export CSV</button>
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <Panel title={`Balances for ${year}`} subtitle="Allocation defaults to the leave type's days per year until HR sets an explicit allocation." padded={false}>
        <DataTable
          loading={balances.loading}
          error={balances.error}
          rowKey={(r) => `${r.employee_id}-${r.leave_type_id}`}
          rows={rows}
          empty="No balances. Add active employees and leave types first."
          columns={[...columns, ...(manager ? [{ key: "edit", label: "Action", render: (r) => <button type="button" onClick={() => setEditing({ ...r })} className={`${linkButton} text-brand-600`}>Set allocation</button> }] : [])]}
        />
      </Panel>
      {editing && (
        <Modal title={`Allocation — ${editing.employee_name} · ${editing.leave_type_name} (${year})`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <Notice notice={action.notice} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Allocated days" required><input type="number" step="0.5" min="0" max="366" required value={editing.allocated} onChange={(e) => setEditing({ ...editing, allocated: e.target.value })} className={inputClass} /></Field>
              <Field label="Carry forward days"><input type="number" step="0.5" min="0" max="366" value={editing.carry_forward} onChange={(e) => setEditing({ ...editing, carry_forward: e.target.value })} className={inputClass} /></Field>
            </div>
            <p className="text-xs text-slate-500">Used days ({editing.used}) are maintained automatically from approved leave.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={action.busy} className={primaryButton}>{action.busy ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

export function LeaveTypes({ companyId, role }) {
  return (
    <MasterCrud
      title="Leave Types"
      subtitle="Leave policies: annual entitlement, carry forward and paid/unpaid"
      companyId={companyId}
      role={role}
      path="/api/leave/types"
      listKey="leaveTypes"
      itemKey="leave type"
      columns={[
        { key: "name", label: "Leave type", className: "font-semibold" },
        { key: "days_per_year", label: "Days / year", render: (r) => Number(r.days_per_year) },
        { key: "carry_forward", label: "Carry forward", render: (r) => (r.carry_forward ? `Yes (max ${Number(r.max_carry_forward_days)})` : "No") },
        { key: "applicable_gender", label: "Applicable to" },
        { key: "is_paid", label: "Paid", render: (r) => (r.is_paid ? "Paid" : "Unpaid") },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      emptyForm={{ name: "", description: "", daysPerYear: "0", carryForward: false, maxCarryForwardDays: "0", applicableGender: "All", isPaid: true, status: "Active" }}
      toForm={(r) => ({ name: r.name, description: r.description || "", daysPerYear: String(Number(r.days_per_year)), carryForward: r.carry_forward, maxCarryForwardDays: String(Number(r.max_carry_forward_days || 0)), applicableGender: r.applicable_gender || "All", isPaid: r.is_paid, status: r.status })}
      toPayload={(f) => ({ ...f, daysPerYear: Number(f.daysPerYear), maxCarryForwardDays: Number(f.maxCarryForwardDays) })}
      fields={(f, set) => (
        <>
          <Field label="Name" required className="sm:col-span-2"><input required value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} className={inputClass} /></Field>
          <Field label="Days per year" required><input type="number" step="0.5" min="0" max="366" required value={f.daysPerYear} onChange={(e) => set({ ...f, daysPerYear: e.target.value })} className={inputClass} /></Field>
          <Field label="Applicable to"><select value={f.applicableGender} onChange={(e) => set({ ...f, applicableGender: e.target.value })} className={inputClass}>{["All", "Male", "Female", "Other"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isPaid} onChange={(e) => set({ ...f, isPaid: e.target.checked })} /> Paid leave</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.carryForward} onChange={(e) => set({ ...f, carryForward: e.target.checked })} /> Allow carry forward</label>
          {f.carryForward && <Field label="Max carry-forward days"><input type="number" step="0.5" min="0" max="366" value={f.maxCarryForwardDays} onChange={(e) => set({ ...f, maxCarryForwardDays: e.target.value })} className={inputClass} /></Field>}
          <Field label="Status"><select value={f.status} onChange={(e) => set({ ...f, status: e.target.value })} className={inputClass}><option>Active</option><option>Inactive</option></select></Field>
          <Field label="Description" className="sm:col-span-2"><textarea rows={2} value={f.description} onChange={(e) => set({ ...f, description: e.target.value })} className={inputClass} /></Field>
        </>
      )}
    />
  );
}

export function HolidayCalendar({ companyId, role }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const holidays = useApi(withQuery("/api/leave/holidays", { companyId, year }));
  const rows = holidays.data?.holidays || [];
  const byMonth = MONTH_NAMES.map((name, index) => ({ name, items: rows.filter((h) => Number(h.holiday_date.slice(5, 7)) === index + 1) })).filter((m) => m.items.length);
  const count = (type) => rows.filter((h) => h.type === type).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">Year{" "}
          <select value={year} onChange={(e) => setYear(e.target.value)} className="ml-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
            {[-1, 0, 1, 2].map((d) => { const y = String(new Date().getFullYear() + d); return <option key={y}>{y}</option>; })}
          </select>
        </label>
      </div>
      <StatGrid stats={[
        { label: `Holidays in ${year}`, value: holidays.loading ? "…" : rows.length },
        { label: "National", value: count("National") },
        { label: "Regional", value: count("Regional") },
        { label: "Company / restricted", value: count("Company") + count("Restricted") },
      ]} />
      {byMonth.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {byMonth.map((m) => (
            <div key={m.name} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-500">{m.name}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {m.items.map((h) => <li key={h.id}><strong>{Number(h.holiday_date.slice(8))}</strong> · {h.name}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      <HolidayList companyId={companyId} role={role} year={year} onChanged={holidays.reload} />
    </section>
  );
}

function HolidayList({ companyId, role, year, onChanged }) {
  return (
    <MasterCrud
      key={year}
      title="Holiday Calendar"
      subtitle="National, regional and company holidays for the selected year"
      companyId={companyId}
      role={role}
      path={`/api/leave/holidays`}
      query={{ year }}
      onChanged={onChanged}
      listKey="holidays"
      itemKey="holiday"
      columns={[
        { key: "holiday_date", label: "Date", render: (r) => formatDate(r.holiday_date) },
        { key: "day", label: "Day", render: (r) => new Date(`${r.holiday_date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long" }) },
        { key: "name", label: "Holiday", className: "font-semibold" },
        { key: "type", label: "Type" },
        { key: "location", label: "Applicable to" },
      ]}
      emptyForm={{ name: "", date: `${year}-01-01`, type: "National", location: "All Locations", description: "" }}
      toForm={(r) => ({ name: r.name, date: r.holiday_date, type: r.type, location: r.location || "", description: r.description || "" })}
      toPayload={(f) => f}
      fields={(f, set) => (
        <>
          <Field label="Holiday name" required className="sm:col-span-2"><input required value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} className={inputClass} /></Field>
          <Field label="Date" required><input type="date" required value={f.date} onChange={(e) => set({ ...f, date: e.target.value })} className={inputClass} /></Field>
          <Field label="Type"><select value={f.type} onChange={(e) => set({ ...f, type: e.target.value })} className={inputClass}>{["National", "Regional", "Company", "Restricted"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Applicable to" className="sm:col-span-2"><input value={f.location} onChange={(e) => set({ ...f, location: e.target.value })} className={inputClass} /></Field>
          <Field label="Description" className="sm:col-span-2"><textarea rows={2} value={f.description} onChange={(e) => set({ ...f, description: e.target.value })} className={inputClass} /></Field>
        </>
      )}
    />
  );
}
