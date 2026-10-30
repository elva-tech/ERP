
import { withQuery } from "../../api";
import {
  canManage,
  employeesInDepartment,
  formatDate,
  inputClass,
  todayLocal,
  useApi,
} from "../helpers";
import {
  DepartmentSelect,
  EmployeeSelect,
  Field,
  Notice,
  StatusBadge,
} from "../ui";
import MasterCrud from "../MasterCrud";

const time = (value) => (value ? String(value).slice(0, 5) : "—");

export function ShiftManagement({ companyId, role }) {
  return (
    <MasterCrud
      title="Shift Management"
      subtitle="Shift timings, grace period and overtime threshold used for attendance calculation"
      companyId={companyId}
      role={role}
      path="/api/attendance/shifts"
      listKey="shifts"
      itemKey="shift"
      columns={[
        { key: "name", label: "Shift", className: "font-semibold" },
        {
          key: "time",
          label: "Timing",
          render: (row) => `${time(row.start_time)} – ${time(row.end_time)}`,
        },
        { key: "grace_minutes", label: "Grace (min)" },
        { key: "break_minutes", label: "Break (min)" },
        { key: "overtime_threshold", label: "OT threshold (min)" },
        { key: "weekly_off", label: "Weekly off" },
        { key: "location", label: "Location" },
        {
          key: "status",
          label: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
      emptyForm={{
        name: "",
        startTime: "09:00",
        endTime: "18:00",
        graceMinutes: "15",
        breakMinutes: "60",
        overtimeThreshold: "30",
        weeklyOff: "Sunday",
        location: "All Locations",
        status: "Active",
      }}
      toForm={(row) => ({
        name: row.name,
        startTime: time(row.start_time),
        endTime: time(row.end_time),
        graceMinutes: String(row.grace_minutes),
        breakMinutes: String(row.break_minutes),
        overtimeThreshold: String(row.overtime_threshold),
        weeklyOff: row.weekly_off || "",
        location: row.location || "",
        status: row.status,
      })}
      toPayload={(form) => ({
        ...form,
        graceMinutes: Number(form.graceMinutes),
        breakMinutes: Number(form.breakMinutes),
        overtimeThreshold: Number(form.overtimeThreshold),
      })}
      fields={(form, set) => (
        <>
          <Field label="Shift name" required className="sm:col-span-2">
            <input
              required
              value={form.name}
              onChange={(event) =>
                set({ ...form, name: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Start time" required>
            <input
              type="time"
              required
              value={form.startTime}
              onChange={(event) =>
                set({ ...form, startTime: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="End time" required>
            <input
              type="time"
              required
              value={form.endTime}
              onChange={(event) =>
                set({ ...form, endTime: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Grace minutes">
            <input
              type="number"
              min="0"
              max="240"
              value={form.graceMinutes}
              onChange={(event) =>
                set({ ...form, graceMinutes: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Break minutes">
            <input
              type="number"
              min="0"
              max="480"
              value={form.breakMinutes}
              onChange={(event) =>
                set({ ...form, breakMinutes: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Overtime threshold (min)">
            <input
              type="number"
              min="0"
              max="600"
              value={form.overtimeThreshold}
              onChange={(event) =>
                set({ ...form, overtimeThreshold: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Weekly off">
            <select
              value={form.weeklyOff}
              onChange={(event) =>
                set({ ...form, weeklyOff: event.target.value })
              }
              className={inputClass}
            >
              {[
                "Sunday",
                "Saturday",
                "Saturday & Sunday",
                "Monday",
                "Friday",
                "Rotational",
              ].map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>
          </Field>

          <Field label="Location">
            <input
              value={form.location}
              onChange={(event) =>
                set({ ...form, location: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                set({ ...form, status: event.target.value })
              }
              className={inputClass}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
        </>
      )}
    />
  );
}

export function BiometricDevices({ companyId, role }) {
  if (!canManage(role)) {
    return (
      <Notice
        notice={{
          type: "info",
          message:
            "Device management is available to HR managers and company admins.",
        }}
      />
    );
  }

  return (
    <MasterCrud
      title="Biometric Devices"
      subtitle="Registered attendance devices. Punch data is imported from the Raw Punches page."
      companyId={companyId}
      role={role}
      path="/api/attendance/devices"
      listKey="devices"
      itemKey="device"
      columns={[
        { key: "device_name", label: "Device", className: "font-semibold" },
        { key: "brand", label: "Brand" },
        { key: "model", label: "Model" },
        { key: "location", label: "Location" },
        { key: "connection_type", label: "Connection" },
        { key: "ip_address", label: "IP address" },
        { key: "serial_number", label: "Serial no." },
        {
          key: "last_sync_at",
          label: "Last import",
          render: (row) =>
            row.last_sync_at
              ? new Date(row.last_sync_at).toLocaleString("en-GB")
              : "Never",
        },
        {
          key: "status",
          label: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
      emptyForm={{
        name: "",
        brand: "",
        model: "",
        location: "",
        connection: "LAN",
        ipAddress: "",
        serialNumber: "",
        status: "Unknown",
      }}
      toForm={(row) => ({
        name: row.device_name,
        brand: row.brand || "",
        model: row.model || "",
        location: row.location || "",
        connection: row.connection_type || "LAN",
        ipAddress: row.ip_address || "",
        serialNumber: row.serial_number || "",
        status: row.status,
      })}
      toPayload={(form) => form}
      fields={(form, set) => (
        <>
          <Field label="Device name / ID" required className="sm:col-span-2">
            <input
              required
              value={form.name}
              onChange={(event) =>
                set({ ...form, name: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Brand">
            <input
              value={form.brand}
              onChange={(event) =>
                set({ ...form, brand: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Model">
            <input
              value={form.model}
              onChange={(event) =>
                set({ ...form, model: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Location">
            <input
              value={form.location}
              onChange={(event) =>
                set({ ...form, location: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Connection">
            <select
              value={form.connection}
              onChange={(event) =>
                set({ ...form, connection: event.target.value })
              }
              className={inputClass}
            >
              {["LAN", "WiFi", "Cloud", "Serial"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>

          <Field label="IP address">
            <input
              value={form.ipAddress}
              onChange={(event) =>
                set({ ...form, ipAddress: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Serial number">
            <input
              value={form.serialNumber}
              onChange={(event) =>
                set({ ...form, serialNumber: event.target.value })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                set({ ...form, status: event.target.value })
              }
              className={inputClass}
            >
              {["Online", "Offline", "Unknown", "Maintenance"].map(
                (item) => (
                  <option key={item}>{item}</option>
                ),
              )}
            </select>
          </Field>
        </>
      )}
    />
  );
}

export function RosterManagement({
  companyId,
  role,
  employees,
  departments,
}) {
  const shifts = useApi(
    withQuery("/api/attendance/shifts", { companyId }),
  );

  const shiftList = (shifts.data?.shifts || []).filter(
    (shift) => shift.status === "Active",
  );

  return (
    <MasterCrud
      title="Roster Management"
      subtitle="Assign employees to shifts for a date range. The effective roster drives late/overtime calculation."
      companyId={companyId}
      role={role}
      path="/api/attendance/rosters"
      listKey="rosters"
      itemKey="roster"
      deleteRoleCheck={canManage}
      columns={[
        {
          key: "employee_name",
          label: "Employee",
          className: "font-semibold",
        },
        { key: "department", label: "Department" },
        { key: "shift_name", label: "Shift" },
        {
          key: "effective_from",
          label: "From",
          render: (row) => formatDate(row.effective_from),
        },
        {
          key: "effective_to",
          label: "To",
          render: (row) =>
            row.effective_to
              ? formatDate(row.effective_to)
              : "Open-ended",
        },
      ]}
      emptyForm={{
        department: "",
        employeeId: "",
        shiftId: "",
        effectiveFrom: todayLocal(),
        effectiveTo: "",
      }}
      toForm={(row) => ({
        department: row.department || "",
        employeeId: String(row.employee_id),
        shiftId: String(row.shift_id),
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to || "",
      })}
      toPayload={(form) => ({
        employeeId: form.employeeId,
        shiftId: form.shiftId,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
      })}
      fields={(form, set) => (
        <>
          <Field label="Department" className="sm:col-span-2">
            <DepartmentSelect
              departments={departments}
              value={form.department}
              onChange={(department) => {
                const keep = employeesInDepartment(
                  employees,
                  department,
                ).some(
                  (employee) =>
                    String(employee.id) === String(form.employeeId),
                );

                set({
                  ...form,
                  department,
                  employeeId: keep ? form.employeeId : "",
                });
              }}
            />
          </Field>

          <Field label="Employee" required className="sm:col-span-2">
            <EmployeeSelect
              employees={employeesInDepartment(
                employees,
                form.department,
              )}
              value={form.employeeId}
              onChange={(value) =>
                set({ ...form, employeeId: value })
              }
              required
            />
          </Field>

          <Field label="Shift" required className="sm:col-span-2">
            <select
              required
              value={form.shiftId}
              onChange={(event) =>
                set({ ...form, shiftId: event.target.value })
              }
              className={inputClass}
            >
              <option value="">
                {shiftList.length ? "Select shift" : "Create a shift first"}
              </option>

              {shiftList.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
    />
  );
}
