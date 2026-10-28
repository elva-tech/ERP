import { useState } from "react";
import { sendJson, withQuery } from "../api";
import MasterCrud from "./MasterCrud";
import {
  MONTH_NAMES,
  approveButton,
  canManage,
  compactInputClass,
  downloadCsv,
  employeesInDepartment,
  formatDate,
  inputClass,
  linkButton,
  primaryButton, submitButton,
  rejectButton,
  secondaryButton,
  todayLocal,
  useAction,
  useApi,
} from "./helpers";
import {
  AwaitingApprover,
  DataTable,
  DepartmentFilter,
  DepartmentSelect,
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
          { key: "employee_name", label: "Employee", className: "font-semibold text-ink" },
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
            <span className="flex items-center gap-2">
              {manager && r.status === "Pending" && (isOwn(r) ? <AwaitingApprover /> : (
                <>
                  <button type="button" disabled={busy} onClick={() => onAction(r, "approve")} aria-label={`Approve leave for ${r.employee_name || "employee"}`} className={approveButton}>Approve</button>
                  <button type="button" disabled={busy} onClick={() => onAction(r, "reject")} aria-label={`Reject leave for ${r.employee_name || "employee"}`} className={rejectButton}>Reject</button>
                </>
              ))}
              {(r.status === "Pending" || r.status === "Approved") && (
                <button type="button" disabled={busy} onClick={() => onAction(r, "cancel")} className={`${linkButton} text-ink-soft`}>Cancel</button>
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

function ApplyLeaveModal({ companyId, role, employees, departments, onClose, onSaved }) {
  const manager = canManage(role);
  const types = useApi(withQuery("/api/leave/types", { companyId }));
  const [department, setDepartment] = useState("");
  const [form, setForm] = useState({ employeeId: "", leaveTypeId: "", fromDate: todayLocal(), toDate: todayLocal(), reason: "" });
  const departmentEmployees = employeesInDepartment(employees, department);
  const action = useAction();
  const activeTypes = (types.data?.leaveTypes || []).filter((t) => t.status === "Active");
  const balanceEmployee = manager ? form.employeeId : "own";
  const balances = useApi(
    balanceEmployee && form.leaveTypeId
      ? withQuery("/api/leave/balances", { companyId, year: form.fromDate.slice(0, 4), employeeId: manager ? form.employeeId : "" })
      : null
  );
  const balance = (balances.data?.balances || []).find((b) => String(b.leave_type_id) === String(form.leaveTypeId));

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
          {manager && (
            <>
              <Field label="Department">
                <DepartmentSelect
                  departments={departments}
                  value={department}
                  onChange={(value) => {
                    setDepartment(value);
                    if (!employeesInDepartment(employees, value).some((e) => String(e.id) === String(form.employeeId))) setForm({ ...form, employeeId: "" });
                  }}
                />
              </Field>
              <Field label="Employee" required><EmployeeSelect employees={departmentEmployees} value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} required /></Field>
            </>
          )}
          <Field label="Leave type" required className="sm:col-span-2">
            <select required value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} className={inputClass}>
              <option value="">{activeTypes.length ? "Select leave type" : "No leave types configured"}</option>
              {activeTypes.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_paid ? "" : " (unpaid)"}</option>)}
            </select>
            {balance && (
              <p className="mt-1.5 text-xs text-muted">
                Leave balance {balance.year}: <strong className="text-ink">{balance.available}</strong> day(s) available
                ({balance.allocated + balance.carry_forward} allocated, {balance.used} used, {balance.pending} pending)
              </p>
            )}
          </Field>
          <Field label="From" required><input type="date" required value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value, toDate: form.toDate < e.target.value ? e.target.value : form.toDate })} className={inputClass} /></Field>
          <Field label="To" required><input type="date" required min={form.fromDate} value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} className={inputClass} /></Field>
          <Field label="Reason" className="sm:col-span-2"><textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputClass} /></Field>
        </div>
        <p className="text-xs text-muted">{LEAVE_RULES_NOTE}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Submitting…" : "Submit"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function LeaveDashboard({ companyId, role, employees, departments, onNavigate }) {
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
        { label: "Pending requests", value: requests.loading ? "…" : pending.length, tone: "text-warning-strong" },
        { label: "Approved this month", value: requests.loading ? "…" : approvedThisMonth.length, tone: "text-success" },
      ]} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="On leave today" padded={false}>
          <DataTable rows={onLeaveToday} loading={requests.loading} empty="Nobody is on approved leave today." columns={requestColumns({}).slice(0, 5)} />
        </Panel>
        <Panel title="Pending requests" actions={canManage(role) && <button type="button" onClick={() => onNavigate("Leave Approvals")} className={secondaryButton}>Open approvals</button>} padded={false}>
          <DataTable rows={pending.slice(0, 10)} loading={requests.loading} empty="No pending requests." columns={requestColumns({}).slice(0, 5)} />
        </Panel>
      </div>
      {applying && <ApplyLeaveModal companyId={companyId} role={role} employees={employees} departments={departments} onClose={() => setApplying(false)} onSaved={() => { setApplying(false); requests.reload(); }} />}
    </section>
  );
}

