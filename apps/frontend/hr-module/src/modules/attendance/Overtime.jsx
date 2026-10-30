
import { useState } from "react";
import { Eye } from "lucide-react";
import { sendJson, withQuery } from "../../api";
import {
  canManage,
  compactInputClass,
  currentMonth,
  formatMinutes,
  formatMoney,
  linkButton,
  monthBounds,
  useAction,
  useApi,
} from "../helpers";
import {
  DataTable,
  DepartmentFilter,
  Field,
  Notice,
  PageHeader,
  Panel,
  StatGrid,
  StatusBadge,
} from "../ui";
import { useConfirm } from "../useConfirm";

const overtimeDecision =
  "inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold text-surface transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const OT_STATUSES = ["Pending", "Approved", "Rejected"];

function shortDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function scheduledMinutes(row) {
  if (!row.shift_start || !row.shift_end) return null;

  const [startHour, startMinute] = row.shift_start.split(":").map(Number);
  const [endHour, endMinute] = row.shift_end.split(":").map(Number);

  let span =
    endHour * 60 + endMinute - (startHour * 60 + startMinute);

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

  return row.shift_start && row.shift_end
    ? `${row.shift_name} (${row.shift_start}–${row.shift_end})`
    : row.shift_name;
}

function clockLabel(value) {
  const match = String(value || "").match(/(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!match) return value ? String(value) : "—";

  const hour = Number(match[1]);

  return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

export function Overtime({
  companyId,
  role,
  employees = [],
  departments = [],
}) {
  const initial = monthBounds(currentMonth());

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const rangeReady = from && to && from <= to;

  const records = useApi(
    rangeReady
      ? withQuery("/api/attendance/records", {
          companyId,
          from,
          to,
          overtime: "1",
          limit: 1000,
        })
      : null,
  );

  const policy = useApi(
    canManage(role) ? withQuery("/api/policy", { companyId }) : null,
  );

  const action = useAction();
  const confirm = useConfirm();

  const allRows = records.data?.records || [];

  const locations = [
    ...new Set(
      employees.map((employee) => employee.workLocation).filter(Boolean),
    ),
  ].sort();

  const rows = allRows.filter((row) => {
    if (department && row.department !== department) return false;
    if (location && row.work_location !== location) return false;
    if (status && overtimeStatus(row) !== status) return false;
    return true;
  });

  const selected =
    rows.find((row) => String(row.id) === selectedId) || rows[0] || null;

  const countStatus = (name) =>
    allRows.filter((row) => overtimeStatus(row) === name).length;

  const totalMinutes = allRows.reduce(
    (sum, row) => sum + (row.overtime_minutes || 0),
    0,
  );

  const treatment =
    policy.data?.policy?.approved_snapshot?.overtime_pay_treatment;

  const costValue = treatment === "not_paid" ? formatMoney(0) : "—";

  const costNote =
    treatment === "not_paid"
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

    const result = await action.run(() =>
      sendJson("PATCH", `/api/attendance/records/${row.id}`, {
        action: verb,
      }),
    );

    if (result) {
      setSelectedId(String(row.id));
      records.reload();
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Overtime Dashboard"
        subtitle="Track and approve employee overtime"
      />

      <Notice
        notice={action.notice}
        onClose={() => action.setNotice(null)}
      />

      <StatGrid
        stats={[
          {
            label: "Total overtime hours",
            value: hoursLabel(totalMinutes),
          },
          {
            label: "Pending approval",
            value: countStatus("Pending"),
            tone: "text-warning-strong",
          },
          {
            label: "Approved",
            value: countStatus("Approved"),
            tone: "text-success",
          },
          {
            label: "Rejected",
            value: countStatus("Rejected"),
            tone: "text-danger",
          },
          {
            label: "Estimated overtime cost",
            value: costValue,
            note: costNote,
          },
        ]}
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
        <Field label="Date range">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="From date"
              className={compactInputClass}
            />

            <span className="text-xs text-muted">to</span>

            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-label="To date"
              className={compactInputClass}
            />
          </div>
        </Field>

        <Field label="Department">
          <DepartmentFilter
            departments={departments}
            value={department}
            onChange={setDepartment}
          />
        </Field>

        <Field label="Location">
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            aria-label="Filter by location"
            className={compactInputClass}
          >
            <option value="">All locations</option>
            {locations.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
            className={compactInputClass}
          >
            <option value="">All statuses</option>
            {OT_STATUSES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </Field>
      </div>

      {!rangeReady && (
        <Notice
          notice={{
            type: "info",
            message:
              "Choose a start date that is on or before the end date.",
          }}
        />
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.85fr)]">
        <Panel title="Overtime requests" padded={false}>
          <DataTable
            loading={records.loading}
            error={records.error}
            rows={rows}
            empty="No overtime recorded for this date range."
            onRowClick={(row) => setSelectedId(String(row.id))}
            rowClassName={(row) =>
              selected && String(row.id) === String(selected.id)
                ? "bg-info-soft"
                : ""
            }
            columns={[
              {
                key: "employee_name",
                label: "Employee",
                className: "font-semibold text-ink",
              },
              {
                key: "attendance_date",
                label: "Date",
                render: (row) => shortDate(row.attendance_date),
              },
              {
                key: "shift_name",
                label: "Shift",
                render: (row) => row.shift_name || "—",
              },
              {
                key: "regular",
                label: "Regular hours",
                render: (row) => formatMinutes(scheduledMinutes(row)),
              },
              {
                key: "overtime_minutes",
                label: "Overtime hours",
                render: (row) => formatMinutes(row.overtime_minutes),
              },
              {
                key: "overtime_reason",
                label: "Reason",
                render: (row) => row.overtime_reason || "—",
              },
              {
                key: "overtime_status",
                label: "Approval status",
                render: (row) => (
                  <StatusBadge status={overtimeStatus(row)} />
                ),
              },
              {
                key: "overtime_reviewed_by_name",
                label: "Approver",
                render: (row) => row.overtime_reviewed_by_name || "—",
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    {overtimeStatus(row) === "Pending" && (
                      <>
                        <button
                          type="button"
                          disabled={action.busy}
                          onClick={(event) => {
                            event.stopPropagation();
                            review(row, "approve");
                          }}
                          className={`${linkButton} text-success`}
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          disabled={action.busy}
                          onClick={(event) => {
                            event.stopPropagation();
                            review(row, "reject");
                          }}
                          className={`${linkButton} text-danger`}
                        >
                          Reject
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(String(row.id));
                      }}
                      aria-label={`View overtime for ${row.employee_name}`}
                      className={`${linkButton} text-ink-soft`}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </Panel>

        <Panel title="Overtime detail">
          {!selected ? (
            <p className="py-8 text-center text-sm text-muted">
              No overtime is stored for this selection.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-bold text-ink">
                  {selected.employee_name}
                </p>
                <p className="text-xs text-muted">
                  {selected.designation || "Employee"}
                  {selected.employee_code
                    ? ` · ${selected.employee_code}`
                    : ""}
                </p>
              </div>

              <dl className="space-y-2.5 text-[13px]">
                {[
                  [
                    "Employee",
                    `${selected.employee_name}${selected.employee_code ? ` (${selected.employee_code})` : ""}`,
                  ],
                  ["Date", shortDate(selected.attendance_date)],
                  ["Shift", shiftLabel(selected)],
                  ["Actual in", clockLabel(selected.check_in_time)],
                  ["Actual out", clockLabel(selected.check_out_time)],
                  ["Regular hours", formatMinutes(scheduledMinutes(selected))],
                  ["Overtime hours", formatMinutes(selected.overtime_minutes)],
                  [
                    "Calculation",
                    selected.shift_name
                      ? `Worked time beyond the scheduled shift${selected.overtime_threshold != null ? ` (threshold ${selected.overtime_threshold} min)` : ""}`
                      : "No shift was assigned for this day",
                  ],
                  ["Approval", overtimeStatus(selected)],
                  [
                    "Remarks",
                    selected.overtime_review_note ||
                      selected.overtime_reason ||
                      "—",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4"
                  >
                    <dt className="text-muted">{label}</dt>
                    <dd className="max-w-[62%] text-right font-medium text-ink">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {overtimeStatus(selected) === "Pending" && (
                <div className="space-y-2 border-t border-line pt-4">
                  <button
                    type="button"
                    disabled={action.busy}
                    onClick={() => review(selected, "approve")}
                    className={`${overtimeDecision} bg-success hover:bg-success/90`}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={action.busy}
                    onClick={() => review(selected, "reject")}
                    className={`${overtimeDecision} bg-danger hover:bg-danger/90`}
                  >
                    Reject
                  </button>
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
