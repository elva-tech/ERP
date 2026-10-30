
import { useState } from "react";
import { sendJson, withQuery } from "../../api";
import {
  canManage,
  formatDate,
  formatMinutes,
  inputClass,
  linkButton,
  secondaryButton,
  submitButton,
  todayLocal,
  useAction,
  useApi,
} from "../helpers";
import {
  DataTable,
  DepartmentSelect,
  Field,
  Modal,
  Notice,
  PageHeader,
  Panel,
  StatGrid,
  StatusBadge,
} from "../ui";
import { summarize } from "./shared";

const STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Half Day",
  "On Duty",
  "On Leave",
  "Holiday",
  "Missing Punch",
  "Compensation",
];

const time = (value) => (value ? String(value).slice(0, 5) : "—");

function MarkAttendanceModal({
  companyId,
  employee,
  date,
  record,
  shifts,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    status: record?.status || "",
    checkIn: record?.check_in_time || "",
    checkOut: record?.check_out_time || "",
    shiftId: record?.shift_id ? String(record.shift_id) : "",
  });

  const action = useAction();

  async function submit(event) {
    event.preventDefault();

    const saved = await action.run(() =>
      sendJson("POST", "/api/attendance/records", {
        companyId,
        employeeId: employee.id,
        date,
        status: form.status || undefined,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        shiftId: form.shiftId || undefined,
      }),
    );

    if (saved) onSaved();
  }

  return (
    <Modal
      title={`Mark attendance — ${employee.name} (${formatDate(date)})`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Notice notice={action.notice} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Check in">
            <input
              type="time"
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

          <Field label="Shift">
            <select
              value={form.shiftId}
              onChange={(event) =>
                setForm({ ...form, shiftId: event.target.value })
              }
              className={inputClass}
            >
              <option value="">From roster (if assigned)</option>
              {shifts
                .filter((shift) => shift.status === "Active")
                .map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({time(shift.start_time)}–
                    {time(shift.end_time)})
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
              className={inputClass}
            >
              <option value="">Derive from times and shift</option>
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
        </div>

        <p className="text-xs text-muted">
          Late and overtime are calculated from the shift's start time, grace
          minutes and overtime threshold.
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={secondaryButton}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={action.busy}
            className={submitButton}
          >
            {action.busy ? "Saving…" : "Save attendance"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function parsePunchCsv(text, deviceId) {
  const punches = [];
  const errors = [];

  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      if (index === 0 && /device|user|time/i.test(line)) return;

      const [deviceUserId, punchTime, punchType] = line
        .split(",")
        .map((part) => part.trim());

      if (
        !deviceUserId ||
        !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(
          punchTime || "",
        )
      ) {
        errors.push(
          `Line ${index + 1}: expected "employeeCode,YYYY-MM-DD HH:MM[,In|Out]".`,
        );
        return;
      }

      punches.push({
        deviceUserId,
        punchTime: punchTime.replace(" ", "T"),
        punchType: punchType || undefined,
        deviceId: deviceId || undefined,
      });
    });

  return { punches, errors };
}

function ImportPunchesModal({ companyId, onClose, onImported }) {
  const [csv, setCsv] = useState("");
  const [deviceId, setDeviceId] = useState("");

  const devices = useApi(
    withQuery("/api/attendance/devices", { companyId }),
  );

  const action = useAction();

  async function importPunches(event) {
    event.preventDefault();

    const parsed = parsePunchCsv(csv, deviceId);

    if (parsed.errors.length || parsed.punches.length === 0) {
      action.setNotice({
        type: "error",
        message:
          parsed.errors.slice(0, 5).join(" ") ||
          "Paste at least one punch line.",
      });
      return;
    }

    const result = await action.run(() =>
      sendJson("POST", "/api/attendance/punches", {
        companyId,
        punches: parsed.punches,
      }),
    );

    if (result) onImported(result.message);
  }

  return (
    <Modal title="Import punches" onClose={onClose}>
      <form onSubmit={importPunches} className="space-y-4">
        <Notice notice={action.notice} />

        <p className="text-sm text-ink-soft">
          Paste one punch per line as{" "}
          <code>employeeCode,YYYY-MM-DD HH:MM,In|Out</code>. Codes are matched
          to employee codes; unmatched rows are stored for review.
        </p>

        <Field label="Device (optional)">
          <select
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            className={inputClass}
          >
            <option value="">No device</option>
            {(devices.data?.devices || []).map((device) => (
              <option key={device.id} value={device.id}>
                {device.device_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Punch data" required>
          <textarea
            rows={8}
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            className={inputClass}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={secondaryButton}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={action.busy}
            className={submitButton}
          >
            {action.busy ? "Importing…" : "Import"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DailyAttendance({
  companyId,
  role,
  employees,
  departments: departmentRecords = [],
}) {
  const [date, setDate] = useState(todayLocal());
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [marking, setMarking] = useState(null);
  const [importing, setImporting] = useState(false);

  const records = useApi(
    withQuery("/api/attendance/records", {
      companyId,
      date,
      limit: 1000,
    }),
  );

  const shifts = useApi(
    withQuery("/api/attendance/shifts", { companyId }),
  );

  const manager = canManage(role);
  const action = useAction();

  async function processPunches() {
    const result = await action.run(() =>
      sendJson("POST", "/api/attendance/punches/process", {
        companyId,
        date,
      }),
    );

    if (result) records.reload();
  }

  const byEmployee = new Map(
    (records.data?.records || []).map((record) => [
      String(record.employee_id),
      record,
    ]),
  );

  const base = manager
    ? employees.filter(
        (employee) =>
          employee.status === "Active" ||
          byEmployee.has(String(employee.id)),
      )
    : [];

  const rows = (
    manager
      ? base.map((employee) => ({
          employee,
          record: byEmployee.get(String(employee.id)),
        }))
      : (records.data?.records || []).map((record) => ({
          employee: {
            id: String(record.employee_id),
            name: record.employee_name,
            employeeCode: record.employee_code,
            department: record.department,
          },
          record,
        }))
  )
    .filter(
      (row) =>
        !department || row.employee.department === department,
    )
    .filter(
      (row) =>
        !status ||
        (status === "Not marked"
          ? !row.record
          : row.record?.status === status),
    );

  const summary = summarize(records.data?.summary);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Daily Attendance"
        subtitle="Review and mark attendance for a day"
      >
        {manager && (
          <>
            <button
              type="button"
              onClick={() => setImporting(true)}
              className={secondaryButton}
            >
              Import punches
            </button>

            <button
              type="button"
              disabled={action.busy}
              onClick={processPunches}
              className={secondaryButton}
            >
              {action.busy
                ? "Processing…"
                : `Process punches for ${formatDate(date)}`}
            </button>
          </>
        )}
      </PageHeader>

      <Notice
        notice={action.notice}
        onClose={() => action.setNotice(null)}
      />

      {manager && (
        <p className="text-xs text-muted">
          Attendance is created when HR marks it here or processes the day's
          biometric punches; it is not generated automatically. Processing
          uses each employee's first punch as check-in and last punch as
          check-out, and does not overwrite regularized days.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-4">
        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(event) =>
              event.target.value && setDate(event.target.value)
            }
            className={inputClass}
          />
        </Field>

        {manager && (
          <Field label="Department">
            <DepartmentSelect
              departments={departmentRecords}
              value={department}
              onChange={setDepartment}
            />
          </Field>
        )}

        <Field label="Status">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
          >
            <option value="">All statuses</option>
            {manager && <option>Not marked</option>}
            {STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <div className="flex items-end">
          <button
            type="button"
            onClick={records.reload}
            className={`${secondaryButton} w-full`}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <StatGrid
        stats={[
          { label: "Marked", value: summary.total },
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
            label: "Exceptions",
            value: summary.late + summary.missing + summary.halfDay,
            tone: "text-warning-strong",
          },
        ]}
      />

      <Panel title={`Attendance for ${formatDate(date)}`} padded={false}>
        <DataTable
          loading={records.loading}
          error={records.error}
          rowKey={(row) => row.employee.id}
          rows={rows}
          empty={
            manager
              ? "No employees match these filters."
              : "No attendance recorded for you on this date."
          }
          columns={[
            {
              key: "name",
              label: "Employee",
              className: "font-semibold text-ink",
              render: (row) => row.employee.name,
            },
            {
              key: "code",
              label: "Code",
              render: (row) => row.employee.employeeCode || "—",
            },
            {
              key: "department",
              label: "Department",
              render: (row) => row.employee.department,
            },
            {
              key: "shift",
              label: "Shift",
              render: (row) => row.record?.shift_name || "—",
            },
            {
              key: "in",
              label: "Check In",
              render: (row) => row.record?.check_in_time || "—",
            },
            {
              key: "out",
              label: "Check Out",
              render: (row) => row.record?.check_out_time || "—",
            },
            {
              key: "worked",
              label: "Worked",
              render: (row) =>
                formatMinutes(row.record?.working_minutes),
            },
            {
              key: "status",
              label: "Status",
              render: (row) =>
                row.record ? (
                  <StatusBadge status={row.record.status} />
                ) : (
                  <span className="text-xs text-placeholder">
                    Not marked
                  </span>
                ),
            },
            ...(manager
              ? [
                  {
                    key: "action",
                    label: "Action",
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => setMarking(row)}
                        className={`${linkButton} text-link`}
                      >
                        {row.record ? "Edit" : "Mark"}
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Panel>

      {marking && (
        <MarkAttendanceModal
          companyId={companyId}
          employee={marking.employee}
          record={marking.record}
          date={date}
          shifts={shifts.data?.shifts || []}
          onClose={() => setMarking(null)}
          onSaved={() => {
            setMarking(null);
            records.reload();
          }}
        />
      )}

      {importing && (
        <ImportPunchesModal
          companyId={companyId}
          onClose={() => setImporting(false)}
          onImported={(message) => {
            setImporting(false);
            action.setNotice({
              type: "success",
              message: message || "Punches imported.",
            });
          }}
        />
      )}
    </section>
  );
}
