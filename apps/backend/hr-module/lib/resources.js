import { createCrud } from "@/lib/crud";
import { pool } from "@/lib/db";

const STATUS = { column: "status", type: "enum", label: "Status", values: ["Active", "Inactive"], default: "Active" };
const yearFilter = (column) => ({
  sql: `EXTRACT(YEAR FROM ${column}) = ?`,
  parse: (raw) => (/^\d{4}$/.test(raw) ? Number(raw) : null),
});

export const shifts = createCrud({
  table: "shifts",
  singular: "shift",
  plural: "shifts",
  idParam: "shiftId",
  orderBy: "name ASC",
  duplicateMessage: "A shift with this name already exists.",
  fields: {
    name: { column: "name", type: "string", label: "Shift name", required: true, min: 2, max: 100 },
    startTime: { column: "start_time", type: "time", label: "Start time", required: true },
    endTime: { column: "end_time", type: "time", label: "End time", required: true },
    graceMinutes: { column: "grace_minutes", type: "int", label: "Grace minutes", min: 0, max: 240, default: 15 },
    breakMinutes: { column: "break_minutes", type: "int", label: "Break minutes", min: 0, max: 480, default: 60 },
    overtimeThreshold: { column: "overtime_threshold", type: "int", label: "Overtime threshold", min: 0, max: 600, default: 30 },
    weeklyOff: { column: "weekly_off", type: "string", label: "Weekly off", max: 20, default: "Sunday" },
    location: { column: "location", type: "string", label: "Location", max: 200, default: "All Locations" },
    status: STATUS,
  },
  validate: (values, { current } = {}) => {
    const start = values.startTime ?? current?.start_time;
    const end = values.endTime ?? current?.end_time;
    if (start && end && String(start).slice(0, 5) === String(end).slice(0, 5)) {
      return "Start and end time cannot be the same.";
    }
    return null;
  },
});

export const devices = createCrud({
  table: "biometric_devices",
  singular: "device",
  plural: "devices",
  idParam: "deviceId",
  orderBy: "device_name ASC",
  duplicateMessage: "A device with this name already exists.",
  fields: {
    name: { column: "device_name", type: "string", label: "Device name", required: true, min: 1, max: 200 },
    brand: { column: "brand", type: "string", label: "Brand", max: 100 },
    model: { column: "model", type: "string", label: "Model", max: 100 },
    location: { column: "location", type: "string", label: "Location", max: 200 },
    connection: {
      column: "connection_type",
      type: "enum",
      label: "Connection type",
      values: ["LAN", "WiFi", "Cloud", "Serial"],
      default: "LAN",
    },
    ipAddress: { column: "ip_address", type: "string", label: "IP address", max: 50 },
    serialNumber: { column: "serial_number", type: "string", label: "Serial number", max: 100 },
    status: {
      column: "status",
      type: "enum",
      label: "Status",
      values: ["Online", "Offline", "Unknown", "Maintenance"],
      default: "Unknown",
    },
  },
  select:
    "id, company_id, device_name, brand, model, location, connection_type, ip_address, serial_number, status, last_sync_at, created_at, updated_at",
  restrictedSelect:
    "id, company_id, device_name, brand, model, location, connection_type, status, last_sync_at, created_at, updated_at",
});

export const holidays = createCrud({
  table: "holidays",
  singular: "holiday",
  plural: "holidays",
  idParam: "holidayId",
  orderBy: "holiday_date ASC",
  duplicateMessage: "A holiday with this name already exists on this date.",
  filters: { year: yearFilter("holiday_date") },
  select: "id, company_id, name, to_char(holiday_date, 'YYYY-MM-DD') AS holiday_date, type, location, description, created_at, updated_at",
  fields: {
    name: { column: "name", type: "string", label: "Holiday name", required: true, min: 2, max: 200 },
    date: { column: "holiday_date", type: "date", label: "Holiday date", required: true },
    type: {
      column: "type",
      type: "enum",
      label: "Holiday type",
      values: ["National", "Regional", "Company", "Restricted"],
      default: "National",
    },
    location: { column: "location", type: "string", label: "Location", max: 200, default: "All Locations" },
    description: { column: "description", type: "string", label: "Description", max: 2000 },
  },
});

