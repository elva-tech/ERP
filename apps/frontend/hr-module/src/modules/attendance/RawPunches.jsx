
import { useState } from "react";
import { Download, Printer, ShieldCheck } from "lucide-react";
import { withQuery } from "../../api";
import {
  canManage,
  downloadCsv,
  formatDate,
  inputClass,
  secondaryButton,
  slateButton,
  todayLocal,
  useApi,
} from "../helpers";
import {
  DataTable,
  EmployeeSelect,
  Field,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
} from "../ui";

const SYNC_STATUSES = ["Matched", "Unmatched"];

const punchStatus = (punch) =>
  punch.employee_id ? "Matched" : "Unmatched";

const PUNCH_EXPORT_COLUMNS = [
  { key: "employee_name", label: "Employee", value: (r) => r.employee_name || "" },
  {
    key: "employee_code",
    label: "Employee ID",
    value: (r) => r.employee_code || r.device_user_id || "",
  },
  { key: "device_name", label: "Device", value: (r) => r.device_name || "" },
  {
    key: "device_location",
    label: "Location",
    value: (r) => r.device_location || "",
  },
  { key: "punch_local_time", label: "Timestamp" },
  { key: "punch_type", label: "Punch Type", value: (r) => r.punch_type || "" },
  { key: "received_local_time", label: "Sync Time" },
  { key: "status", label: "Status", value: punchStatus },
];

export function RawPunches({ companyId, role, employees = [] }) {
  const [date, setDate] = useState(todayLocal());
  const [employeeId, setEmployeeId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [location, setLocation] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [exportNotice, setExportNotice] = useState(null);

  const manager = canManage(role);

  const punches = useApi(
    manager
      ? withQuery("/api/attendance/punches", {
          companyId,
          date,
          employeeId,
          unmatched: syncStatus === "Unmatched" ? "1" : "",
        })
      : null,
  );

  const devices = useApi(
    manager ? withQuery("/api/attendance/devices", { companyId }) : null,
  );

  if (!manager) {
    return (
      <Notice
        notice={{
          type: "info",
          message:
            "Raw device punches are available to HR managers and company admins.",
        }}
      />
    );
  }

  const deviceRows = devices.data?.devices || [];

  const locations = [
    ...new Set(deviceRows.map((device) => device.location).filter(Boolean)),
  ].sort();

  const rows = (punches.data?.punches || [])
    .filter((row) => !deviceId || String(row.device_id) === deviceId)
    .filter((row) => !location || row.device_location === location)
    .filter((row) => !syncStatus || punchStatus(row) === syncStatus);

  const employeeLabel =
    employees.find((employee) => String(employee.id) === employeeId)?.name ||
    "All employees";

  const deviceLabel =
    deviceRows.find((device) => String(device.id) === deviceId)?.device_name ||
    "All devices";

  function exportPunches() {
    if (punches.error) {
      setExportNotice({ type: "error", message: punches.error });
      return;
    }

    if (!rows.length) {
      setExportNotice({
        type: "info",
        message: "No punches match these filters, so nothing was exported.",
      });
      return;
    }

    setExportNotice(null);
    downloadCsv(`raw-biometric-punches-${date}.csv`, PUNCH_EXPORT_COLUMNS, rows);
  }

  return (
    <section className="space-y-4">
      <div className="print-only">
        <h2 className="text-lg font-bold text-ink">Raw Biometric Punches</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Immutable record of biometric events from devices
        </p>
        <p className="mt-2 text-sm text-ink">
          Date: {formatDate(date)} · Employee: {employeeLabel} · Device:{" "}
          {deviceLabel} · Location: {location || "All locations"} · Sync
          status: {syncStatus || "All statuses"}
        </p>
        <p className="mt-2 text-sm text-ink">
          Raw biometric records are retained as an audit trail.
        </p>
      </div>

      <div className="no-print">
        <PageHeader
          title="Raw Biometric Punches"
          subtitle="Immutable record of biometric events from devices"
        />
      </div>

      <div className="no-print">
        <Notice
          notice={exportNotice}
          onClose={() => setExportNotice(null)}
        />
      </div>

      {punches.data?.count >= 5000 && (
        <Notice
          notice={{
            type: "info",
            message:
              "This date has at least 5,000 punches. The list and export include the first 5,000 returned by the punches API.",
          }}
        />
      )}

      <div className="no-print grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
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

        <Field label="Employee">
          <EmployeeSelect
            employees={employees}
            value={employeeId}
            onChange={setEmployeeId}
            includeAll
            activeOnly={false}
          />
        </Field>

        <Field label="Device">
          <select
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            className={inputClass}
          >
            <option value="">All devices</option>
            {deviceRows.map((device) => (
              <option key={device.id} value={String(device.id)}>
                {device.device_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Location">
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={inputClass}
          >
            <option value="">All locations</option>
            {locations.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Sync status">
          <select
            value={syncStatus}
            onChange={(event) => setSyncStatus(event.target.value)}
            className={inputClass}
          >
            <option value="">All statuses</option>
            {SYNC_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
        <p className="flex items-start gap-2">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          Raw biometric records are retained as an audit trail.
        </p>

        <span className="no-print flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className={secondaryButton}
          >
            <Printer size={16} aria-hidden="true" /> Print
          </button>

          <button
            type="button"
            onClick={exportPunches}
            className={slateButton}
          >
            <Download size={16} aria-hidden="true" /> Export
          </button>
        </span>
      </div>

      <Panel title="Biometric event log" padded={false}>
        <DataTable
          loading={punches.loading}
          error={punches.error}
          rows={rows}
          empty="No punches recorded for these filters."
          columns={[
            {
              key: "employee_name",
              label: "Employee",
              className: "font-semibold text-ink",
              render: (row) =>
                row.employee_name || (
                  <span className="text-danger">Unknown</span>
                ),
            },
            {
              key: "employee_code",
              label: "Employee ID",
              render: (row) =>
                row.employee_code || row.device_user_id || "—",
            },
            {
              key: "device_name",
              label: "Device",
              wrap: true,
              render: (row) =>
                row.device_name ? (
                  <span>
                    {row.device_name}
                    {row.device_location && (
                      <span className="block text-xs text-muted">
                        {row.device_location}
                      </span>
                    )}
                  </span>
                ) : (
                  "—"
                ),
            },
            { key: "punch_local_time", label: "Timestamp" },
            {
              key: "punch_type",
              label: "Punch Type",
              render: (row) => row.punch_type || "—",
            },
            {
              key: "received_local_time",
              label: "Sync Time",
              render: (row) => row.received_local_time || "—",
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusBadge status={punchStatus(row)} />
              ),
            },
          ]}
        />
      </Panel>
    </section>
  );
}
