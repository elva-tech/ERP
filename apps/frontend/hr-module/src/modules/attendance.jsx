import { useState } from "react";
import { Download, Eye, Printer, ShieldCheck } from "lucide-react";
import { sendJson, withQuery } from "../api";
import {
  canManage,
  compactInputClass,
  currentMonth,
  downloadCsv,
  employeesInDepartment,
  formatDate,
  formatMinutes,
  formatMoney,
  inputClass,
  linkButton,
  monthBounds,
  primaryButton, submitButton,
  slateButton,
  secondaryButton,
  todayLocal,
  useAction,
  useApi,
} from "./helpers";
import MasterCrud from "./MasterCrud";
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

const STATUSES = ["Present", "Absent", "Late", "Half Day", "On Duty", "On Leave", "Holiday", "Missing Punch", "Compensation"];
const STATUS_CODES = { Present: "P", Absent: "A", Late: "L", "Half Day": "HD", "On Duty": "OD", "On Leave": "OL", Holiday: "H", "Missing Punch": "MP", Compensation: "CO" };
const time = (value) => (value ? String(value).slice(0, 5) : "—");

function recordColumns({ showDate = true, showEmployee = true } = {}) {
  return [
    ...(showDate ? [{ key: "attendance_date", label: "Date", render: (r) => formatDate(r.attendance_date) }] : []),
    ...(showEmployee
      ? [
          { key: "employee_name", label: "Employee", className: "font-semibold text-ink" },
          { key: "employee_code", label: "Code" },
          { key: "department", label: "Department" },
        ]
      : []),
    { key: "shift_name", label: "Shift" },
    { key: "check_in_time", label: "Check In", render: (r) => r.check_in_time || "—" },
    { key: "check_out_time", label: "Check Out", render: (r) => r.check_out_time || "—" },
    { key: "working_minutes", label: "Worked", render: (r) => formatMinutes(r.working_minutes) },
    { key: "overtime_minutes", label: "Overtime", render: (r) => (r.overtime_minutes ? formatMinutes(r.overtime_minutes) : "—") },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className="flex items-center gap-2">
          <StatusBadge status={r.status} />
          {r.is_regularized && <span className="text-[10px] font-semibold text-info">Regularized</span>}
        </span>
      ),
    },
  ];
}

function summarize(summary = {}) {
  const get = (key) => summary[key] || 0;
  return {
    present: get("Present") + get("Late"),
    absent: get("Absent"),
    late: get("Late"),
    halfDay: get("Half Day"),
    missing: get("Missing Punch"),
    onLeave: get("On Leave"),
    onDuty: get("On Duty"),
    holiday: get("Holiday"),
    compensation: get("Compensation"),
    total: Object.values(summary).reduce((s, v) => s + v, 0),
  };
}

