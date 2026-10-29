import { useState } from "react";
import { sendJson, withQuery } from "../api";
import {
  canManage,
  currentMonth,
  formatDate,
  formatMinutes,
  inputClass,
  linkButton,
  monthBounds,
  primaryButton,
  secondaryButton,
  todayLocal,
  useAction,
  useApi,
} from "./helpers";
import MasterCrud from "./MasterCrud";
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

const STATUSES = ["Present", "Absent", "Late", "Half Day", "On Leave", "Holiday", "Missing Punch"];
const STATUS_CODES = { Present: "P", Absent: "A", Late: "L", "Half Day": "HD", "On Leave": "OL", Holiday: "H", "Missing Punch": "MP" };
const time = (value) => (value ? String(value).slice(0, 5) : "—");

function recordColumns({ showDate = true, showEmployee = true } = {}) {
  return [
    ...(showDate ? [{ key: "attendance_date", label: "Date", render: (r) => formatDate(r.attendance_date) }] : []),
    ...(showEmployee
      ? [
          { key: "employee_name", label: "Employee", className: "font-semibold text-slate-800" },
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
          {r.is_regularized && <span className="text-[10px] font-semibold text-blue-700">Regularized</span>}
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
    total: Object.values(summary).reduce((s, v) => s + v, 0),
  };
}

export function AttendanceDashboard({ companyId, employees, role, onNavigate }) {
  const [date, setDate] = useState(todayLocal());
  const records = useApi(withQuery("/api/attendance/records", { companyId, date, limit: 1000 }));
  const devices = useApi(canManage(role) ? withQuery("/api/attendance/devices", { companyId }) : null);
  const pending = useApi(withQuery("/api/attendance/regularizations", { companyId, status: "Pending" }));

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const s = summarize(records.data?.summary);
  const marked = s.total;
  const attendancePct = marked ? `${Math.round(((s.present + s.halfDay * 0.5) / marked) * 100)}%` : "—";
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
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <button type="button" onClick={records.reload} className={secondaryButton}>↻ Refresh</button>
      </PageHeader>
      {records.error && <Notice notice={{ type: "error", message: records.error }} />}
      <StatGrid
        stats={[
          { label: "Active employees", value: activeCount },
          { label: "Marked", value: records.loading ? "…" : marked, note: `${Math.max(activeCount - marked, 0)} not marked` },
          { label: "Present (incl. late)", value: s.present, tone: "text-emerald-600" },
          { label: "Absent", value: s.absent, tone: "text-red-600" },
          { label: "Late", value: s.late, tone: "text-orange-600" },
          { label: "Missing punch", value: s.missing, tone: "text-red-600" },
          { label: "Half day", value: s.halfDay, tone: "text-amber-600" },
          { label: "On leave", value: s.onLeave },
          { label: "Overtime", value: formatMinutes(records.data?.overtimeMinutes ?? 0) },
          { label: "Attendance % (of marked)", value: attendancePct, tone: "text-emerald-600" },
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
            <li className="flex justify-between"><span className="text-slate-500">Missing punches</span><strong>{s.missing}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">Late arrivals</span><strong>{s.late}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">Pending regularizations</span><strong>{pending.data?.count ?? "—"}</strong></li>
            {canManage(role) && (
              <li className="flex justify-between"><span className="text-slate-500">Devices offline / maintenance</span><strong>{countDevices("Offline") + countDevices("Maintenance")}</strong></li>
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
        <p className="text-xs text-slate-500">Late and overtime are calculated from the shift's start time, grace minutes and overtime threshold.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={action.busy} className={primaryButton}>{action.busy ? "Saving…" : "Save attendance"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function DailyAttendance({ companyId, role, employees }) {
  const [date, setDate] = useState(todayLocal());
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [marking, setMarking] = useState(null);
  const records = useApi(withQuery("/api/attendance/records", { companyId, date, limit: 1000 }));
  const shifts = useApi(withQuery("/api/attendance/shifts", { companyId }));
  const manager = canManage(role);

  const byEmployee = new Map((records.data?.records || []).map((r) => [String(r.employee_id), r]));
  const base = manager ? employees.filter((e) => e.status === "Active" || byEmployee.has(String(e.id))) : [];
  const rows = (manager ? base.map((e) => ({ employee: e, record: byEmployee.get(String(e.id)) })) : (records.data?.records || []).map((r) => ({ employee: { id: String(r.employee_id), name: r.employee_name, employeeCode: r.employee_code, department: r.department }, record: r })))
    .filter((row) => !department || row.employee.department === department)
    .filter((row) => !status || (status === "Not marked" ? !row.record : row.record?.status === status));
  const departments = [...new Set(employees.map((e) => e.department))].sort();
  const s = summarize(records.data?.summary);

  return (
    <section className="space-y-5">
      <PageHeader title="Daily Attendance" subtitle="Review and mark attendance for a day" />
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Department">
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
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
        { label: "Present", value: s.present, tone: "text-emerald-600" },
        { label: "Absent", value: s.absent, tone: "text-red-600" },
        { label: "Exceptions", value: s.late + s.missing + s.halfDay, tone: "text-orange-600" },
      ]} />
      <Panel title={`Attendance for ${formatDate(date)}`} padded={false}>
        <DataTable
          loading={records.loading}
          error={records.error}
          rowKey={(row) => row.employee.id}
          rows={rows}
          empty={manager ? "No employees match these filters." : "No attendance recorded for you on this date."}
          columns={[
            { key: "name", label: "Employee", className: "font-semibold text-slate-800", render: (row) => row.employee.name },
            { key: "code", label: "Code", render: (row) => row.employee.employeeCode || "—" },
            { key: "department", label: "Department", render: (row) => row.employee.department },
            { key: "shift", label: "Shift", render: (row) => row.record?.shift_name || "—" },
            { key: "in", label: "Check In", render: (row) => row.record?.check_in_time || "—" },
            { key: "out", label: "Check Out", render: (row) => row.record?.check_out_time || "—" },
            { key: "worked", label: "Worked", render: (row) => formatMinutes(row.record?.working_minutes) },
            { key: "status", label: "Status", render: (row) => (row.record ? <StatusBadge status={row.record.status} /> : <span className="text-xs text-slate-400">Not marked</span>) },
            ...(manager ? [{ key: "action", label: "Action", render: (row) => <button type="button" onClick={() => setMarking(row)} className={`${linkButton} text-brand-600`}>{row.record ? "Edit" : "Mark"}</button> }] : []),
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
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </PageHeader>
      <p className="text-xs text-slate-500">Legend: {Object.entries(STATUS_CODES).map(([k, v]) => `${v} = ${k}`).join(" · ")} · blank = not marked</p>
      {records.data?.count >= 1000 && <Notice notice={{ type: "info", message: "Showing the first 1000 records for this month." }} />}
      <Panel title={`${month} attendance register`} padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-xs">
            <thead className="bg-[#f0f2f3] text-slate-600">
              <tr>
                <th className="sticky left-0 bg-[#f0f2f3] px-3 py-3">Employee</th>
                {days.map((d) => <th key={d} className="px-1.5 py-3 text-center">{Number(d.slice(8))}</th>)}
                <th className="px-3 py-3">P</th><th className="px-3 py-3">A</th><th className="px-3 py-3">L</th>
              </tr>
            </thead>
            <tbody>
              {records.loading ? (
                <tr><td colSpan={days.length + 4} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
              ) : people.length === 0 ? (
                <tr><td colSpan={days.length + 4} className="px-4 py-10 text-center text-slate-500">No attendance records for this month.</td></tr>
              ) : people.map((e) => {
                const statuses = days.map((d) => map.get(`${e.id}|${d}`));
                const count = (fn) => statuses.filter(fn).length;
                return (
                  <tr key={e.id} className="border-t border-slate-200">
                    <td className="sticky left-0 bg-white px-3 py-2 font-semibold">{e.name}</td>
                    {statuses.map((st, i) => (
                      <td key={days[i]} title={st || "Not marked"} className={`px-1.5 py-2 text-center ${st === "Absent" || st === "Missing Punch" ? "text-red-600" : st === "Late" ? "text-orange-600" : "text-slate-700"}`}>{st ? STATUS_CODES[st] : ""}</td>
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

export function AttendanceExceptions({ companyId }) {
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState("");
  const bounds = monthBounds(month);
  const records = useApi(withQuery("/api/attendance/records", { companyId, from: bounds.from, to: bounds.to, exceptions: status ? "" : "1", status, limit: 1000 }));
  const s = summarize(records.data?.summary);

  return (
    <section className="space-y-5">
      <PageHeader title="Attendance Exceptions" subtitle="Late arrivals, missing punches, absences and half days">
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">All exceptions</option>
          {["Late", "Missing Punch", "Absent", "Half Day"].map((x) => <option key={x}>{x}</option>)}
        </select>
      </PageHeader>
      <StatGrid stats={[
        { label: "Late", value: s.late, tone: "text-orange-600" },
        { label: "Missing punch", value: s.missing, tone: "text-red-600" },
        { label: "Absent", value: s.absent, tone: "text-red-600" },
        { label: "Half day", value: s.halfDay, tone: "text-amber-600" },
      ]} />
      <Panel title="Exception records" subtitle="Employees can raise a regularization request for incorrect records." padded={false}>
        <DataTable loading={records.loading} error={records.error} rows={records.data?.records || []} columns={recordColumns()} empty="No exceptions for this period." />
      </Panel>
    </section>
  );
}

export function EmployeeAttendance({ companyId, role, employees }) {
  const manager = canManage(role);
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const bounds = monthBounds(month);
  const path = manager && !employeeId ? null : withQuery("/api/attendance/records", { companyId, employeeId, from: bounds.from, to: bounds.to, limit: 1000 });
  const records = useApi(path);
  const s = summarize(records.data?.summary);

  return (
    <section className="space-y-5">
      <PageHeader title="Employee Attendance" subtitle="Attendance history for one employee" />
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        {manager && <Field label="Employee"><EmployeeSelect employees={employees} value={employeeId} onChange={setEmployeeId} activeOnly={false} /></Field>}
        <Field label="Month"><input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className={inputClass} /></Field>
      </div>
      {manager && !employeeId ? (
        <Notice notice={{ type: "info", message: "Select an employee to view their attendance." }} />
      ) : (
        <>
          <StatGrid stats={[
            { label: "Days marked", value: s.total },
            { label: "Present", value: s.present, tone: "text-emerald-600" },
            { label: "Absent", value: s.absent, tone: "text-red-600" },
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

export function RawPunches({ companyId, role }) {
  const [date, setDate] = useState(todayLocal());
  const [unmatched, setUnmatched] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const manager = canManage(role);
  const punches = useApi(manager ? withQuery("/api/attendance/punches", { companyId, date, unmatched: unmatched ? "1" : "" }) : null);
  const devices = useApi(manager ? withQuery("/api/attendance/devices", { companyId }) : null);
  const action = useAction();

  if (!manager) {
    return <Notice notice={{ type: "info", message: "Raw device punches are available to HR managers and company admins." }} />;
  }

  async function importPunches(event) {
    event.preventDefault();
    const parsed = parsePunchCsv(csv, deviceId);
    if (parsed.errors.length || parsed.punches.length === 0) {
      action.setNotice({ type: "error", message: parsed.errors.slice(0, 5).join(" ") || "Paste at least one punch line." });
      return;
    }
    const result = await action.run(() => sendJson("POST", "/api/attendance/punches", { companyId, punches: parsed.punches }));
    if (result) {
      setShowImport(false);
      setCsv("");
      punches.reload();
    }
  }

  async function processDay() {
    const result = await action.run(() => sendJson("POST", "/api/attendance/punches/process", { companyId, date }));
    if (result) punches.reload();
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Raw Punches" subtitle={`Device punch log (times shown in ${punches.data?.timezone || "company timezone"})`}>
        <button type="button" onClick={() => setShowImport(true)} className={secondaryButton}>Import punches</button>
        <button type="button" disabled={action.busy} onClick={processDay} className={primaryButton}>Process {formatDate(date)} into attendance</button>
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={unmatched} onChange={(e) => setUnmatched(e.target.checked)} /> Unmatched only</label>
      </div>
      <Panel title="Punches" subtitle="Processing uses each employee's first punch as check-in and last punch as check-out. Regularized days are not overwritten." padded={false}>
        <DataTable
          loading={punches.loading}
          error={punches.error}
          rows={punches.data?.punches || []}
          empty="No punches recorded for this date."
          columns={[
            { key: "punch_local_time", label: "Time" },
            { key: "employee_name", label: "Employee", render: (r) => r.employee_name || <span className="text-red-600">Unmatched</span> },
            { key: "device_user_id", label: "Device user ID" },
            { key: "punch_type", label: "Type" },
            { key: "device_name", label: "Device" },
          ]}
        />
      </Panel>
      {showImport && (
        <Modal title="Import punches" onClose={() => setShowImport(false)}>
          <form onSubmit={importPunches} className="space-y-4">
            <Notice notice={action.notice} />
            <p className="text-sm text-slate-600">Paste one punch per line as <code>employeeCode,YYYY-MM-DD HH:MM,In|Out</code>. Codes are matched to employee codes; unmatched rows are stored for review.</p>
            <Field label="Device (optional)">
              <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={inputClass}>
                <option value="">No device</option>
                {(devices.data?.devices || []).map((d) => <option key={d.id} value={d.id}>{d.device_name}</option>)}
              </select>
            </Field>
            <Field label="Punch data" required><textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} className={inputClass} /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowImport(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={action.busy} className={primaryButton}>{action.busy ? "Importing…" : "Import"}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

export function AttendanceRegularization({ companyId, role, employees, ownEmployeeId }) {
  const manager = canManage(role);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", date: todayLocal(), checkIn: "09:00", checkOut: "", reason: "" });
  const list = useApi(withQuery("/api/attendance/regularizations", { companyId, status }));
  const action = useAction();
  const confirm = useConfirm();

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

  return (
    <section className="space-y-5">
      <PageHeader title="Attendance Regularization" subtitle="Request and approve corrections to attendance records">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["Pending", "Approved", "Rejected"].map((x) => <option key={x}>{x}</option>)}
        </select>
        <button type="button" onClick={() => setShowForm(true)} className={primaryButton}>+ Request regularization</button>
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <Panel title="Requests" padded={false}>
        <DataTable
          loading={list.loading}
          error={list.error}
          rows={list.data?.regularizations || []}
          empty="No regularization requests."
          columns={[
            { key: "employee_name", label: "Employee", className: "font-semibold" },
            { key: "attendance_date", label: "Date", render: (r) => formatDate(r.attendance_date) },
            { key: "requested_check_in_time", label: "Check In" },
            { key: "requested_check_out_time", label: "Check Out", render: (r) => r.requested_check_out_time || "—" },
            { key: "reason", label: "Reason", render: (r) => <span className="block max-w-xs truncate" title={r.reason}>{r.reason}</span> },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "reviewed_by_name", label: "Reviewed by", render: (r) => r.reviewed_by_name || "—" },
            ...(manager ? [{
              key: "actions", label: "Actions", render: (r) => r.status !== "Pending" ? "—" : ownEmployeeId && String(r.employee_id) === String(ownEmployeeId) ? <AwaitingApprover /> : (
                <span className="flex gap-3">
                  <button type="button" disabled={action.busy} onClick={() => review(r.id, "approve")} className={`${linkButton} text-emerald-700`}>Approve</button>
                  <button type="button" disabled={action.busy} onClick={() => review(r.id, "reject")} className={`${linkButton} text-red-600`}>Reject</button>
                </span>
              ),
            }] : []),
          ]}
        />
      </Panel>
      {showForm && (
        <Modal title="Request regularization" onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="space-y-4">
            <Notice notice={action.notice} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {manager && <Field label="Employee" required className="sm:col-span-2"><EmployeeSelect employees={employees} value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} required /></Field>}
              <Field label="Date" required><input type="date" required max={todayLocal()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} /></Field>
              <Field label="Check in" required><input type="time" required value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className={inputClass} /></Field>
              <Field label="Check out"><input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className={inputClass} /></Field>
              <Field label="Reason" required className="sm:col-span-2"><textarea required minLength={3} rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputClass} /></Field>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={action.busy} className={primaryButton}>{action.busy ? "Submitting…" : "Submit request"}</button>
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

export function RosterManagement({ companyId, role, employees }) {
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
      emptyForm={{ employeeId: "", shiftId: "", effectiveFrom: todayLocal(), effectiveTo: "" }}
      toForm={(r) => ({ employeeId: String(r.employee_id), shiftId: String(r.shift_id), effectiveFrom: r.effective_from, effectiveTo: r.effective_to || "" })}
      toPayload={(f) => ({ ...f, effectiveTo: f.effectiveTo || null })}
      fields={(f, set) => (
        <>
          <Field label="Employee" required className="sm:col-span-2"><EmployeeSelect employees={employees} value={f.employeeId} onChange={(v) => set({ ...f, employeeId: v })} required /></Field>
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

export function Overtime({ companyId }) {
  const [month, setMonth] = useState(currentMonth());
  const bounds = monthBounds(month);
  const records = useApi(withQuery("/api/attendance/records", { companyId, from: bounds.from, to: bounds.to, overtime: "1", limit: 1000 }));
  const rows = records.data?.records || [];
  const employeesWithOt = new Set(rows.map((r) => r.employee_id)).size;

  return (
    <section className="space-y-5">
      <PageHeader title="Overtime" subtitle="Overtime derived from attendance and each shift's overtime threshold">
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </PageHeader>
      <StatGrid stats={[
        { label: "Total overtime", value: formatMinutes(records.data?.overtimeMinutes ?? 0) },
        { label: "Days with overtime", value: rows.length },
        { label: "Employees", value: employeesWithOt },
      ]} />
      <Notice notice={{ type: "info", message: "Overtime approval and overtime pay rules are not configured yet; this view reports recorded overtime only." }} />
      <Panel title="Overtime records" padded={false}>
        <DataTable loading={records.loading} error={records.error} rows={rows} columns={recordColumns()} empty="No overtime recorded for this month." />
      </Panel>
    </section>
  );
}
