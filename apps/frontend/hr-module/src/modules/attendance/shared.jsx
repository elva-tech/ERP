
import { formatDate, formatMinutes } from "../helpers";
import { StatusBadge } from "../ui";

export function recordColumns({
  showDate = true,
  showEmployee = true,
} = {}) {
  return [
    ...(showDate
      ? [
          {
            key: "attendance_date",
            label: "Date",
            render: (r) => formatDate(r.attendance_date),
          },
        ]
      : []),

    ...(showEmployee
      ? [
          {
            key: "employee_name",
            label: "Employee",
            className: "font-semibold text-ink",
          },
          { key: "employee_code", label: "Code" },
          { key: "department", label: "Department" },
        ]
      : []),

    { key: "shift_name", label: "Shift" },
    {
      key: "check_in_time",
      label: "Check In",
      render: (r) => r.check_in_time || "—",
    },
    {
      key: "check_out_time",
      label: "Check Out",
      render: (r) => r.check_out_time || "—",
    },
    {
      key: "working_minutes",
      label: "Worked",
      render: (r) => formatMinutes(r.working_minutes),
    },
    {
      key: "overtime_minutes",
      label: "Overtime",
      render: (r) =>
        r.overtime_minutes ? formatMinutes(r.overtime_minutes) : "—",
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className="flex items-center gap-2">
          <StatusBadge status={r.status} />
          {r.is_regularized && (
            <span className="text-[10px] font-semibold text-info">
              Regularized
            </span>
          )}
        </span>
      ),
    },
  ];
}

export function summarize(summary = {}) {
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
    total: Object.values(summary).reduce((sum, value) => sum + value, 0),
  };
}
