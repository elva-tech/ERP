import { CalendarDays } from "lucide-react";
import { withQuery } from "../api";
import { canManage, formatDate, todayLocal, useApi } from "./helpers";
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
    <Panel title="Department Headcount" actions={manager && <button type="button" onClick={() => onNavigate("Departments")} className="text-xs font-semibold text-link hover:underline">View all</button>}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No departments or active employees yet.</p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map((d) => (
            <li key={d.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-ink">{d.name}</span>
                <span className="shrink-0 font-semibold text-navy">{d.count} {d.count === 1 ? "Member" : "Members"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line-soft" role="presentation">
                <div className="h-full rounded-full bg-navy" style={{ width: `${(d.count / max) * 100}%` }} />
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
  const pad = { top: 12, right: 8, bottom: 28, left: 8 };
  const plotH = height - pad.top - pad.bottom;
  const slot = (width - pad.left - pad.right) / Math.max(points.length, 1);
  const barW = Math.min(44, slot * 0.55);

  return (
    <Panel
      title="Monthly Attendance Rate (%)"
      subtitle={manager ? undefined : "Your attendance"}
    >
      {summary.loading ? (
        <p className="py-16 text-center text-sm text-muted" aria-busy="true">Loading attendance…</p>
      ) : summary.error ? (
        <p role="alert" className="py-16 text-center text-sm text-danger">{summary.error}</p>
      ) : withData.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No attendance has been recorded in the last six months.</p>
      ) : (
        <figure>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={description}>
            {points.map((p,i) => {
              const cx = pad.left + slot * i + slot / 2;
              const h = p.hasData ? (p.rate / 100) * plotH : 0;
              return (
                <g key={p.month}>
                  {p.hasData ? (
                    <>
                      <rect x={cx - barW / 2} y={pad.top + plotH - h} width={barW} height={Math.max(h, 2)} rx="2" className="fill-navy">
                        <title>{`${p.label}: ${p.rate}% (${p.attended} of ${p.considered} working-day records; holidays and leave excluded)`}</title>
                      </rect>
                    </>
                  ) : (
                    <text x={cx} y={pad.top + plotH - 6} textAnchor="middle" fontSize="10" className="fill-placeholder">no data</text>
                  )}
                  <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" className="fill-ink-soft">{p.hasData ? `${p.label} (${p.rate}%)` : p.label}</text>
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

  const attendancePct = marked && active.length ? `${Math.round((present / active.length) * 100)}% attendance` : undefined;
  const stats = manager
    ? [
        { label: "Total Employees", value: active.length, badge: "Active Strength", note: `${employees.length - active.length} inactive`, onClick: () => onNavigate("Employee Directory"), actionLabel: "Open Employee Directory" },
        { label: "Present Today", value: attendance.loading ? loadingValue : marked ? present : "—", badge: attendancePct, note: marked ? undefined : "No attendance marked today", onClick: () => onNavigate("Daily Attendance"), actionLabel: "Open Daily Attendance" },
        { label: "On Leave Today", value: leave.loading ? loadingValue : onLeaveToday, badge: "Approved leave", onClick: () => onNavigate("Leave Requests"), actionLabel: "Open Leave Requests" },
        { label: "Pending Leave Requests", value: pendingLeave.loading ? loadingValue : pending.length, badge: pending.length ? "Requires Approval" : "Nothing waiting", alert: pending.length > 0, tone: pending.length ? "text-danger" : undefined, onClick: () => onNavigate("Leave Approvals"), actionLabel: "Open Leave Approvals" },
      ]
    : [
        { label: "Colleagues", value: active.length, badge: "Active", onClick: () => onNavigate("Employee Directory"), actionLabel: "Open Employee Directory" },
        { label: "My Attendance Today", value: attendance.loading ? loadingValue : Object.keys(summary)[0] || "Not marked", onClick: () => onNavigate("Employee Attendance"), actionLabel: "Open my attendance" },
        { label: "My Leave Today", value: leave.loading ? loadingValue : onLeaveToday ? "On leave" : "Working", onClick: () => onNavigate("Leave Balance"), actionLabel: "Open Leave Balance" },
        { label: "My Pending Requests", value: pendingLeave.loading ? loadingValue : pending.length, badge: pending.length ? "Awaiting approval" : undefined, onClick: () => onNavigate("Leave Requests"), actionLabel: "Open Leave Requests" },
      ];
  const monthTitle = new Date(`${today}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <section className="space-y-6">
      <PageHeader title={manager ? "HR & Operations Overview" : "My Overview"}>
        <span className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink" title={formatDate(today)}>
          <CalendarDays size={15} className="text-muted" aria-hidden="true" /> {monthTitle} • Today
        </span>
      </PageHeader>
      {(attendance.error || leave.error || pendingLeave.error) && <Notice notice={{ type: "error", message: attendance.error || leave.error || pendingLeave.error }} />}
      <StatGrid stats={stats} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DepartmentHeadcount employees={employees} departments={departments} onNavigate={onNavigate} manager={manager} />
        <AttendanceRateChart summary={monthly} manager={manager} />
      </div>
      <Panel
        title="Recent Leave Requests"
        actions={
          <button type="button" onClick={() => onNavigate(manager ? "Leave Approvals" : "Leave Requests")} className="text-xs font-semibold text-link hover:underline">
            View all
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
              label: "Employee Name",
              className: "text-ink",
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
