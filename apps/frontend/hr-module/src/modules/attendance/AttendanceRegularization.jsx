
import { useState } from "react";
import { sendJson, withQuery } from "../../api";
import {
  canManage,
  compactInputClass,
  employeesInDepartment,
  formatDate,
  inputClass,
  slateButton,
  submitButton,
  secondaryButton,
  todayLocal,
  useAction,
  useApi,
} from "../helpers";
import {
  AwaitingApprover,
  DepartmentFilter,
  DepartmentSelect,
  EmployeeSelect,
  Field,
  Modal,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
} from "../ui";
import { useConfirm } from "../useConfirm";

const wideDecision =
  "inline-flex h-9 items-center justify-center rounded-md px-4 text-xs font-semibold text-surface transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const clockLabel = (value) => {
  const match = String(value || "").match(/(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!match) return value ? String(value) : "—";

  const hour = Number(match[1]);

  return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
};

export function AttendanceRegularization({
  companyId,
  role,
  employees,
  departments = [],
  ownEmployeeId,
}) {
  const manager = canManage(role);
  const [status, setStatus] = useState("Pending");
  const [showForm, setShowForm] = useState(false);
  const [department, setDepartment] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    employeeId: "",
    date: todayLocal(),
    checkIn: "09:00",
    checkOut: "",
    reason: "",
  });

  const list = useApi(
    withQuery("/api/attendance/regularizations", { companyId }),
  );
  const action = useAction();
  const confirm = useConfirm();

  const rows = (list.data?.regularizations || []).filter(
    (row) =>
      (!status || row.status === status) &&
      (!department || row.department === department) &&
      (!attendanceDate || row.attendance_date === attendanceDate),
  );

  const selected =
    rows.find((row) => String(row.id) === selectedId) || rows[0] || null;

  const punches = useApi(
    manager && selected
      ? withQuery("/api/attendance/punches", {
          companyId,
          date: selected.attendance_date,
          employeeId: selected.employee_id,
        })
      : null,
  );

  async function submit(event) {
    event.preventDefault();

    const result = await action.run(() =>
      sendJson("POST", "/api/attendance/regularizations", {
        companyId,
        ...form,
        employeeId: manager ? form.employeeId : undefined,
        checkOut: form.checkOut || undefined,
      }),
    );

    if (result) {
      setShowForm(false);
      list.reload();
    }
  }

  async function review(id, verb) {
    let note = "";

    if (verb === "reject") {
      note = await confirm.ask({
        title: "Reject regularization",
        message: "Reject this attendance regularization request?",
        confirmLabel: "Reject",
        danger: true,
        input: { label: "Reason for rejection (optional)" },
      });

      if (note === null) return;
    }

    const result = await action.run(() =>
      sendJson(
        "PATCH",
        withQuery(`/api/attendance/regularizations/${id}`, { companyId }),
        {
          action: verb,
          reviewNote: note.trim() || undefined,
        },
      ),
    );

    if (result) list.reload();
  }

  const punchRows = punches.data?.punches || [];
  const originalIn =
    punchRows.find((punch) => punch.punch_type === "In") || punchRows[0];

  const originalOut =
    [...punchRows].reverse().find((punch) => punch.punch_type === "Out") ||
    (punchRows.length > 1 ? punchRows[punchRows.length - 1] : null);

  const ownRequest =
    !manager &&
    selected &&
    ownEmployeeId &&
    String(selected.employee_id) === String(ownEmployeeId);

  const canReview = manager && selected?.status === "Pending";

  const selectedEmployee = selected
    ? employees.find(
        (employee) => String(employee.id) === String(selected.employee_id),
      )
    : null;

  const previousValue = !manager
    ? "Available to HR managers"
    : punches.loading
      ? "Loading…"
      : punches.error
        ? punches.error
        : `In ${originalIn ? clockLabel(originalIn.punch_local_time) : "Missing"}, Out ${
            originalOut ? clockLabel(originalOut.punch_local_time) : "Missing"
          }`;

  const workflow = selected
    ? [
        { name: "Raw Punch", state: punches.loading ? "wait" : "done" },
        { name: "Regularization Request", state: "done" },
        {
          name: "Approval",
          state: selected.status === "Pending" ? "current" : "done",
        },
        {
          name: "Processed Attendance",
          state: selected.status === "Approved" ? "done" : "wait",
        },
      ]
    : [];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Attendance Regularization"
        subtitle="Attendance correction workflow and approvals"
      >
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
          className={compactInputClass}
        >
          <option value="">All statuses</option>
          {["Pending", "Approved", "Rejected"].map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>

        <DepartmentFilter
          departments={departments}
          value={department}
          onChange={setDepartment}
        />

        <input
          type="date"
          aria-label="Filter by date"
          value={attendanceDate}
          onChange={(event) => setAttendanceDate(event.target.value)}
          className={compactInputClass}
        />

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={slateButton}
        >
          + Request regularization
        </button>
      </PageHeader>

      <Notice
        notice={action.notice}
        onClose={() => action.setNotice(null)}
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
        <section className="rounded-lg border border-line bg-surface p-5">
          {!selected ? (
            <p className="py-8 text-center text-sm text-muted">
              {list.loading
                ? "Loading requests…"
                : list.error ||
                  "No regularization requests match these filters."}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-ink">
                    {selected.employee_name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {[
                      selected.employee_code || "No code",
                      selected.department || "No department",
                      selectedEmployee?.workLocation,
                      formatDate(selected.attendance_date),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-line bg-surface-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Original biometric record
                  </p>

                  {!manager ? (
                    <p className="mt-3 text-sm text-muted">
                      Punch details are available to HR managers and company
                      admins.
                    </p>
                  ) : punches.loading ? (
                    <p className="mt-3 text-sm text-muted">Loading punches…</p>
                  ) : punches.error ? (
                    <p className="mt-3 text-sm text-danger">
                      {punches.error}
                    </p>
                  ) : (
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted">In</dt>
                        <dd className="font-semibold">
                          {originalIn
                            ? clockLabel(originalIn.punch_local_time)
                            : "Missing"}
                        </dd>
                      </div>

                      <div className="flex justify-between">
                        <dt className="text-muted">Out</dt>
                        <dd className="font-semibold">
                          {originalOut
                            ? clockLabel(originalOut.punch_local_time)
                            : "Missing"}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>

                <div className="rounded-lg border border-info/30 bg-info-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-info">
                    Requested correction
                  </p>

                  <dl className="mt-3 space-y-2 text-sm text-ink">
                    <div className="flex justify-between">
                      <dt>In</dt>
                      <dd className="font-semibold">
                        {clockLabel(selected.requested_check_in_time)}
                      </dd>
                    </div>

                    <div className="flex justify-between">
                      <dt>Out</dt>
                      <dd className="font-semibold">
                        {selected.requested_check_out_time
                          ? clockLabel(selected.requested_check_out_time)
                          : "—"}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-3">
                      <dt>Reason</dt>
                      <dd className="text-right font-semibold">
                        {selected.reason}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Requested by
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    {selected.employee_name}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Approval
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    {selected.reviewed_by_name || "Pending"}
                  </p>
                </div>
              </div>

              {selected.status === "Pending" && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={action.busy || !canReview}
                    onClick={() => review(selected.id, "approve")}
                    className={`${wideDecision} bg-success hover:bg-success/90`}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={action.busy || !canReview}
                    onClick={() => review(selected.id, "reject")}
                    className={`${wideDecision} bg-danger hover:bg-danger/90`}
                  >
                    Reject
                  </button>

                  {ownRequest && <AwaitingApprover />}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <h4 className="text-[15px] font-semibold text-ink">Workflow</h4>

          {!selected ? (
            <p className="mt-4 text-sm text-muted">
              Select a request to see its progress.
            </p>
          ) : (
            <>
              <ol className="mt-4 space-y-3">
                {workflow.map((step, index) => (
                  <li
                    key={step.name}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                        step.state === "current"
                          ? "bg-navy text-surface"
                          : step.state === "done"
                            ? "bg-success text-surface"
                            : "bg-line text-muted"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <span
                      className={
                        step.state === "wait"
                          ? "text-muted"
                          : "font-medium text-ink"
                      }
                    >
                      {step.name}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-xs font-medium text-warning-strong">
                Original biometric records are never modified.
              </p>

              <h5 className="mt-5 text-sm font-semibold text-ink">
                Audit trail
              </h5>

              <dl className="mt-3 space-y-2 text-[13px]">
                {[
                  ["Requested by", selected.employee_name],
                  ["Requested date", formatDate(selected.created_at)],
                  ["Approver", selected.reviewed_by_name || "Pending"],
                  [
                    "Approval date",
                    selected.reviewed_at
                      ? formatDate(selected.reviewed_at)
                      : "Pending",
                  ],
                  ["Previous value", previousValue],
                  [
                    "New value",
                    `In ${clockLabel(
                      selected.requested_check_in_time,
                    )}, Out ${
                      selected.requested_check_out_time
                        ? clockLabel(selected.requested_check_out_time)
                        : "—"
                    }`,
                  ],
                  ["Reason", selected.reason],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="text-muted">{label}</dt>
                    <dd className="max-w-[58%] text-right font-medium text-ink">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </section>
      </div>

      <Panel
        title={
          status === "Pending"
            ? "All pending regularization requests"
            : "All regularization requests"
        }
        subtitle={`${rows.length} shown`}
        padded={false}
      >
        {list.error ? (
          <p
            role="alert"
            className="px-4 py-8 text-center text-sm text-danger"
          >
            {list.error}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-line bg-surface-muted text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                <tr>
                  {[
                    "Request",
                    "Employee",
                    "Employee ID",
                    "Date",
                    "Correction",
                    "Reason",
                    "Status",
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2.5"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted"
                    >
                      {list.loading
                        ? "Loading…"
                        : "No regularization requests match these filters."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(String(row.id))}
                      className={`cursor-pointer border-b border-line-soft ${
                        String(row.id) === String(selected?.id)
                          ? "bg-sent-soft"
                          : "hover:bg-surface-muted"
                      }`}
                    >
                      <td className="px-3 py-2.5 font-semibold">
                        REQ-{row.id}
                      </td>
                      <td className="px-3 py-2.5">{row.employee_name}</td>
                      <td className="px-3 py-2.5">
                        {row.employee_code || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {formatDate(row.attendance_date)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        In {clockLabel(row.requested_check_in_time)}
                        {row.requested_check_out_time
                          ? ` → Out ${clockLabel(row.requested_check_out_time)}`
                          : ""}
                      </td>
                      <td
                        className="max-w-48 truncate px-3 py-2.5"
                        title={row.reason}
                      >
                        {row.reason}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showForm && (
        <Modal
          title="Request regularization"
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={submit} className="space-y-4">
            <Notice notice={action.notice} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {manager && (
                <Field label="Department" className="sm:col-span-2">
                  <DepartmentSelect
                    departments={departments}
                    value={formDepartment}
                    onChange={(next) => {
                      setFormDepartment(next);

                      if (
                        !employeesInDepartment(employees, next).some(
                          (employee) =>
                            String(employee.id) === String(form.employeeId),
                        )
                      ) {
                        setForm({ ...form, employeeId: "" });
                      }
                    }}
                  />
                </Field>
              )}

              {manager && (
                <Field
                  label="Employee"
                  required
                  className="sm:col-span-2"
                >
                  <EmployeeSelect
                    employees={employeesInDepartment(
                      employees,
                      formDepartment,
                    )}
                    value={form.employeeId}
                    onChange={(value) =>
                      setForm({ ...form, employeeId: value })
                    }
                    required
                  />
                </Field>
              )}

              <Field label="Date" required>
                <input
                  type="date"
                  required
                  max={todayLocal()}
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Check in" required>
                <input
                  type="time"
                  required
                  value={form.checkIn}
                  onChange={(event) =>
                    setForm({ ...form, checkIn: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Check out">
                <input
                  type="time"
                  value={form.checkOut}
                  onChange={(event) =>
                    setForm({ ...form, checkOut: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Reason" required className="sm:col-span-2">
                <textarea
                  required
                  minLength={3}
                  rows={3}
                  value={form.reason}
                  onChange={(event) =>
                    setForm({ ...form, reason: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={secondaryButton}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={action.busy}
                className={submitButton}
              >
                {action.busy ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm.dialog}
    </section>
  );
}