export function AttendanceDashboard({ companyId, employees, departments = [], role, onNavigate }) {
  const [date, setDate] = useState(todayLocal());
  const [department, setDepartment] = useState("");
  const manager = canManage(role);
  const records = useApi(withQuery("/api/attendance/records", { companyId, date, department: manager ? department : "", limit: 1000 }));
  const devices = useApi(manager ? withQuery("/api/attendance/devices", { companyId }) : null);
  const pending = useApi(withQuery("/api/attendance/regularizations", { companyId, status: "Pending" }));

  const activeCount = employeesInDepartment(employees, department).filter((e) => e.status === "Active").length;
  const s = summarize(records.data?.summary);
  const marked = s.total;
  const attendancePct = marked ? `${Math.round(((s.present + s.onDuty + s.halfDay * 0.5) / marked) * 100)}%` : "—";

  function refresh() {
    records.reload();
    pending.reload();
    devices.reload?.();
  }
  const rows = records.data?.records || [];

  const byDepartment = Object.values(
    rows.reduce((acc, r) => {
      const d = (acc[r.department] ||= { department: r.department, total: 0, present: 0, absent: 0, late: 0 });
      d.total += 1;
      if (r.status === "Present" || r.status === "Late") d.present += 1;
      if (r.status === "Absent") d.absent += 1;
      if (r.status === "Late") d.late += 1;
      return acc;
    }, {})
  );

  const deviceRows = devices.data?.devices || [];
  const countDevices = (status) => deviceRows.filter((d) => d.status === status).length;

  return (
    <section className="space-y-5">
      <PageHeader title="Attendance Dashboard" subtitle="Daily attendance summary from recorded attendance">
        {manager && <DepartmentFilter departments={departments} value={department} onChange={setDepartment} />}
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Attendance date" className={compactInputClass} />
        <button type="button" onClick={refresh} className={secondaryButton}>↻ Refresh</button>
      </PageHeader>
      {records.error && <Notice notice={{ type: "error", message: records.error }} />}
      {!records.loading && !records.error && marked === 0 && (
        <Notice notice={{ type: "info", message: `No attendance has been recorded for ${formatDate(date)}${department ? ` in ${department}` : ""}. Counts stay at zero until attendance is marked or the day's biometric punches are processed in Daily Attendance.` }} />
      )}
      <StatGrid
        stats={[
          { label: "Active employees", value: activeCount },
          { label: "Marked", value: records.loading ? "…" : marked, note: `${Math.max(activeCount - marked, 0)} not marked` },
          { label: "Present (incl. late)", value: s.present, tone: "text-success" },
          { label: "Absent", value: s.absent, tone: "text-danger" },
          { label: "Late", value: s.late, tone: "text-warning-strong" },
          { label: "Half day", value: s.halfDay, tone: "text-warning-strong" },
          { label: "On duty", value: s.onDuty, tone: "text-info" },
          { label: "Holiday", value: s.holiday },
          { label: "Missing punch", value: s.missing, tone: "text-danger" },
          { label: "Compensation", value: s.compensation },
          { label: "On leave", value: s.onLeave },
          { label: "Overtime", value: formatMinutes(records.data?.overtimeMinutes ?? 0) },
          { label: "Attendance % (of marked)", value: attendancePct, tone: "text-success" },
          { label: "Pending regularizations", value: pending.data?.count ?? "—" },
          ...(canManage(role) ? [{ label: "Devices online", value: devices.data ? `${countDevices("Online")} / ${deviceRows.length}` : "—" }] : []),
        ]}
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Department attendance" padded={false}>
          <DataTable
            rowKey={(r) => r.department}
            loading={records.loading}
            rows={byDepartment}
            empty="No attendance recorded for this date."
            columns={[
              { key: "department", label: "Department", className: "font-semibold" },
              { key: "total", label: "Marked" },
              { key: "present", label: "Present" },
              { key: "absent", label: "Absent" },
              { key: "late", label: "Late" },
              { key: "pct", label: "Attendance %", render: (r) => `${Math.round((r.present / r.total) * 100)}%` },
            ]}
          />
        </Panel>
        <Panel title="Attention required">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-muted">Missing punches</span><strong>{s.missing}</strong></li>
            <li className="flex justify-between"><span className="text-muted">Late arrivals</span><strong>{s.late}</strong></li>
            <li className="flex justify-between"><span className="text-muted">Pending regularizations</span><strong>{pending.data?.count ?? "—"}</strong></li>
            {canManage(role) && (
              <li className="flex justify-between"><span className="text-muted">Devices offline / maintenance</span><strong>{countDevices("Offline") + countDevices("Maintenance")}</strong></li>
            )}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate("Attendance Exceptions")} className={secondaryButton}>Review exceptions</button>
            <button type="button" onClick={() => onNavigate("Attendance Regularization")} className={secondaryButton}>Regularization</button>
            <button type="button" onClick={() => onNavigate("Daily Attendance")} className={primaryButton}>Daily attendance</button>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function MarkAttendanceModal({ companyId, employee, date, record, shifts, onClose, onSaved }) {
  const [form, setForm] = useState({
    status: record?.status || "",
    checkIn: record?.check_in_time || "",
    checkOut: record?.check_out_time || "",
    shiftId: record?.shift_id ? String(record.shift_id) : "",
  });
  const action = useAction();

  async function submit(event) {
    event.preventDefault();
    const saved = await action.run(() =>
      sendJson("POST", "/api/attendance/records", {
        companyId,
        employeeId: employee.id,
        date,
        status: form.status || undefined,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        shiftId: form.shiftId || undefined,
      })
    );
    if (saved) onSaved();
  }

  return (
    <Modal title={`Mark attendance — ${employee.name} (${formatDate(date)})`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Notice notice={action.notice} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Check in"><input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className={inputClass} /></Field>
          <Field label="Check out"><input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className={inputClass} /></Field>
          <Field label="Shift">
            <select value={form.shiftId} onChange={(e) => setForm({ ...form, shiftId: e.target.value })} className={inputClass}>
              <option value="">From roster (if assigned)</option>
              {shifts.filter((s) => s.status === "Active").map((s) => <option key={s.id} value={s.id}>{s.name} ({time(s.start_time)}–{time(s.end_time)})</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              <option value="">Derive from times and shift</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <p className="text-xs text-muted">Late and overtime are calculated from the shift's start time, grace minutes and overtime threshold.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Saving…" : "Save attendance"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function DailyAttendance({ companyId, role, employees, departments: departmentRecords = [] }) {
  const [date, setDate] = useState(todayLocal());
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [marking, setMarking] = useState(null);
  const [importing, setImporting] = useState(false);
  const records = useApi(withQuery("/api/attendance/records", { companyId, date, limit: 1000 }));
  const shifts = useApi(withQuery("/api/attendance/shifts", { companyId }));
  const manager = canManage(role);
  const action = useAction();

  async function processPunches() {
    const result = await action.run(() => sendJson("POST", "/api/attendance/punches/process", { companyId, date }));
    if (result) records.reload();
  }

  const byEmployee = new Map((records.data?.records || []).map((r) => [String(r.employee_id), r]));
  const base = manager ? employees.filter((e) => e.status === "Active" || byEmployee.has(String(e.id))) : [];
  const rows = (manager ? base.map((e) => ({ employee: e, record: byEmployee.get(String(e.id)) })) : (records.data?.records || []).map((r) => ({ employee: { id: String(r.employee_id), name: r.employee_name, employeeCode: r.employee_code, department: r.department }, record: r })))
    .filter((row) => !department || row.employee.department === department)
    .filter((row) => !status || (status === "Not marked" ? !row.record : row.record?.status === status));
  const s = summarize(records.data?.summary);

  return (
    <section className="space-y-5">
      <PageHeader title="Daily Attendance" subtitle="Review and mark attendance for a day">
        {manager && (
          <>
            <button type="button" onClick={() => setImporting(true)} className={secondaryButton}>Import punches</button>
            <button type="button" disabled={action.busy} onClick={processPunches} className={secondaryButton}>
              {action.busy ? "Processing…" : `Process punches for ${formatDate(date)}`}
            </button>
          </>
        )}
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      {manager && <p className="text-xs text-muted">Attendance is created when HR marks it here or processes the day's biometric punches; it is not generated automatically. Processing uses each employee's first punch as check-in and last punch as check-out, and does not overwrite regularized days.</p>}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-4">
        <Field label="Date"><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputClass} /></Field>
        {manager && <Field label="Department"><DepartmentSelect departments={departmentRecords} value={department} onChange={setDepartment} /></Field>}
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="">All statuses</option>
            {manager && <option>Not marked</option>}
            {STATUSES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <div className="flex items-end"><button type="button" onClick={records.reload} className={`${secondaryButton} w-full`}>↻ Refresh</button></div>
      </div>
      <StatGrid stats={[
        { label: "Marked", value: s.total },
        { label: "Present", value: s.present, tone: "text-success" },
        { label: "Absent", value: s.absent, tone: "text-danger" },
        { label: "Exceptions", value: s.late + s.missing + s.halfDay, tone: "text-warning-strong" },
      ]} />
      <Panel title={`Attendance for ${formatDate(date)}`} padded={false}>
        <DataTable
          loading={records.loading}
          error={records.error}
          rowKey={(row) => row.employee.id}
          rows={rows}
          empty={manager ? "No employees match these filters." : "No attendance recorded for you on this date."}
          columns={[
            { key: "name", label: "Employee", className: "font-semibold text-ink", render: (row) => row.employee.name },
            { key: "code", label: "Code", render: (row) => row.employee.employeeCode || "—" },
            { key: "department", label: "Department", render: (row) => row.employee.department },
            { key: "shift", label: "Shift", render: (row) => row.record?.shift_name || "—" },
            { key: "in", label: "Check In", render: (row) => row.record?.check_in_time || "—" },
            { key: "out", label: "Check Out", render: (row) => row.record?.check_out_time || "—" },
            { key: "worked", label: "Worked", render: (row) => formatMinutes(row.record?.working_minutes) },
            { key: "status", label: "Status", render: (row) => (row.record ? <StatusBadge status={row.record.status} /> : <span className="text-xs text-placeholder">Not marked</span>) },
            ...(manager ? [{ key: "action", label: "Action", render: (row) => <button type="button" onClick={() => setMarking(row)} className={`${linkButton} text-link`}>{row.record ? "Edit" : "Mark"}</button> }] : []),
          ]}
        />
      </Panel>
      {marking && (
        <MarkAttendanceModal
          companyId={companyId}
          employee={marking.employee}
          record={marking.record}
          date={date}
          shifts={shifts.data?.shifts || []}
          onClose={() => setMarking(null)}
          onSaved={() => { setMarking(null); records.reload(); }}
        />
      )}
      {importing && (
        <ImportPunchesModal
          companyId={companyId}
          onClose={() => setImporting(false)}
          onImported={(message) => { setImporting(false); action.setNotice({ type: "success", message: message || "Punches imported." }); }}
        />
      )}
    </section>
  );
}

export function MonthlyAttendance({ companyId, role, employees }) {
  const [month, setMonth] = useState(currentMonth());
  const bounds = monthBounds(month);
  const records = useApi(withQuery("/api/attendance/records", { companyId, from: bounds.from, to: bounds.to, limit: 1000 }));
  const rows = records.data?.records || [];
  const map = new Map(rows.map((r) => [`${r.employee_id}|${r.attendance_date}`, r.status]));
  const people = canManage(role)
    ? employees.filter((e) => e.status === "Active" || rows.some((r) => String(r.employee_id) === String(e.id)))
    : [...new Map(rows.map((r) => [String(r.employee_id), { id: String(r.employee_id), name: r.employee_name, employeeCode: r.employee_code }])).values()];
  const days = Array.from({ length: bounds.days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);

  return (
    <section className="space-y-5">
      <PageHeader title="Monthly Attendance" subtitle="Day-by-day attendance status for the month">
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className={compactInputClass} />
      </PageHeader>
      <p className="text-xs text-muted">Legend: {Object.entries(STATUS_CODES).map(([k, v]) => `${v} = ${k}`).join(" · ")} · blank = not marked</p>
      {records.data?.count >= 1000 && <Notice notice={{ type: "info", message: "Showing the first 1000 records for this month." }} />}
      <Panel title={`${month} attendance register`} padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11.5px] font-semibold text-muted">
              <tr>
                <th className="sticky left-0 bg-surface-muted px-3 py-3">Employee</th>
                {days.map((d) => <th key={d} className="px-1.5 py-3 text-center">{Number(d.slice(8))}</th>)}
                <th className="px-3 py-3">P</th><th className="px-3 py-3">A</th><th className="px-3 py-3">L</th>
              </tr>
            </thead>
            <tbody>
              {records.loading ? (
                <tr><td colSpan={days.length + 4} className="px-4 py-10 text-center text-muted">Loading…</td></tr>
              ) : people.length === 0 ? (
                <tr><td colSpan={days.length + 4} className="px-4 py-10 text-center text-muted">No attendance records for this month.</td></tr>
              ) : people.map((e) => {
                const statuses = days.map((d) => map.get(`${e.id}|${d}`));
                const count = (fn) => statuses.filter(fn).length;
                return (
                  <tr key={e.id} className="border-t border-line">
                    <td className="sticky left-0 bg-surface px-3 py-2 font-semibold">{e.name}</td>
                    {statuses.map((st, i) => (
                      <td key={days[i]} title={st || "Not marked"} className={`px-1.5 py-2 text-center ${st === "Absent" || st === "Missing Punch" ? "text-danger" : st === "Late" ? "text-warning-strong" : "text-ink-soft"}`}>{st ? STATUS_CODES[st] : ""}</td>
                    ))}
                    <td className="px-3 py-2">{count((x) => x === "Present" || x === "Late")}</td>
                    <td className="px-3 py-2">{count((x) => x === "Absent")}</td>
                    <td className="px-3 py-2">{count((x) => x === "Late")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

export function AttendanceExceptions({ companyId, role, departments = [] }) {
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const manager = canManage(role);
  const bounds = monthBounds(month);
  const records = useApi(withQuery("/api/attendance/records", { companyId, from: bounds.from, to: bounds.to, exceptions: status ? "" : "1", status, department: manager ? department : "", limit: 1000 }));
  const s = summarize(records.data?.summary);

  return (
    <section className="space-y-5">
      <PageHeader title="Attendance Exceptions" subtitle="Late arrivals, missing punches, absences and half days">
        {manager && <DepartmentFilter departments={departments} value={department} onChange={setDepartment} />}
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className={compactInputClass} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by exception" className={compactInputClass}>
          <option value="">All exceptions</option>
          {["Late", "Missing Punch", "Absent", "Half Day"].map((x) => <option key={x}>{x}</option>)}
        </select>
      </PageHeader>
      <StatGrid stats={[
        { label: "Late", value: s.late, tone: "text-warning-strong" },
        { label: "Missing punch", value: s.missing, tone: "text-danger" },
        { label: "Absent", value: s.absent, tone: "text-danger" },
        { label: "Half day", value: s.halfDay, tone: "text-warning-strong" },
      ]} />
      <Panel title="Exception records" subtitle="Employees can raise a regularization request for incorrect records." padded={false}>
        <DataTable loading={records.loading} error={records.error} rows={records.data?.records || []} columns={recordColumns()} empty="No exceptions for this period." />
      </Panel>
    </section>
  );
}

export function EmployeeAttendance({ companyId, role, employees, departments = [] }) {
  const manager = canManage(role);
  const [department, setDepartment] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const bounds = monthBounds(month);
  const path = manager && !employeeId ? null : withQuery("/api/attendance/records", { companyId, employeeId, from: bounds.from, to: bounds.to, limit: 1000 });
  const records = useApi(path);
  const s = summarize(records.data?.summary);

  return (
    <section className="space-y-5">
      <PageHeader title="Employee Attendance" subtitle="Attendance history for one employee" />
      <div className={`grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 ${manager ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {manager && (
          <>
            <Field label="Department">
              <DepartmentSelect
                departments={departments}
                value={department}
                onChange={(next) => {
                  setDepartment(next);
                  if (!employeesInDepartment(employees, next).some((e) => String(e.id) === String(employeeId))) setEmployeeId("");
                }}
              />
            </Field>
            <Field label="Employee"><EmployeeSelect employees={employeesInDepartment(employees, department)} value={employeeId} onChange={setEmployeeId} activeOnly={false} /></Field>
          </>
        )}
        <Field label="Month"><input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className={inputClass} /></Field>
      </div>
      {manager && !employeeId ? (
        <Notice notice={{ type: "info", message: "Select an employee to view their attendance." }} />
      ) : (
        <>
          <StatGrid stats={[
            { label: "Days marked", value: s.total },
            { label: "Present", value: s.present, tone: "text-success" },
            { label: "Absent", value: s.absent, tone: "text-danger" },
            { label: "Overtime", value: formatMinutes(records.data?.overtimeMinutes ?? 0) },
          ]} />
          <Panel title="Records" padded={false}>
            <DataTable loading={records.loading} error={records.error} rows={records.data?.records || []} columns={recordColumns({ showEmployee: false })} empty="No attendance records for this month." />
          </Panel>
        </>
      )}
    </section>
  );
}

function parsePunchCsv(text, deviceId) {
  const punches = [];
  const errors = [];
  text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, index) => {
    if (index === 0 && /device|user|time/i.test(line)) return;
    const [deviceUserId, punchTime, punchType] = line.split(",").map((p) => p.trim());
    if (!deviceUserId || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(punchTime || "")) {
      errors.push(`Line ${index + 1}: expected "employeeCode,YYYY-MM-DD HH:MM[,In|Out]".`);
      return;
    }
    punches.push({ deviceUserId, punchTime: punchTime.replace(" ", "T"), punchType: punchType || undefined, deviceId: deviceId || undefined });
  });
  return { punches, errors };
}

function ImportPunchesModal({ companyId, onClose, onImported }) {
  const [csv, setCsv] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const devices = useApi(withQuery("/api/attendance/devices", { companyId }));
  const action = useAction();

  async function importPunches(event) {
    event.preventDefault();
    const parsed = parsePunchCsv(csv, deviceId);
    if (parsed.errors.length || parsed.punches.length === 0) {
      action.setNotice({ type: "error", message: parsed.errors.slice(0, 5).join(" ") || "Paste at least one punch line." });
      return;
    }
    const result = await action.run(() => sendJson("POST", "/api/attendance/punches", { companyId, punches: parsed.punches }));
    if (result) onImported(result.message);
  }

  return (
    <Modal title="Import punches" onClose={onClose}>
      <form onSubmit={importPunches} className="space-y-4">
        <Notice notice={action.notice} />
        <p className="text-sm text-ink-soft">Paste one punch per line as <code>employeeCode,YYYY-MM-DD HH:MM,In|Out</code>. Codes are matched to employee codes; unmatched rows are stored for review.</p>
        <Field label="Device (optional)">
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={inputClass}>
            <option value="">No device</option>
            {(devices.data?.devices || []).map((d) => <option key={d.id} value={d.id}>{d.device_name}</option>)}
          </select>
        </Field>
        <Field label="Punch data" required><textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} className={inputClass} /></Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Importing…" : "Import"}</button>
        </div>
      </form>
    </Modal>
  );
}

const SYNC_STATUSES = ["Matched", "Unmatched"];
const punchStatus = (punch) => (punch.employee_id ? "Matched" : "Unmatched");
const clockLabel = (value) => {
  const match = String(value || "").match(/(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return value ? String(value) : "—";
  const hour = Number(match[1]);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
};
const PUNCH_EXPORT_COLUMNS = [
  { key: "employee_name", label: "Employee", value: (r) => r.employee_name || "" },
  { key: "employee_code", label: "Employee ID", value: (r) => r.employee_code || r.device_user_id || "" },
  { key: "device_name", label: "Device", value: (r) => r.device_name || "" },
  { key: "device_location", label: "Location", value: (r) => r.device_location || "" },
  { key: "punch_local_time", label: "Timestamp" },
  { key: "punch_type", label: "Punch Type", value: (r) => r.punch_type || "" },
  { key: "received_local_time", label: "Sync Time" },
  { key: "status", label: "Status", value: punchStatus },
];

export function RawPunches({ companyId, role, employees = [] }) {
  const [date, setDate] = useState(todayLocal());
  const [employeeId, setEmployeeId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [location, setLocation] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [exportNotice, setExportNotice] = useState(null);
  const manager = canManage(role);
  const punches = useApi(manager ? withQuery("/api/attendance/punches", { companyId, date, employeeId, unmatched: syncStatus === "Unmatched" ? "1" : "" }) : null);
  const devices = useApi(manager ? withQuery("/api/attendance/devices", { companyId }) : null);

  if (!manager) {
    return <Notice notice={{ type: "info", message: "Raw device punches are available to HR managers and company admins." }} />;
  }

  const deviceRows = devices.data?.devices || [];
  const locations = [...new Set(deviceRows.map((d) => d.location).filter(Boolean))].sort();
  const rows = (punches.data?.punches || [])
    .filter((r) => !deviceId || String(r.device_id) === deviceId)
    .filter((r) => !location || r.device_location === location)
    .filter((r) => !syncStatus || punchStatus(r) === syncStatus);
  const employeeLabel = employees.find((employee) => String(employee.id) === employeeId)?.name || "All employees";
  const deviceLabel = deviceRows.find((device) => String(device.id) === deviceId)?.device_name || "All devices";

  function exportPunches() {
    if (punches.error) {
      setExportNotice({ type: "error", message: punches.error });
      return;
    }
    if (!rows.length) {
      setExportNotice({ type: "info", message: "No punches match these filters, so nothing was exported." });
      return;
    }
    setExportNotice(null);
    downloadCsv(`raw-biometric-punches-${date}.csv`, PUNCH_EXPORT_COLUMNS, rows);
  }

  return (
    <section className="space-y-4">
      <div className="print-only">
        <h2 className="text-lg font-bold text-ink">Raw Biometric Punches</h2>
        <p className="mt-1 text-sm text-ink-soft">Immutable record of biometric events from devices</p>
        <p className="mt-2 text-sm text-ink">Date: {formatDate(date)} · Employee: {employeeLabel} · Device: {deviceLabel} · Location: {location || "All locations"} · Sync status: {syncStatus || "All statuses"}</p>
        <p className="mt-2 text-sm text-ink">Raw biometric records are retained as an audit trail.</p>
      </div>
      <div className="no-print">
        <PageHeader title="Raw Biometric Punches" subtitle="Immutable record of biometric events from devices" />
      </div>
      <div className="no-print"><Notice notice={exportNotice} onClose={() => setExportNotice(null)} /></div>
      {punches.data?.count >= 5000 && <Notice notice={{ type: "info", message: "This date has at least 5,000 punches. The list and export include the first 5,000 returned by the punches API." }} />}
      <div className="no-print grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Date"><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Employee"><EmployeeSelect employees={employees} value={employeeId} onChange={setEmployeeId} includeAll activeOnly={false} /></Field>
        <Field label="Device">
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={inputClass}>
            <option value="">All devices</option>
            {deviceRows.map((d) => <option key={d.id} value={String(d.id)}>{d.device_name}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Sync status">
          <select value={syncStatus} onChange={(e) => setSyncStatus(e.target.value)} className={inputClass}>
            <option value="">All statuses</option>
            {SYNC_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
        <p className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Raw biometric records are retained as an audit trail.</p>
        <span className="no-print flex gap-2">
          <button type="button" onClick={() => window.print()} className={secondaryButton}><Printer size={16} aria-hidden="true" /> Print</button>
          <button type="button" onClick={exportPunches} className={slateButton}><Download size={16} aria-hidden="true" /> Export</button>
        </span>
      </div>
      <Panel title="Biometric event log" padded={false}>
        <DataTable
          loading={punches.loading}
          error={punches.error}
          rows={rows}
          empty="No punches recorded for these filters."
          columns={[
            { key: "employee_name", label: "Employee", className: "font-semibold text-ink", render: (r) => r.employee_name || <span className="text-danger">Unknown</span> },
            { key: "employee_code", label: "Employee ID", render: (r) => r.employee_code || r.device_user_id || "—" },
            { key: "device_name", label: "Device", wrap: true, render: (r) => (r.device_name ? <span>{r.device_name}{r.device_location && <span className="block text-xs text-muted">{r.device_location}</span>}</span> : "—") },
            { key: "punch_local_time", label: "Timestamp" },
            { key: "punch_type", label: "Punch Type", render: (r) => r.punch_type || "—" },
            { key: "received_local_time", label: "Sync Time", render: (r) => r.received_local_time || "—" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={punchStatus(r)} /> },
          ]}
        />
      </Panel>
    </section>
  );
}

const wideDecision = "inline-flex h-9 items-center justify-center rounded-md px-4 text-xs font-semibold text-surface transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function AttendanceRegularization({ companyId, role, employees, departments = [], ownEmployeeId }) {
  const manager = canManage(role);
  const [status, setStatus] = useState("Pending");
  const [showForm, setShowForm] = useState(false);
  const [department, setDepartment] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({ employeeId: "", date: todayLocal(), checkIn: "09:00", checkOut: "", reason: "" });
  const list = useApi(withQuery("/api/attendance/regularizations", { companyId }));
  const action = useAction();
  const confirm = useConfirm();
  const rows = (list.data?.regularizations || []).filter((row) => (
    (!status || row.status === status) &&
    (!department || row.department === department) &&
    (!attendanceDate || row.attendance_date === attendanceDate)
  ));
  const selected = rows.find((row) => String(row.id) === selectedId) || rows[0] || null;
  const punches = useApi(
    manager && selected
      ? withQuery("/api/attendance/punches", { companyId, date: selected.attendance_date, employeeId: selected.employee_id })
      : null
  );

  async function submit(event) {
    event.preventDefault();
    const result = await action.run(() => sendJson("POST", "/api/attendance/regularizations", { companyId, ...form, employeeId: manager ? form.employeeId : undefined, checkOut: form.checkOut || undefined }));
    if (result) { setShowForm(false); list.reload(); }
  }

  async function review(id, verb) {
    let note = "";
    if (verb === "reject") {
      note = await confirm.ask({ title: "Reject regularization", message: "Reject this attendance regularization request?", confirmLabel: "Reject", danger: true, input: { label: "Reason for rejection (optional)" } });
      if (note === null) return;
    }
    const result = await action.run(() => sendJson("PATCH", withQuery(`/api/attendance/regularizations/${id}`, { companyId }), { action: verb, reviewNote: note.trim() || undefined }));
    if (result) list.reload();
  }

  const punchRows = punches.data?.punches || [];
  const originalIn = punchRows.find((punch) => punch.punch_type === "In") || punchRows[0];
  const originalOut = [...punchRows].reverse().find((punch) => punch.punch_type === "Out") || (punchRows.length > 1 ? punchRows[punchRows.length - 1] : null);
  const ownRequest = !manager && selected && ownEmployeeId && String(selected.employee_id) === String(ownEmployeeId);
  const canReview = manager && selected?.status === "Pending";
  const selectedEmployee = selected ? employees.find((employee) => String(employee.id) === String(selected.employee_id)) : null;
  const previousValue = !manager ? "Available to HR managers" : punches.loading ? "Loading…" : punches.error ? punches.error : `In ${originalIn ? clockLabel(originalIn.punch_local_time) : "Missing"}, Out ${originalOut ? clockLabel(originalOut.punch_local_time) : "Missing"}`;
  const workflow = selected ? [
    { name: "Raw Punch", state: punches.loading ? "wait" : "done" },
    { name: "Regularization Request", state: "done" },
    { name: "Approval", state: selected.status === "Pending" ? "current" : "done" },
    { name: "Processed Attendance", state: selected.status === "Approved" ? "done" : "wait" },
  ] : [];

  return (
    <section className="space-y-4">
      <PageHeader title="Attendance Regularization" subtitle="Attendance correction workflow and approvals">
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status" className={compactInputClass}>
          <option value="">All statuses</option>
          {["Pending", "Approved", "Rejected"].map((name) => <option key={name}>{name}</option>)}
        </select>
        <DepartmentFilter departments={departments} value={department} onChange={setDepartment} />
        <input type="date" aria-label="Filter by date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className={compactInputClass} />
        <button type="button" onClick={() => setShowForm(true)} className={slateButton}>+ Request regularization</button>
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
        <section className="rounded-lg border border-line bg-surface p-5">
          {!selected ? (
            <p className="py-8 text-center text-sm text-muted">{list.loading ? "Loading requests…" : list.error || "No regularization requests match these filters."}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-ink">{selected.employee_name}</p>
                  <p className="mt-0.5 text-xs text-muted">{[selected.employee_code || "No code", selected.department || "No department", selectedEmployee?.workLocation, formatDate(selected.attendance_date)].filter(Boolean).join(" · ")}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-line bg-surface-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Original biometric record</p>
                  {!manager ? <p className="mt-3 text-sm text-muted">Punch details are available to HR managers and company admins.</p> : punches.loading ? <p className="mt-3 text-sm text-muted">Loading punches…</p> : punches.error ? <p className="mt-3 text-sm text-danger">{punches.error}</p> : (
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-muted">In</dt><dd className="font-semibold">{originalIn ? clockLabel(originalIn.punch_local_time) : "Missing"}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted">Out</dt><dd className="font-semibold">{originalOut ? clockLabel(originalOut.punch_local_time) : "Missing"}</dd></div>
                    </dl>
                  )}
                </div>
                <div className="rounded-lg border border-info/30 bg-info-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-info">Requested correction</p>
                  <dl className="mt-3 space-y-2 text-sm text-ink">
                    <div className="flex justify-between"><dt>In</dt><dd className="font-semibold">{clockLabel(selected.requested_check_in_time)}</dd></div>
                    <div className="flex justify-between"><dt>Out</dt><dd className="font-semibold">{selected.requested_check_out_time ? clockLabel(selected.requested_check_out_time) : "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Reason</dt><dd className="text-right font-semibold">{selected.reason}</dd></div>
                  </dl>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Requested by</p>
                  <p className="mt-1 font-semibold text-ink">{selected.employee_name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Approval</p>
                  <p className="mt-1 font-semibold text-ink">{selected.reviewed_by_name || "Pending"}</p>
                </div>
              </div>
              {selected.status === "Pending" && (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={action.busy || !canReview} onClick={() => review(selected.id, "approve")} className={`${wideDecision} bg-success hover:bg-success/90`}>Approve</button>
                  <button type="button" disabled={action.busy || !canReview} onClick={() => review(selected.id, "reject")} className={`${wideDecision} bg-danger hover:bg-danger/90`}>Reject</button>
                  {ownRequest && <AwaitingApprover />}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <h4 className="text-[15px] font-semibold text-ink">Workflow</h4>
          {!selected ? <p className="mt-4 text-sm text-muted">Select a request to see its progress.</p> : (
            <>
              <ol className="mt-4 space-y-3">
                {workflow.map((step, index) => (
                  <li key={step.name} className="flex items-center gap-3 text-sm">
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${step.state === "current" ? "bg-navy text-surface" : step.state === "done" ? "bg-success text-surface" : "bg-line text-muted"}`}>{index + 1}</span>
                    <span className={step.state === "wait" ? "text-muted" : "font-medium text-ink"}>{step.name}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-xs font-medium text-warning-strong">Original biometric records are never modified.</p>
              <h5 className="mt-5 text-sm font-semibold text-ink">Audit trail</h5>
              <dl className="mt-3 space-y-2 text-[13px]">
                {[
                  ["Requested by", selected.employee_name],
                  ["Requested date", formatDate(selected.created_at)],
                  ["Approver", selected.reviewed_by_name || "Pending"],
                  ["Approval date", selected.reviewed_at ? formatDate(selected.reviewed_at) : "Pending"],
                  ["Previous value", previousValue],
                  ["New value", `In ${clockLabel(selected.requested_check_in_time)}, Out ${selected.requested_check_out_time ? clockLabel(selected.requested_check_out_time) : "—"}`],
                  ["Reason", selected.reason],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="max-w-[58%] text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </section>
      </div>

      <Panel title={status === "Pending" ? "All pending regularization requests" : "All regularization requests"} subtitle={`${rows.length} shown`} padded={false}>
        {list.error ? <p role="alert" className="px-4 py-8 text-center text-sm text-danger">{list.error}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-line bg-surface-muted text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                <tr>{["Request", "Employee", "Employee ID", "Date", "Correction", "Reason", "Status"].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-3 py-2.5">{label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">{list.loading ? "Loading…" : "No regularization requests match these filters."}</td></tr> : rows.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedId(String(row.id))} className={`cursor-pointer border-b border-line-soft ${String(row.id) === String(selected?.id) ? "bg-sent-soft" : "hover:bg-surface-muted"}`}>
                    <td className="px-3 py-2.5 font-semibold">REQ-{row.id}</td>
                    <td className="px-3 py-2.5">{row.employee_name}</td>
                    <td className="px-3 py-2.5">{row.employee_code || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatDate(row.attendance_date)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">In {clockLabel(row.requested_check_in_time)}{row.requested_check_out_time ? ` → Out ${clockLabel(row.requested_check_out_time)}` : ""}</td>
                    <td className="max-w-48 truncate px-3 py-2.5" title={row.reason}>{row.reason}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {showForm && (
        <Modal title="Request regularization" onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="space-y-4">
            <Notice notice={action.notice} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {manager && (
                <Field label="Department" className="sm:col-span-2">
                  <DepartmentSelect
                    departments={departments}
                    value={formDepartment}
                    onChange={(next) => {
                      setFormDepartment(next);
                      if (!employeesInDepartment(employees, next).some((e) => String(e.id) === String(form.employeeId))) setForm({ ...form, employeeId: "" });
                    }}
                  />
                </Field>
              )}
              {manager && <Field label="Employee" required className="sm:col-span-2"><EmployeeSelect employees={employeesInDepartment(employees, formDepartment)} value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} required /></Field>}
              <Field label="Date" required><input type="date" required max={todayLocal()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} /></Field>
              <Field label="Check in" required><input type="time" required value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className={inputClass} /></Field>
              <Field label="Check out"><input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className={inputClass} /></Field>
              <Field label="Reason" required className="sm:col-span-2"><textarea required minLength={3} rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputClass} /></Field>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Submitting…" : "Submit request"}</button>
            </div>
          </form>
        </Modal>
      )}
      {confirm.dialog}
    </section>
  );
}

export function ShiftManagement({ companyId, role }) {
  return (
    <MasterCrud
      title="Shift Management"
      subtitle="Shift timings, grace period and overtime threshold used for attendance calculation"
      companyId={companyId}
      role={role}
      path="/api/attendance/shifts"
      listKey="shifts"
      itemKey="shift"
      columns={[
        { key: "name", label: "Shift", className: "font-semibold" },
        { key: "time", label: "Timing", render: (r) => `${time(r.start_time)} – ${time(r.end_time)}` },
        { key: "grace_minutes", label: "Grace (min)" },
        { key: "break_minutes", label: "Break (min)" },
        { key: "overtime_threshold", label: "OT threshold (min)" },
        { key: "weekly_off", label: "Weekly off" },
        { key: "location", label: "Location" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      emptyForm={{ name: "", startTime: "09:00", endTime: "18:00", graceMinutes: "15", breakMinutes: "60", overtimeThreshold: "30", weeklyOff: "Sunday", location: "All Locations", status: "Active" }}
      toForm={(r) => ({ name: r.name, startTime: time(r.start_time), endTime: time(r.end_time), graceMinutes: String(r.grace_minutes), breakMinutes: String(r.break_minutes), overtimeThreshold: String(r.overtime_threshold), weeklyOff: r.weekly_off || "", location: r.location || "", status: r.status })}
      toPayload={(f) => ({ ...f, graceMinutes: Number(f.graceMinutes), breakMinutes: Number(f.breakMinutes), overtimeThreshold: Number(f.overtimeThreshold) })}
      fields={(f, set) => (
        <>
          <Field label="Shift name" required className="sm:col-span-2"><input required value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} className={inputClass} /></Field>
          <Field label="Start time" required><input type="time" required value={f.startTime} onChange={(e) => set({ ...f, startTime: e.target.value })} className={inputClass} /></Field>
          <Field label="End time" required><input type="time" required value={f.endTime} onChange={(e) => set({ ...f, endTime: e.target.value })} className={inputClass} /></Field>
          <Field label="Grace minutes"><input type="number" min="0" max="240" value={f.graceMinutes} onChange={(e) => set({ ...f, graceMinutes: e.target.value })} className={inputClass} /></Field>
          <Field label="Break minutes"><input type="number" min="0" max="480" value={f.breakMinutes} onChange={(e) => set({ ...f, breakMinutes: e.target.value })} className={inputClass} /></Field>
          <Field label="Overtime threshold (min)"><input type="number" min="0" max="600" value={f.overtimeThreshold} onChange={(e) => set({ ...f, overtimeThreshold: e.target.value })} className={inputClass} /></Field>
          <Field label="Weekly off">
            <select value={f.weeklyOff} onChange={(e) => set({ ...f, weeklyOff: e.target.value })} className={inputClass}>
              {["Sunday", "Saturday", "Saturday & Sunday", "Monday", "Friday", "Rotational"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Location"><input value={f.location} onChange={(e) => set({ ...f, location: e.target.value })} className={inputClass} /></Field>
          <Field label="Status"><select value={f.status} onChange={(e) => set({ ...f, status: e.target.value })} className={inputClass}><option>Active</option><option>Inactive</option></select></Field>
        </>
      )}
    />
  );
}

export function BiometricDevices({ companyId, role }) {
  if (!canManage(role)) return <Notice notice={{ type: "info", message: "Device management is available to HR managers and company admins." }} />;
  return (
    <MasterCrud
      title="Biometric Devices"
      subtitle="Registered attendance devices. Punch data is imported from the Raw Punches page."
      companyId={companyId}
      role={role}
      path="/api/attendance/devices"
      listKey="devices"
      itemKey="device"
      columns={[
        { key: "device_name", label: "Device", className: "font-semibold" },
        { key: "brand", label: "Brand" },
        { key: "model", label: "Model" },
        { key: "location", label: "Location" },
        { key: "connection_type", label: "Connection" },
        { key: "ip_address", label: "IP address" },
        { key: "serial_number", label: "Serial no." },
        { key: "last_sync_at", label: "Last import", render: (r) => (r.last_sync_at ? new Date(r.last_sync_at).toLocaleString("en-GB") : "Never") },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      emptyForm={{ name: "", brand: "", model: "", location: "", connection: "LAN", ipAddress: "", serialNumber: "", status: "Unknown" }}
      toForm={(r) => ({ name: r.device_name, brand: r.brand || "", model: r.model || "", location: r.location || "", connection: r.connection_type || "LAN", ipAddress: r.ip_address || "", serialNumber: r.serial_number || "", status: r.status })}
      toPayload={(f) => f}
      fields={(f, set) => (
        <>
          <Field label="Device name / ID" required className="sm:col-span-2"><input required value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} className={inputClass} /></Field>
          <Field label="Brand"><input value={f.brand} onChange={(e) => set({ ...f, brand: e.target.value })} className={inputClass} /></Field>
          <Field label="Model"><input value={f.model} onChange={(e) => set({ ...f, model: e.target.value })} className={inputClass} /></Field>
          <Field label="Location"><input value={f.location} onChange={(e) => set({ ...f, location: e.target.value })} className={inputClass} /></Field>
          <Field label="Connection"><select value={f.connection} onChange={(e) => set({ ...f, connection: e.target.value })} className={inputClass}>{["LAN", "WiFi", "Cloud", "Serial"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="IP address"><input value={f.ipAddress} onChange={(e) => set({ ...f, ipAddress: e.target.value })} className={inputClass} /></Field>
          <Field label="Serial number"><input value={f.serialNumber} onChange={(e) => set({ ...f, serialNumber: e.target.value })} className={inputClass} /></Field>
          <Field label="Status"><select value={f.status} onChange={(e) => set({ ...f, status: e.target.value })} className={inputClass}>{["Online", "Offline", "Unknown", "Maintenance"].map((x) => <option key={x}>{x}</option>)}</select></Field>
        </>
      )}
    />
  );
}

export function RosterManagement({ companyId, role, employees, departments }) {
  const shifts = useApi(withQuery("/api/attendance/shifts", { companyId }));
  const shiftList = (shifts.data?.shifts || []).filter((s) => s.status === "Active");
  return (
    <MasterCrud
      title="Roster Management"
      subtitle="Assign employees to shifts for a date range. The effective roster drives late/overtime calculation."
      companyId={companyId}
      role={role}
      path="/api/attendance/rosters"
      listKey="rosters"
      itemKey="roster"
      deleteRoleCheck={canManage}
      columns={[
        { key: "employee_name", label: "Employee", className: "font-semibold" },
        { key: "department", label: "Department" },
        { key: "shift_name", label: "Shift" },
        { key: "effective_from", label: "From", render: (r) => formatDate(r.effective_from) },
        { key: "effective_to", label: "To", render: (r) => (r.effective_to ? formatDate(r.effective_to) : "Open-ended") },
      ]}
      emptyForm={{ department: "", employeeId: "", shiftId: "", effectiveFrom: todayLocal(), effectiveTo: "" }}
      toForm={(r) => ({ department: r.department || "", employeeId: String(r.employee_id), shiftId: String(r.shift_id), effectiveFrom: r.effective_from, effectiveTo: r.effective_to || "" })}
      toPayload={(f) => ({ employeeId: f.employeeId, shiftId: f.shiftId, effectiveFrom: f.effectiveFrom, effectiveTo: f.effectiveTo || null })}
      fields={(f, set) => (
        <>
          <Field label="Department" className="sm:col-span-2">
            <DepartmentSelect
              departments={departments}
              value={f.department}
              onChange={(department) => {
                const keep = employeesInDepartment(employees, department).some((e) => String(e.id) === String(f.employeeId));
                set({ ...f, department, employeeId: keep ? f.employeeId : "" });
              }}
            />
          </Field>
          <Field label="Employee" required className="sm:col-span-2"><EmployeeSelect employees={employeesInDepartment(employees, f.department)} value={f.employeeId} onChange={(v) => set({ ...f, employeeId: v })} required /></Field>
          <Field label="Shift" required className="sm:col-span-2">
            <select required value={f.shiftId} onChange={(e) => set({ ...f, shiftId: e.target.value })} className={inputClass}>
              <option value="">{shiftList.length ? "Select shift" : "Create a shift first"}</option>
              {shiftList.map((s) => <option key={s.id} value={s.id}>{s.name} ({time(s.start_time)}–{time(s.end_time)})</option>)}
            </select>
          </Field>
          <Field label="Effective from" required><input type="date" required value={f.effectiveFrom} onChange={(e) => set({ ...f, effectiveFrom: e.target.value })} className={inputClass} /></Field>
          <Field label="Effective to"><input type="date" value={f.effectiveTo} onChange={(e) => set({ ...f, effectiveTo: e.target.value })} className={inputClass} /></Field>
        </>
      )}
    />
  );
}

const overtimeDecision = "inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold text-surface transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const OT_STATUSES = ["Pending", "Approved", "Rejected"];

function shortDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function scheduledMinutes(row) {
  if (!row.shift_start || !row.shift_end) return null;
  const [startHour, startMinute] = row.shift_start.split(":").map(Number);
  const [endHour, endMinute] = row.shift_end.split(":").map(Number);
  let span = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (span <= 0) span += 24 * 60;
  return span;
}

function hoursLabel(minutes) {
  const hours = (Number(minutes) || 0) / 60;
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${text} hrs`;
}

function overtimeStatus(row) {
  return row.overtime_status || "Pending";
}

function shiftLabel(row) {
  if (!row.shift_name) return "—";
  return row.shift_start && row.shift_end ? `${row.shift_name} (${row.shift_start}–${row.shift_end})` : row.shift_name;
}

export function Overtime({ companyId, role, employees = [], departments = [] }) {
  const initial = monthBounds(currentMonth());
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const rangeReady = from && to && from <= to;
  const records = useApi(rangeReady ? withQuery("/api/attendance/records", { companyId, from, to, overtime: "1", limit: 1000 }) : null);
  const policy = useApi(canManage(role) ? withQuery("/api/policy", { companyId }) : null);
  const action = useAction();
  const confirm = useConfirm();
  const allRows = records.data?.records || [];
  const locations = [...new Set(employees.map((employee) => employee.workLocation).filter(Boolean))].sort();
  const rows = allRows.filter((row) => {
    if (department && row.department !== department) return false;
    if (location && row.work_location !== location) return false;
    if (status && overtimeStatus(row) !== status) return false;
    return true;
  });
  const selected = rows.find((row) => String(row.id) === selectedId) || rows[0] || null;
  const countStatus = (name) => allRows.filter((row) => overtimeStatus(row) === name).length;
  const totalMinutes = allRows.reduce((sum, row) => sum + (row.overtime_minutes || 0), 0);
  const treatment = policy.data?.policy?.approved_snapshot?.overtime_pay_treatment;
  const costValue = treatment === "not_paid" ? formatMoney(0) : "—";
  const costNote = treatment === "not_paid"
    ? "Not paid through payroll"
    : treatment === "configured_components"
      ? "Paid through salary components"
      : "No overtime pay rate is stored";

  async function review(row, verb) {
    const confirmed = await confirm.ask({
      title: verb === "approve" ? "Approve overtime" : "Reject overtime",
      message: `${verb === "approve" ? "Approve" : "Reject"} ${formatMinutes(row.overtime_minutes)} of overtime for ${row.employee_name} on ${shortDate(row.attendance_date)}?`,
      confirmLabel: verb === "approve" ? "Approve" : "Reject",
      danger: verb === "reject",
    });
    if (!confirmed) return;
    const result = await action.run(() => sendJson("PATCH", `/api/attendance/records/${row.id}`, { action: verb }));
    if (result) {
      setSelectedId(String(row.id));
      records.reload();
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Overtime Dashboard" subtitle="Track and approve employee overtime" />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <StatGrid stats={[
        { label: "Total overtime hours", value: hoursLabel(totalMinutes) },
        { label: "Pending approval", value: countStatus("Pending"), tone: "text-warning-strong" },
        { label: "Approved", value: countStatus("Approved"), tone: "text-success" },
        { label: "Rejected", value: countStatus("Rejected"), tone: "text-danger" },
        { label: "Estimated overtime cost", value: costValue, note: costNote },
      ]} />
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
        <Field label="Date range">
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" className={compactInputClass} />
            <span className="text-xs text-muted">to</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" className={compactInputClass} />
          </div>
        </Field>
        <Field label="Department"><DepartmentFilter departments={departments} value={department} onChange={setDepartment} /></Field>
        <Field label="Location">
          <select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filter by location" className={compactInputClass}>
            <option value="">All locations</option>
            {locations.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status" className={compactInputClass}>
            <option value="">All statuses</option>
            {OT_STATUSES.map((name) => <option key={name}>{name}</option>)}
          </select>
        </Field>
      </div>
      {!rangeReady && <Notice notice={{ type: "info", message: "Choose a start date that is on or before the end date." }} />}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.85fr)]">
        <Panel title="Overtime requests" padded={false}>
          <DataTable
            loading={records.loading}
            error={records.error}
            rows={rows}
            empty="No overtime recorded for this date range."
            onRowClick={(row) => setSelectedId(String(row.id))}
            rowClassName={(row) => (selected && String(row.id) === String(selected.id) ? "bg-info-soft" : "")}
            columns={[
              { key: "employee_name", label: "Employee", className: "font-semibold text-ink" },
              { key: "attendance_date", label: "Date", render: (row) => shortDate(row.attendance_date) },
              { key: "shift_name", label: "Shift", render: (row) => row.shift_name || "—" },
              { key: "regular", label: "Regular hours", render: (row) => formatMinutes(scheduledMinutes(row)) },
              { key: "overtime_minutes", label: "Overtime hours", render: (row) => formatMinutes(row.overtime_minutes) },
              { key: "overtime_reason", label: "Reason", render: (row) => row.overtime_reason || "—" },
              { key: "overtime_status", label: "Approval status", render: (row) => <StatusBadge status={overtimeStatus(row)} /> },
              { key: "overtime_reviewed_by_name", label: "Approver", render: (row) => row.overtime_reviewed_by_name || "—" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    {overtimeStatus(row) === "Pending" && (
                      <>
                        <button type="button" disabled={action.busy} onClick={(event) => { event.stopPropagation(); review(row, "approve"); }} className={`${linkButton} text-success`}>Approve</button>
                        <button type="button" disabled={action.busy} onClick={(event) => { event.stopPropagation(); review(row, "reject"); }} className={`${linkButton} text-danger`}>Reject</button>
                      </>
                    )}
                    <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(String(row.id)); }} aria-label={`View overtime for ${row.employee_name}`} className={`${linkButton} text-ink-soft`}><Eye size={14} /></button>
                  </div>
                ),
              },
            ]}
          />
        </Panel>
        <Panel title="Overtime detail">
          {!selected ? (
            <p className="py-8 text-center text-sm text-muted">No overtime is stored for this selection.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-bold text-ink">{selected.employee_name}</p>
                <p className="text-xs text-muted">{selected.designation || "Employee"}{selected.employee_code ? ` · ${selected.employee_code}` : ""}</p>
              </div>
              <dl className="space-y-2.5 text-[13px]">
                {[
                  ["Employee", `${selected.employee_name}${selected.employee_code ? ` (${selected.employee_code})` : ""}`],
                  ["Date", shortDate(selected.attendance_date)],
                  ["Shift", shiftLabel(selected)],
                  ["Actual in", clockLabel(selected.check_in_time)],
                  ["Actual out", clockLabel(selected.check_out_time)],
                  ["Regular hours", formatMinutes(scheduledMinutes(selected))],
                  ["Overtime hours", formatMinutes(selected.overtime_minutes)],
                  ["Calculation", selected.shift_name ? `Worked time beyond the scheduled shift${selected.overtime_threshold != null ? ` (threshold ${selected.overtime_threshold} min)` : ""}` : "No shift was assigned for this day"],
                  ["Approval", overtimeStatus(selected)],
                  ["Remarks", selected.overtime_review_note || selected.overtime_reason || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4">
                    <dt className="text-muted">{label}</dt>
                    <dd className="max-w-[62%] text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              {overtimeStatus(selected) === "Pending" && (
                <div className="space-y-2 border-t border-line pt-4">
                  <button type="button" disabled={action.busy} onClick={() => review(selected, "approve")} className={`${overtimeDecision} bg-success hover:bg-success/90`}>Approve</button>
                  <button type="button" disabled={action.busy} onClick={() => review(selected, "reject")} className={`${overtimeDecision} bg-danger hover:bg-danger/90`}>Reject</button>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
      {confirm.dialog}
    </section>
  );
}