export const leaveTypes = createCrud({
  table: "leave_types",
  singular: "leaveType",
  plural: "leaveTypes",
  idParam: "leaveTypeId",
  orderBy: "name ASC",
  duplicateMessage: "A leave type with this name already exists.",
  fields: {
    name: { column: "name", type: "string", label: "Leave type name", required: true, min: 2, max: 100 },
    description: { column: "description", type: "string", label: "Description", max: 2000 },
    daysPerYear: { column: "days_per_year", type: "decimal", label: "Days per year", min: 0, max: 366, default: 0 },
    carryForward: { column: "carry_forward", type: "bool", label: "Carry forward", default: false },
    maxCarryForwardDays: {
      column: "max_carry_forward_days",
      type: "decimal",
      label: "Max carry-forward days",
      min: 0,
      max: 366,
      default: 0,
    },
    applicableGender: {
      column: "applicable_gender",
      type: "enum",
      label: "Applicable gender",
      values: ["All", "Male", "Female", "Other"],
      default: "All",
    },
    isPaid: { column: "is_paid", type: "bool", label: "Paid leave", default: true },
    status: STATUS,
  },
});

export const rosters = createCrud({
  table: "rosters",
  singular: "roster",
  plural: "rosters",
  idParam: "rosterId",
  orderBy: "effective_from DESC, id DESC",
  writeRoles: ["company_admin", "hr_manager"],
  deleteRoles: ["company_admin", "hr_manager"],
  select: `id, company_id, employee_id, shift_id,
    to_char(effective_from, 'YYYY-MM-DD') AS effective_from,
    to_char(effective_to, 'YYYY-MM-DD') AS effective_to,
    (SELECT name FROM employees e WHERE e.id = rosters.employee_id) AS employee_name,
    (SELECT department FROM employees e WHERE e.id = rosters.employee_id) AS department,
    (SELECT name FROM shifts s WHERE s.id = rosters.shift_id) AS shift_name,
    created_at, updated_at`,
  filters: {
    employeeId: { sql: "employee_id = ?", parse: (raw) => (/^[1-9]\d{0,18}$/.test(raw) ? raw : null) },
  },
  fields: {
    employeeId: { column: "employee_id", type: "id", label: "Employee", required: true, references: "employees" },
    shiftId: { column: "shift_id", type: "id", label: "Shift", required: true, references: "shifts" },
    effectiveFrom: { column: "effective_from", type: "date", label: "Effective from", required: true },
    effectiveTo: { column: "effective_to", type: "date", label: "Effective to" },
  },
  validate: (values, { current } = {}) => {
    const from = values.effectiveFrom ?? current?.effective_from;
    const to = values.effectiveTo === undefined ? current?.effective_to : values.effectiveTo;
    if (from && to && to < from) return "Effective to must be on or after effective from.";
    return null;
  },
});

const PAYROLL_READ = ["company_admin", "hr_manager"];

export const salaryComponents = createCrud({
  table: "salary_components",
  singular: "component",
  plural: "components",
  idParam: "componentId",
  orderBy: "component_type ASC, name ASC",
  readRoles: PAYROLL_READ,
  duplicateMessage: "A salary component with this name already exists.",
  beforeDelete: async (id) => {
    const used = await pool.query(
      "SELECT 1 FROM salary_structure_components WHERE component_id = $1 LIMIT 1",
      [id]
    );
    return used.rowCount ? "This component is used in a salary structure. Remove it there or mark it Inactive." : null;
  },
  fields: {
    name: { column: "name", type: "string", label: "Component name", required: true, min: 2, max: 100 },
    componentType: {
      column: "component_type",
      type: "enum",
      label: "Component type",
      values: ["Earning", "Deduction", "Employer Contribution"],
      default: "Earning",
    },
    calculationType: {
      column: "calculation_type",
      type: "enum",
      label: "Calculation type",
      values: ["Fixed", "Percentage"],
      default: "Fixed",
    },
    percentageOf: { column: "percentage_of", type: "string", label: "Percentage of", max: 100 },
    isStatutory: { column: "is_statutory", type: "bool", label: "Statutory", default: false },
    status: STATUS,
  },
  validate: (values, { current } = {}) => {
    const calc = values.calculationType ?? current?.calculation_type;
    const base = values.percentageOf === undefined ? current?.percentage_of : values.percentageOf;
    if (calc === "Percentage" && !base) {
      return "Percentage components need 'Percentage of' (CTC, Gross, or another component name).";
    }
    return null;
  },
});

