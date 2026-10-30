import { inputClass } from "../../helpers";
import { useState } from "react";
import { withQuery } from "../../../api";
import {
  currentMonth,
  formatDate,
  formatMinutes,
  monthBounds,
  useApi,
} from "../../helpers";
import { DataTable, Field, Panel, StatusBadge } from "../../ui";
import { ProfileStats } from "../shared";
export function AttendanceTab({ companyId, employeeId }) {
  const initial = monthBounds(currentMonth());
  const [range, setRange] = useState({ from: initial.from, to: initial.to });
  const valid = range.from && range.to && range.from <= range.to;
  const records = useApi(valid ? withQuery("/api/attendance/records", { companyId, employeeId, from: range.from, to: range.to, limit: 1000 }) : null);
  const s = records.data?.summary || {};

  return (
    <div className="space-y-5">
      <Panel title="Date range">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From"><input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={inputClass} /></Field>
          <Field label="To"><input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={inputClass} /></Field>
        </div>
        {!valid && <p className="mt-3 text-sm text-danger">Choose a start date on or before the end date.</p>}
      </Panel>
      <ProfileStats stats={[
        { label: "Present", value: s.Present ?? 0, tone: "text-success" },
        { label: "Late", value: s.Late ?? 0, tone: "text-warning-strong" },
        { label: "Half day", value: s["Half Day"] ?? 0, tone: "text-warning-strong" },
        { label: "Absent", value: s.Absent ?? 0, tone: "text-danger" },
        { label: "Missing punch", value: s["Missing Punch"] ?? 0, tone: "text-danger" },
        { label: "Overtime", value: formatMinutes(records.data?.overtimeMinutes ?? 0) },
      ]} />
      <Panel title="Attendance history" padded={false}>
        <DataTable
          loading={records.loading}
          error={records.error}
          rows={records.data?.records || []}
          empty="No attendance recorded in this period."
          columns={[
            { key: "attendance_date", label: "Date", render: (r) => formatDate(r.attendance_date) },
            { key: "shift_name", label: "Shift", render: (r) => r.shift_name || "—" },
            { key: "check_in_time", label: "In", render: (r) => r.check_in_time || "—" },
            { key: "check_out_time", label: "Out", render: (r) => r.check_out_time || "—" },
            { key: "working_minutes", label: "Worked", render: (r) => formatMinutes(r.working_minutes) },
            { key: "overtime_minutes", label: "Overtime", render: (r) => (r.overtime_minutes ? formatMinutes(r.overtime_minutes) : "—") },
            { key: "status", label: "Status", render: (r) => <span className="inline-flex items-center gap-2"><StatusBadge status={r.status} />{r.is_regularized && <span className="text-[10px] font-semibold uppercase text-info">Regularized</span>}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}
