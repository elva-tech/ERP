
import { useState } from "react";
import { withQuery } from "../../api";
import {
  canManage,
  compactInputClass,
  currentMonth,
  monthBounds,
  useApi,
} from "../helpers";
import { Notice, PageHeader, Panel } from "../ui";
import { STATUS_CODES } from "./constants";

export function MonthlyAttendance({ companyId, role, employees }) {
  const [month, setMonth] = useState(currentMonth());
  const bounds = monthBounds(month);
  const records = useApi(
    withQuery("/api/attendance/records", {
      companyId,
      from: bounds.from,
      to: bounds.to,
      limit: 1000,
    }),
  );

  const rows = records.data?.records || [];
  const map = new Map(
    rows.map((record) => [
      `${record.employee_id}|${record.attendance_date}`,
      record.status,
    ]),
  );

  const people = canManage(role)
    ? employees.filter(
        (employee) =>
          employee.status === "Active" ||
          rows.some(
            (record) => String(record.employee_id) === String(employee.id),
          ),
      )
    : [
        ...new Map(
          rows.map((record) => [
            String(record.employee_id),
            {
              id: String(record.employee_id),
              name: record.employee_name,
              employeeCode: record.employee_code,
            },
          ]),
        ).values(),
      ];

  const days = Array.from(
    { length: bounds.days },
    (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`,
  );

  return (
    <section className="space-y-5">
      <PageHeader
        title="Monthly Attendance"
        subtitle="Day-by-day attendance status for the month"
      >
        <input
          type="month"
          value={month}
          onChange={(event) =>
            event.target.value && setMonth(event.target.value)
          }
          className={compactInputClass}
        />
      </PageHeader>

      <p className="text-xs text-muted">
        Legend:{" "}
        {Object.entries(STATUS_CODES)
          .map(([key, value]) => `${value} = ${key}`)
          .join(" · ")}{" "}
        · blank = not marked
      </p>

      {records.data?.count >= 1000 && (
        <Notice
          notice={{
            type: "info",
            message: "Showing the first 1000 records for this month.",
          }}
        />
      )}

      <Panel title={`${month} attendance register`} padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11.5px] font-semibold text-muted">
              <tr>
                <th className="sticky left-0 bg-surface-muted px-3 py-3">
                  Employee
                </th>
                {days.map((day) => (
                  <th key={day} className="px-1.5 py-3 text-center">
                    {Number(day.slice(8))}
                  </th>
                ))}
                <th className="px-3 py-3">P</th>
                <th className="px-3 py-3">A</th>
                <th className="px-3 py-3">L</th>
              </tr>
            </thead>

            <tbody>
              {records.loading ? (
                <tr>
                  <td
                    colSpan={days.length + 4}
                    className="px-4 py-10 text-center text-muted"
                  >
                    Loading…
                  </td>
                </tr>
              ) : people.length === 0 ? (
                <tr>
                  <td
                    colSpan={days.length + 4}
                    className="px-4 py-10 text-center text-muted"
                  >
                    No attendance records for this month.
                  </td>
                </tr>
              ) : (
                people.map((employee) => {
                  const statuses = days.map((day) =>
                    map.get(`${employee.id}|${day}`),
                  );

                  const count = (predicate) =>
                    statuses.filter(predicate).length;

                  return (
                    <tr key={employee.id} className="border-t border-line">
                      <td className="sticky left-0 bg-surface px-3 py-2 font-semibold">
                        {employee.name}
                      </td>

                      {statuses.map((status, index) => (
                        <td
                          key={days[index]}
                          title={status || "Not marked"}
                          className={`px-1.5 py-2 text-center ${
                            status === "Absent" || status === "Missing Punch"
                              ? "text-danger"
                              : status === "Late"
                                ? "text-warning-strong"
                                : "text-ink-soft"
                          }`}
                        >
                          {status ? STATUS_CODES[status] : ""}
                        </td>
                      ))}

                      <td className="px-3 py-2">
                        {count(
                          (status) =>
                            status === "Present" || status === "Late",
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {count((status) => status === "Absent")}
                      </td>
                      <td className="px-3 py-2">
                        {count((status) => status === "Late")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}
