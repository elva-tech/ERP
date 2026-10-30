
import { useState } from "react";
import { withQuery } from "../../api";
import {
  canManage,
  compactInputClass,
  currentMonth,
  monthBounds,
  useApi,
} from "../helpers";
import {
  DataTable,
  DepartmentFilter,
  PageHeader,
  Panel,
  StatGrid,
} from "../ui";
import { summarize, recordColumns } from "./shared";

export function AttendanceExceptions({
  companyId,
  role,
  departments = [],
}) {
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");

  const manager = canManage(role);
  const bounds = monthBounds(month);

  const records = useApi(
    withQuery("/api/attendance/records", {
      companyId,
      from: bounds.from,
      to: bounds.to,
      exceptions: status ? "" : "1",
      status,
      department: manager ? department : "",
      limit: 1000,
    }),
  );

  const summary = summarize(records.data?.summary);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Attendance Exceptions"
        subtitle="Late arrivals, missing punches, absences and half days"
      >
        {manager && (
          <DepartmentFilter
            departments={departments}
            value={department}
            onChange={setDepartment}
          />
        )}

        <input
          type="month"
          value={month}
          onChange={(event) =>
            event.target.value && setMonth(event.target.value)
          }
          className={compactInputClass}
        />

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by exception"
          className={compactInputClass}
        >
          <option value="">All exceptions</option>
          {["Late", "Missing Punch", "Absent", "Half Day"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </PageHeader>

      <StatGrid
        stats={[
          { label: "Late", value: summary.late, tone: "text-warning-strong" },
          { label: "Missing punch", value: summary.missing, tone: "text-danger" },
          { label: "Absent", value: summary.absent, tone: "text-danger" },
          { label: "Half day", value: summary.halfDay, tone: "text-warning-strong" },
        ]}
      />

      <Panel
        title="Exception records"
        subtitle="Employees can raise a regularization request for incorrect records."
        padded={false}
      >
        <DataTable
          loading={records.loading}
          error={records.error}
          rows={records.data?.records || []}
          columns={recordColumns()}
          empty="No exceptions for this period."
        />
      </Panel>
    </section>
  );
}
