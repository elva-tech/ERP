import { CalendarClock, CalendarX2, ClipboardList, UserCheck, Users } from "lucide-react";
import { withQuery } from "../api";
import { canManage, formatDate, initials, secondaryButton, todayLocal, useApi } from "./helpers";
import { DataTable, Notice, PageHeader, Panel, StatGrid, StatusBadge } from "./ui";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ATTENDED = ["Present", "Late", "Half Day"];
const EXCLUDED = ["Holiday", "On Leave"];

function monthLabel(month) {
  const [year, m] = month.split("-");
  return `${MONTH_SHORT[Number(m) - 1]} ${year.slice(2)}`;
}

/** Attended records as a share of working-day records (holidays and approved leave excluded). */
function attendanceRate(entry) {
  const counts = entry.counts || {};
  const attended = ATTENDED.reduce((sum, status) => sum + (counts[status] || 0), 0);
  const considered = entry.total - EXCLUDED.reduce((sum, status) => sum + (counts[status] || 0), 0);
  return considered > 0 ? { rate: Math.round((attended / considered) * 1000) / 10, attended, considered } : null;
}

function DepartmentHeadcount({ employees, departments, onNavigate, manager }) {
  const active = employees.filter((e) => e.status === "Active");
  const counts = new Map();
  for (const d of departments) if (d.status === "Active") counts.set(d.name, 0);
  for (const e of active) {
    const name = e.department || "Unassigned";
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const rows = [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Panel
      title="Department Headcount"
      subtitle={`${active.length} active ${active.length === 1 ? "employee" : "employees"}`}
      actions={manager && <button type="button" onClick={() => onNavigate("Departments")} className={secondaryButton}>Departments</button>}
    >
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No departments or active employees yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((d) => (
            <li key={d.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-700">{d.name}</span>
                <span className="shrink-0 font-semibold text-slate-900">{d.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="presentation">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AttendanceRateChart({ summary, manager }) {
  const months = summary.data?.months || [];
  const points = months.map((m) => ({ month: m.month, label: monthLabel(m.month), ...(attendanceRate(m) || {}), hasData: Boolean(attendanceRate(m)) }));
  const withData = points.filter((p) => p.hasData);
  const description = withData.length
    ? `Monthly attendance rate: ${points.map((p) => `${p.label} ${p.hasData ? `${p.rate}%` : "no records"}`).join(", ")}.`
    : "No attendance records in the last six months.";

  const width = 520;
  const height = 220;
  const pad = { top: 24, right: 8, bottom: 28, left: 36 };
  const plotH = height - pad.top - pad.bottom;
  const slot = (width - pad.left - pad.right) / Math.max(points.length, 1);
  const barW = Math.min(44, slot * 0.55);

  return (
    <Panel
      title="Monthly Attendance Rate"
      subtitle={`${manager ? "All employees" : "Your attendance"} · Present, Late and Half Day as a share of marked working days (holidays and leave excluded)`}
    >
      {summary.loading ? (
        <p className="py-16 text-center text-sm text-slate-500" aria-busy="true">Loading attendance…</p>
      ) : summary.error ? (
        <p role="alert" className="py-16 text-center text-sm text-red-600">{summary.error}</p>
      ) : withData.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">No attendance has been recorded in the last six months.</p>
      ) : (
        <figure>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={description}>
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = pad.top + plotH - (tick / 100) * plotH;
              return (
                <g key={tick}>
                  <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e3e8ee" strokeDasharray={tick ? "3 3" : undefined} />
                  <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{tick}%</text>
                </g>
              );
            })}
            {points.map((p, i) => {
              const cx = pad.left + slot * i + slot / 2;
              const h = p.hasData ? (p.rate / 100) * plotH : 0;
              return (
                <g key={p.month}>
                  {p.hasData ? (
                    <>
                      <rect x={cx - barW / 2} y={pad.top + plotH - h} width={barW} height={Math.max(h, 2)} rx="4" fill={i === points.length - 1 ? "#205778" : "#2c79a3"} opacity={i === points.length - 1 ? 1 : 0.8}>
                        <title>{`${p.label}: ${p.rate}% (${p.attended} of ${p.considered} working-day records)`}</title>
                      </rect>
                      <text x={cx} y={pad.top + plotH - h - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">{p.rate}%</text>
                    </>
                  ) : (
                    <text x={cx} y={pad.top + plotH - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">no data</text>
                  )}
                  <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill="#475569">{p.label}</text>
                </g>
              );
            })}
          </svg>
          <figcaption className="sr-only">{description}</figcaption>
        </figure>
      )}
    </Panel>
  );
}

export function Dashboard({ companyId, role, employees, departments, onNavigate }) {
  const manager = canManage(role);
  const today = todayLocal();
  const attendance = useApi(withQuery("/api/attendance/records", { companyId, date: today, limit: 1 }));
  const leave = useApi(withQuery("/api/leave/requests", { companyId }));
  const pendingLeave = useApi(withQuery("/api/leave/requests", { companyId, status: "Pending" }));
  const monthly = useApi(withQuery("/api/attendance/monthly-summary", { companyId, months: 6 }));

  const active = employees.filter((e) => e.status === "Active");
  const summary = attendance.data?.summary || {};
  const marked = Object.values(summary).reduce((s, v) => s + v, 0);
  const present = (summary.Present || 0) + (summary.Late || 0);
  const requests = leave.data?.requests || [];
  const pending = pendingLeave.data?.requests || [];
  const onLeaveToday = requests.filter((r) => r.status === "Approved" && r.from_date <= today && r.to_date >= today).length;
  const loadingValue = "…";

  const stats = manager
    ? [
        { label: "Total Employees", value: active.length, note: `${employees.length - active.length} inactive`, icon: Users, onClick: () => onNavigate("Employee Directory"), actionLabel: "Open Employee Directory" },
        { label: "Present Today", value: attendance.loading ? loadingValue : marked ? present : "—", note: marked ? `${marked} of ${active.length} marked` : "No attendance marked today", icon: UserCheck, iconTone: "green", tone: "text-emerald-700", onClick: () => onNavigate("Daily Attendance"), actionLabel: "Open Daily Attendance" },
        { label: "On Leave Today", value: leave.loading ? loadingValue : onLeaveToday, note: "Approved leave covering today", icon: CalendarX2, iconTone: "slate", onClick: () => onNavigate("Leave Requests"), actionLabel: "Open Leave Requests" },
        { label: "Pending Leave Requests", value: pendingLeave.loading ? loadingValue : pending.length, note: pending.length ? "Awaiting review" : "Nothing waiting", icon: ClipboardList, iconTone: pending.length ? "amber" : "slate", tone: pending.length ? "text-amber-600" : undefined, onClick: () => onNavigate("Leave Approvals"), actionLabel: "Open Leave Approvals" },
      ]
    : [
        { label: "Colleagues", value: active.length, note: "Active employees in the directory", icon: Users, onClick: () => onNavigate("Employee Directory"), actionLabel: "Open Employee Directory" },
        { label: "My Attendance Today", value: attendance.loading ? loadingValue : Object.keys(summary)[0] || "Not marked", icon: UserCheck, iconTone: "green", onClick: () => onNavigate("Employee Attendance"), actionLabel: "Open my attendance" },
        { label: "My Leave Today", value: leave.loading ? loadingValue : onLeaveToday ? "On leave" : "Working", icon: CalendarClock, iconTone: "slate", onClick: () => onNavigate("Leave Balance"), actionLabel: "Open Leave Balance" },
        { label: "My Pending Requests", value: pendingLeave.loading ? loadingValue : pending.length, note: pending.length ? "Awaiting approval" : "Nothing pending", icon: ClipboardList, iconTone: pending.length ? "amber" : "slate", onClick: () => onNavigate("Leave Requests"), actionLabel: "Open Leave Requests" },
      ];

  return (
    <section className="space-y-6">
      <PageHeader title={manager ? "HR & Operations Overview" : "My Overview"} subtitle={`Live summary for ${formatDate(today)}`} />
      {(attendance.error || leave.error || pendingLeave.error) && <Notice notice={{ type: "error", message: attendance.error || leave.error || pendingLeave.error }} />}
      <StatGrid stats={stats} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DepartmentHeadcount employees={employees} departments={departments} onNavigate={onNavigate} manager={manager} />
        <AttendanceRateChart summary={monthly} manager={manager} />
      </div>
      <Panel
        title="Recent Leave Requests"
        subtitle={manager ? "Latest requests across the company" : "Your latest requests"}
        actions={
          <button type="button" onClick={() => onNavigate(manager ? "Leave Approvals" : "Leave Requests")} className={secondaryButton}>
            {manager ? "Review approvals" : "My requests"}
          </button>
        }
        padded={false}
      >
        <DataTable
          loading={leave.loading}
          error={leave.error}
          rows={requests.slice(0, 8)}
          empty="No leave requests yet."
          columns={[
            {
              key: "employee_name",
              label: "Employee",
              render: (r) => (
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700" aria-hidden="true">{initials(r.employee_name)}</span>
                  <span className="font-medium text-slate-900">{r.employee_name}</span>
                </span>
              ),
            },
            { key: "department", label: "Department" },
            { key: "leave_type_name", label: "Leave Type" },
            { key: "from_date", label: "From", render: (r) => formatDate(r.from_date) },
            { key: "to_date", label: "To", render: (r) => formatDate(r.to_date) },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </Panel>
    </section>
  );
}
