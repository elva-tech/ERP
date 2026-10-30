
import { useState } from "react";
import { withQuery } from "../../api";
import {
  canManage,
  compactInputClass,
  employeesInDepartment,
  formatDate,
  formatMinutes,
  primaryButton,
  secondaryButton,
  todayLocal,
  useApi,
} from "../helpers";
import {
  DataTable,
  DepartmentFilter,
  Notice,
  PageHeader,
  Panel,
  StatGrid,
} from "../ui";
import { summarize } from "./shared";

export function AttendanceDashboard({
  companyId,
  employees,
  departments = [],
  role,
  onNavigate,
}) {
  const [date, setDate] = useState(todayLocal());
  const [department, setDepartment] = useState("");

  const manager = canManage(role);

  const records = useApi(
    withQuery("/api/attendance/records", {
      companyId,
      date,
      department: manager ? department : "",
      limit: 1000,
    }),
  );

  const devices = useApi(
    manager ? withQuery("/api/attendance/devices", { companyId }) : null,
  );

  const pending = useApi(
    withQuery("/api/attendance/regularizations", {
      companyId,
      status: "Pending",
    }),
  );

  const activeCount = employeesInDepartment(employees, department).filter(
    (employee) => employee.status === "Active",
  ).length;

  const summary = summarize(records.data?.summary);
  const marked = summary.total;

  const attendancePct = marked
    ? `${Math.round(
        ((summary.present + summary.onDuty + summary.halfDay * 0.5) /
          marked) *
          100,
      )}%`
    : "—";

  function refresh() {
    records.reload();
    pending.reload();
    devices.reload?.();
  }

  const rows = records.data?.records || [];

  const byDepartment = Object.values(
    rows.reduce((acc, row) => {
      const departmentRow = (acc[row.department] ||= {
        department: row.department,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
      });

      departmentRow.total += 1;

      if (row.status === "Present" || row.status === "Late") {
        departmentRow.present += 1;
      }

      if (row.status === "Absent") {
        departmentRow.absent += 1;
      }

      if (row.status === "Late") {
        departmentRow.late += 1;
      }

      return acc;
    }, {}),
  );

  const deviceRows = devices.data?.devices || [];

  const countDevices = (status) =>
    deviceRows.filter((device) => device.status === status).length;

  return (
    <section className="space-y-5">
      <PageHeader
        title="Attendance Dashboard"
        subtitle="Daily attendance summary from recorded attendance"
      >
        {manager && (
          <DepartmentFilter
            departments={departments}
            value={department}
            onChange={setDepartment}
          />
        )}

        <input
          type="date"
          value={date}
          onChange={(event) =>
            event.target.value && setDate(event.target.value)
          }
          aria-label="Attendance date"
          className={compactInputClass}
        />

        <button
          type="button"
          onClick={refresh}
          className={secondaryButton}
        >
          ↻ Refresh
        </button>
      </PageHeader>

      {records.error && (
        <Notice
          notice={{ type: "error", message: records.error }}
        />
      )}

      {!records.loading && !records.error && marked === 0 && (
        <Notice
          notice={{
            type: "info",
            message: `No attendance has been recorded for ${formatDate(date)}${
              department ? ` in ${department}` : ""
            }. Counts stay at zero until attendance is marked or the day's biometric punches are processed in Daily Attendance.`,
          }}
        />
      )}

      <StatGrid
        stats={[
          { label: "Active employees", value: activeCount },
          {
            label: "Marked",
            value: records.loading ? "…" : marked,
            note: `${Math.max(activeCount - marked, 0)} not marked`,
          },
          {
            label: "Present (incl. late)",
            value: summary.present,
            tone: "text-success",
          },
          {
            label: "Absent",
            value: summary.absent,
            tone: "text-danger",
          },
          {
            label: "Late",
            value: summary.late,
            tone: "text-warning-strong",
          },
          {
            label: "Half day",
            value: summary.halfDay,
            tone: "text-warning-strong",
          },
          {
            label: "On duty",
            value: summary.onDuty,
            tone: "text-info",
          },
          { label: "Holiday", value: summary.holiday },
          {
            label: "Missing punch",
            value: summary.missing,
            tone: "text-danger",
          },
          { label: "Compensation", value: summary.compensation },
          { label: "On leave", value: summary.onLeave },
          {
            label: "Overtime",
            value: formatMinutes(records.data?.overtimeMinutes ?? 0),
          },
          {
            label: "Attendance % (of marked)",
            value: attendancePct,
            tone: "text-success",
          },
          {
            label: "Pending regularizations",
            value: pending.data?.count ?? "—",
          },
          ...(canManage(role)
            ? [
                {
                  label: "Devices online",
                  value: devices.data
                    ? `${countDevices("Online")} / ${deviceRows.length}`
                    : "—",
                },
              ]
            : []),
        ]}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Department attendance" padded={false}>
          <DataTable
            rowKey={(row) => row.department}
            loading={records.loading}
            rows={byDepartment}
            empty="No attendance recorded for this date."
            columns={[
              {
                key: "department",
                label: "Department",
                className: "font-semibold",
              },
              { key: "total", label: "Marked" },
              { key: "present", label: "Present" },
              { key: "absent", label: "Absent" },
              { key: "late", label: "Late" },
              {
                key: "pct",
                label: "Attendance %",
                render: (row) =>
                  `${Math.round((row.present / row.total) * 100)}%`,
              },
            ]}
          />
        </Panel>

        <Panel title="Attention required">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">Missing punches</span>
              <strong>{summary.missing}</strong>
            </li>

            <li className="flex justify-between">
              <span className="text-muted">Late arrivals</span>
              <strong>{summary.late}</strong>
            </li>

            <li className="flex justify-between">
              <span className="text-muted">Pending regularizations</span>
              <strong>{pending.data?.count ?? "—"}</strong>
            </li>

            {canManage(role) && (
              <li className="flex justify-between">
                <span className="text-muted">
                  Devices offline / maintenance
                </span>
                <strong>
                  {countDevices("Offline") +
                    countDevices("Maintenance")}
                </strong>
              </li>
            )}
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("attendance-exceptions")}
              className={secondaryButton}
            >
              Review exceptions
            </button>

            <button
              type="button"
              onClick={() => onNavigate("attendance-regularization")}
              className={secondaryButton}
            >
              Regularization
            </button>

            <button
              type="button"
              onClick={() => onNavigate("daily-attendance")}
              className={primaryButton}
            >
              Daily attendance
            </button>
          </div>
        </Panel>
      </div>
    </section>
  );
}