export function LeaveRequests({ companyId, role, employees, departments, ownEmployeeId }) {
  const manager = canManage(role);
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [applying, setApplying] = useState(false);
  const requests = useApi(withQuery("/api/leave/requests", { companyId, status }));
  const actions = useLeaveActions(companyId, requests.reload);
  const allRows = requests.data?.requests || [];
  const rows = department ? allRows.filter((r) => r.department === department) : allRows;
  const count = (s) => rows.filter((r) => r.status === s).length;

  return (
    <section className="space-y-5">
      <PageHeader title="Leave Requests" subtitle={manager ? "All leave applications in the company" : "Your leave applications"}>
        {manager && <DepartmentFilter departments={departments} value={department} onChange={setDepartment} />}
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={compactInputClass}>
          <option value="">All statuses</option>
          {["Pending", "Approved", "Rejected", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button type="button" onClick={() => setApplying(true)} className={primaryButton}>+ New Leave Request</button>
      </PageHeader>
      <Notice notice={actions.notice} onClose={() => actions.setNotice(null)} />
      <StatGrid stats={[
        { label: "Shown", value: rows.length },
        { label: "Pending", value: count("Pending"), tone: "text-warning-strong" },
        { label: "Approved", value: count("Approved"), tone: "text-success" },
        { label: "Rejected", value: count("Rejected"), tone: "text-danger" },
      ]} />
      <Panel title="Requests" padded={false}>
        <DataTable loading={requests.loading} error={requests.error} rows={rows} empty="No leave requests." columns={requestColumns({ manager, onAction: actions.onAction, busy: actions.busy, ownEmployeeId })} />
      </Panel>
      {applying && <ApplyLeaveModal companyId={companyId} role={role} employees={employees} departments={departments} onClose={() => setApplying(false)} onSaved={() => { setApplying(false); requests.reload(); }} />}
      {actions.dialog}
    </section>
  );
}

const wideDecision = "inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold text-surface transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function LeaveApprovals({ companyId, role, employees = [], departments = [] }) {
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Pending");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const requests = useApi(canManage(role) ? withQuery("/api/leave/requests", { companyId }) : null);
  const actions = useLeaveActions(companyId, requests.reload);

  const employeeById = new Map(employees.map((employee) => [String(employee.id), employee]));
  const locations = [...new Set(employees.map((employee) => employee.workLocation).filter(Boolean))].sort();
  const allRows = requests.data?.requests || [];
  const rows = allRows.filter((request) => {
    if (department && request.department !== department) return false;
    if (status && request.status !== status) return false;
    const employee = employeeById.get(String(request.employee_id));
    if (location && employee?.workLocation !== location) return false;
    if (fromDate && request.to_date < fromDate) return false;
    if (toDate && request.from_date > toDate) return false;
    return true;
  });
  const selected = rows.find((request) => String(request.id) === selectedId) || rows[0] || null;

  const selectedEmployee = selected ? employeeById.get(String(selected.employee_id)) : null;
  const reportingManager = selectedEmployee?.reportingManagerId
    ? employeeById.get(String(selectedEmployee.reportingManagerId))
    : null;
  const balances = useApi(
    selected
      ? withQuery("/api/leave/balances", { companyId, year: selected.from_date.slice(0, 4), employeeId: selected.employee_id })
      : null
  );
  const balance = (balances.data?.balances || []).find((row) => String(row.leave_type_id) === String(selected?.leave_type_id));

  if (!canManage(role)) return <Notice notice={{ type: "info", message: "Leave approvals are available to HR managers and company admins." }} />;

  return (
    <section className="space-y-4">
      <PageHeader title="Leave Approvals" subtitle="Review and approve pending leave requests" />
      <Notice notice={actions.notice} onClose={() => actions.setNotice(null)} />

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Date range" className="uppercase tracking-wide text-muted">
          <span className="flex gap-2 normal-case">
            <input type="date" aria-label="From date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={inputClass} />
            <input type="date" aria-label="To date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={inputClass} />
          </span>
        </Field>
        <Field label="Department" className="uppercase tracking-wide text-muted">
          <DepartmentSelect departments={departments} value={department} onChange={setDepartment} />
        </Field>
        <Field label="Location" className="uppercase tracking-wide text-muted">
          <select value={location} onChange={(event) => setLocation(event.target.value)} className={inputClass}>
            <option value="">All locations</option>
            {locations.map((name) => <option key={name}>{name}</option>)}
          </select>
        </Field>
        <Field label="Status" className="uppercase tracking-wide text-muted">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
            <option value="">All statuses</option>
            {["Pending", "Approved", "Rejected", "Cancelled"].map((name) => <option key={name}>{name}</option>)}
          </select>
        </Field>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Review queue</p>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,0.9fr)]">
        <Panel
          title="Approval Queue"
          actions={<span className="text-xs font-medium text-muted">{requests.loading ? "Loading…" : `${rows.length} ${status ? status.toLowerCase() : "matching"} request${rows.length === 1 ? "" : "s"}`}</span>}
          padded={false}
        >
          {requests.error ? (
            <p role="alert" className="px-4 py-8 text-center text-sm text-danger">{requests.error}</p>
          ) : requests.loading ? (
            <p role="status" className="px-4 py-8 text-center text-sm text-muted">Loading leave requests…</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No leave requests match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-line bg-surface-muted text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  <tr>
                    {["Employee", "Department", "Leave type", "From", "To", "Days", "Reason", "Applied on"].map((label) => (
                      <th key={label} scope="col" className="whitespace-nowrap px-3 py-2.5">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((request) => {
                    const active = String(request.id) === String(selected?.id);
                    return (
                      <tr
                        key={request.id}
                        onClick={() => setSelectedId(String(request.id))}
                        className={`cursor-pointer border-b border-line-soft ${active ? "bg-info-soft" : "hover:bg-surface-muted"}`}
                      >
                        <td className="px-3 py-2.5 font-semibold text-ink">{request.employee_name}</td>
                        <td className="px-3 py-2.5 text-ink-soft">{request.department || "—"}</td>
                        <td className="px-3 py-2.5">{request.leave_type_name}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{formatDate(request.from_date)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{formatDate(request.to_date)}</td>
                        <td className="px-3 py-2.5">{request.days}</td>
                        <td className="max-w-40 truncate px-3 py-2.5 text-ink-soft" title={request.reason || ""}>{request.reason || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{formatDate(request.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Leave Request Detail"
          actions={selected ? <StatusBadge status={selected.status} /> : null}
        >
          {!selected ? (
            <p className="py-8 text-center text-sm text-muted">Select a request from the approval queue.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-bold text-ink">{selected.employee_name}</p>
                <p className="text-xs text-muted">{selectedEmployee?.designation || "Employee"}{selected.employee_code ? ` · ${selected.employee_code}` : ""}</p>
              </div>
              <dl className="space-y-2.5 text-[13px]">
                {[
                  ["Employee", `${selected.employee_name}${selected.employee_code ? ` (${selected.employee_code})` : ""}`],
                  ["Department", selected.department || "—"],
                  ["Leave type", selected.leave_type_name],
                  ["Dates", `${formatDate(selected.from_date)} – ${formatDate(selected.to_date)}`],
                  ["Days", `${selected.days} day${Number(selected.days) === 1 ? "" : "s"}`],
                  ["Reason", selected.reason || "—"],
                  ["Leave balance", balances.loading ? "Loading…" : balance ? `${balance.available} days available` : "Not recorded"],
                  ["Reporting manager", reportingManager?.name || "Not recorded"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4">
                    <dt className="text-muted">{label}</dt>
                    <dd className="max-w-[60%] text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              {selected.status === "Pending" && (
                <div className="space-y-2 border-t border-line pt-4">
                  <button type="button" disabled={actions.busy} onClick={() => actions.onAction(selected, "approve")} className={`${wideDecision} bg-success hover:bg-success/90`}>Approve Request</button>
                  <button type="button" disabled={actions.busy} onClick={() => actions.onAction(selected, "reject")} className={`${wideDecision} bg-danger hover:bg-danger/90`}>Reject Request</button>
                </div>
              )}
              {(selected.status === "Pending" || selected.status === "Approved") && (
                <button type="button" disabled={actions.busy} onClick={() => actions.onAction(selected, "cancel")} className={`${linkButton} block text-ink-soft`}>Cancel request</button>
              )}
              {selected.review_note && <p className="text-xs text-muted">Review note: {selected.review_note}</p>}
            </div>
          )}
        </Panel>
      </div>
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
    { key: "allocated", label: "Allocated", render: (r) => <>{r.allocated}{r.is_default_allocation && <span className="ml-1 text-[10px] text-placeholder">(policy default)</span>}</> },
    { key: "carry_forward", label: "Carry forward" },
    { key: "used", label: "Used" },
    { key: "pending", label: "Pending" },
    { key: "available", label: "Available", className: "font-semibold text-navy" },
  ];

  return (
    <section className="space-y-5">
      <PageHeader title="Leave Balance" subtitle="Entitlement, usage and availability per employee and leave type. Available = allocated + carry forward − used − pending.">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-md border border-field-line bg-surface px-3 py-2 text-sm">
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
          columns={[...columns, ...(manager ? [{ key: "edit", label: "Action", render: (r) => <button type="button" onClick={() => setEditing({ ...r })} className={`${linkButton} text-link`}>Set allocation</button> }] : [])]}
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
            <p className="text-xs text-muted">Used days ({editing.used}) are maintained automatically from approved leave.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Saving…" : "Save"}</button>
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
        <label className="text-sm text-ink-soft">Year{" "}
          <select value={year} onChange={(e) => setYear(e.target.value)} className="ml-2 rounded-md border border-field-line bg-surface px-3 py-2 text-sm">
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
            <div key={m.name} className="rounded-lg border border-line bg-surface p-4">
              <p className="text-xs font-bold uppercase text-muted">{m.name}</p>
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
