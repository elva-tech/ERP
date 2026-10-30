
import { useState } from "react";
import { withQuery } from "../../api";
import {
  canManage,
  currentMonth,
  employeesInDepartment,
  formatMinutes,
  inputClass,
  monthBounds,
  useApi,
} from "../helpers";
import {
  DataTable,
  DepartmentSelect,
  EmployeeSelect,
  Field,
  Notice,
  PageHeader,
  Panel,
  StatGrid,
} from "../ui";
import { recordColumns, summarize } from "./shared";

export function EmployeeAttendance({
  companyId,
  role,
  employees,
  departments = [],
}) {
  const manager = canManage(role);
  const [department, setDepartment] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(currentMonth());

  const bounds = monthBounds(month);

  const path =
    manager && !employeeId
      ? null
      : withQuery("/api/attendance/records", {
          companyId,
          employeeId,
          from: bounds.from,
          to: bounds.to,
          limit: 1000,
        });

  const records = useApi(path);
  const summary = summarize(records.data?.summary);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Employee Attendance"
        subtitle="Attendance history for one employee"
      />

      <div
        className={`grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 ${
          manager ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        {manager && (
          <>
            <Field label="Department">
              <DepartmentSelect
                departments={departments}
                value={department}
                onChange={(next) => {
                  setDepartment(next);

                  if (
                    !employeesInDepartment(employees, next).some(
                      (employee) => String(employee.id) === String(employeeId),
                    )
                  ) {
                    setEmployeeId("");
                  }
                }}
              />
            </Field>

            <Field label="Employee">
              <EmployeeSelect
                employees={employeesInDepartment(employees, department)}
                value={employeeId}
                onChange={setEmployeeId}
                activeOnly={false}
              />
            </Field>
          </>
        )}

        <Field label="Month">
          <input
            type="month"
            value={month}
            onChange={(event) =>
              event.target.value && setMonth(event.target.value)
            }
            className={inputClass}
          />
        </Field>
      </div>

      {manager && !employeeId ? (
        <Notice
          notice={{
            type: "info",
            message: "Select an employee to view their attendance.",
          }}
        />
      ) : (
        <>
          <StatGrid
            stats={[
              { label: "Days marked", value: summary.total },
              {
                label: "Present",
                value: summary.present,
                tone: "text-success",
              },
              {
                label: "Absent",
                value: summary.absent,
                tone: "text-danger",
              },
              {
                label: "Overtime",
                value: formatMinutes(
                  records.data?.overtimeMinutes ?? 0,
                ),
              },
            ]}
          />

          <Panel title="Records" padded={false}>
            <DataTable
              loading={records.loading}
              error={records.error}
              rows={records.data?.records || []}
              columns={recordColumns({ showEmployee: false })}
              empty="No attendance records for this month."
            />
          </Panel>
        </>
      )}
    </section>
  );
}