export const salaryStructures = createCrud({
  table: "salary_structures",
  singular: "structure",
  plural: "structures",
  idParam: "structureId",
  orderBy: "name ASC",
  readRoles: PAYROLL_READ,
  duplicateMessage: "A salary structure with this name already exists.",
  select: `id, company_id, name, description, ctc_min::float8 AS ctc_min, ctc_max::float8 AS ctc_max, status,
    (SELECT COUNT(*)::int FROM salary_structure_components c WHERE c.structure_id = salary_structures.id) AS component_count,
    (SELECT COUNT(*)::int FROM employee_salary_assignments a WHERE a.structure_id = salary_structures.id) AS assignment_count,
    created_at, updated_at`,
  beforeDelete: async (id) => {
    const used = await pool.query("SELECT 1 FROM employee_salary_assignments WHERE structure_id = $1 LIMIT 1", [id]);
    return used.rowCount ? "This structure is assigned to employees. Mark it Inactive instead." : null;
  },
  fields: {
    name: { column: "name", type: "string", label: "Structure name", required: true, min: 2, max: 200 },
    description: { column: "description", type: "string", label: "Description", max: 2000 },
    ctcMin: { column: "ctc_min", type: "decimal", label: "Minimum CTC", min: 0, max: 1e12 },
    ctcMax: { column: "ctc_max", type: "decimal", label: "Maximum CTC", min: 0, max: 1e12 },
    status: STATUS,
  },
  validate: (values, { current } = {}) => {
    const min = values.ctcMin === undefined ? current?.ctc_min : values.ctcMin;
    const max = values.ctcMax === undefined ? current?.ctc_max : values.ctcMax;
    if (min != null && max != null && Number(max) < Number(min)) return "Maximum CTC must be at least the minimum CTC.";
    return null;
  },
});

export const salaryAssignments = createCrud({
  table: "employee_salary_assignments",
  singular: "assignment",
  plural: "assignments",
  idParam: "assignmentId",
  orderBy: "effective_from DESC, id DESC",
  readRoles: PAYROLL_READ,
  deleteRoles: PAYROLL_READ,
  select: `id, company_id, employee_id, structure_id, ctc_annual::float8 AS ctc_annual,
    to_char(effective_from, 'YYYY-MM-DD') AS effective_from,
    to_char(effective_to, 'YYYY-MM-DD') AS effective_to,
    (SELECT name FROM employees e WHERE e.id = employee_salary_assignments.employee_id) AS employee_name,
    (SELECT employee_code FROM employees e WHERE e.id = employee_salary_assignments.employee_id) AS employee_code,
    (SELECT name FROM salary_structures s WHERE s.id = employee_salary_assignments.structure_id) AS structure_name,
    created_at, updated_at`,
  filters: {
    employeeId: { sql: "employee_id = ?", parse: (raw) => (/^[1-9]\d{0,18}$/.test(raw) ? raw : null) },
  },
  fields: {
    employeeId: { column: "employee_id", type: "id", label: "Employee", required: true, references: "employees" },
    structureId: { column: "structure_id", type: "id", label: "Salary structure", required: true, references: "salary_structures" },
    ctcAnnual: { column: "ctc_annual", type: "decimal", label: "Annual CTC", required: true, min: 1, max: 1e12 },
    effectiveFrom: { column: "effective_from", type: "date", label: "Effective from", required: true },
    effectiveTo: { column: "effective_to", type: "date", label: "Effective to" },
  },
  validate: async (values, { companyId, current } = {}) => {
    const from = values.effectiveFrom ?? current?.effective_from;
    const to = values.effectiveTo === undefined ? current?.effective_to : values.effectiveTo;
    if (from && to && to < from) return "Effective to must be on or after effective from.";

    const employeeId = values.employeeId ?? current?.employee_id;
    const overlap = await pool.query(
      `SELECT 1 FROM employee_salary_assignments
       WHERE company_id = $1 AND employee_id = $2 AND ($3::bigint IS NULL OR id <> $3::bigint)
         AND effective_from <= COALESCE($5::date, 'infinity'::date)
         AND COALESCE(effective_to, 'infinity'::date) >= $4::date
       LIMIT 1`,
      [companyId, employeeId, current?.id ?? null, from, to ?? null]
    );
    if (overlap.rowCount) return "This employee already has a salary assignment overlapping these dates.";
    return null;
  },
});
