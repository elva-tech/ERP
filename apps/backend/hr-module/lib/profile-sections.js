import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  fail,
  isManager,
  isOwnRecord,
  isValidDate,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
} from "@/lib/api";

/**
 * Employee profile sections stored in their own tables. Reads: managers or
 * the employee. Writes: managers; the employee may also maintain their own
 * addresses and emergency contacts (selfService). Bank accounts and
 * employment history are HR-maintained. Bank account numbers are masked for
 * everyone except managers.
 */

const text = (label, max, { required = false, min = required ? 1 : 0, pattern, upper = false } = {}) => (value) => {
  if (value === null || value === undefined || value === "") {
    return required ? { error: `${label} is required.` } : { value: null };
  }
  if (typeof value !== "string") return { error: `${label} must be text.` };
  let v = value.trim();
  if (upper) v = v.toUpperCase();
  if (required && !v) return { error: `${label} is required.` };
  if (v.length < min || v.length > max) return { error: `${label} must be ${min}-${max} characters.` };
  if (v && pattern && !pattern.test(v)) return { error: `${label} is not valid.` };
  return { value: v || null };
};
const oneOf = (label, allowed, { required = false } = {}) => (value) => {
  if (value === null || value === undefined || value === "") {
    return required ? { error: `${label} is required.` } : { value: null };
  }
  return allowed.includes(value) ? { value } : { error: `${label} must be one of: ${allowed.join(", ")}.` };
};
const bool = (label) => (value) =>
  value === undefined ? { value: false } : typeof value === "boolean" ? { value } : { error: `${label} must be true or false.` };
const date = (label, { required = false } = {}) => (value) => {
  if (value === null || value === undefined || value === "") {
    return required ? { error: `${label} is required.` } : { value: null };
  }
  return isValidDate(value) && value >= "1900-01-01" ? { value } : { error: `${label} must be a valid date.` };
};

const PHONE = /^[0-9+()\-\s]{6,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SECTIONS = {
  addresses: {
    table: "employee_addresses",
    key: "addresses",
    item: "address",
    label: "Address",
    selfService: true,
    orderBy: "address_type",
    fields: {
      addressType: ["address_type", oneOf("Address type", ["Current", "Permanent"], { required: true })],
      line1: ["line1", text("Address line 1", 200, { required: true })],
      line2: ["line2", text("Address line 2", 200)],
      city: ["city", text("City", 100, { required: true })],
      state: ["state", text("State", 100)],
      postalCode: ["postal_code", text("Postal code", 20, { pattern: /^[A-Za-z0-9\- ]{3,20}$/ })],
      country: ["country", text("Country", 100)],
    },
    duplicate: "This employee already has an address of that type.",
  },
  contacts: {
    table: "employee_emergency_contacts",
    key: "contacts",
    item: "contact",
    label: "Emergency contact",
    selfService: true,
    single: "is_primary",
    orderBy: "is_primary DESC, name",
    fields: {
      name: ["name", text("Name", 200, { required: true, min: 2 })],
      relationship: ["relationship", text("Relationship", 50, { required: true })],
      phone: ["phone", text("Phone", 30, { required: true, pattern: PHONE })],
      alternatePhone: ["alternate_phone", text("Alternate phone", 30, { pattern: PHONE })],
      email: ["email", text("Email", 255, { pattern: EMAIL })],
      isPrimary: ["is_primary", bool("Primary")],
    },
  },
  bankAccounts: {
    table: "employee_bank_accounts",
    key: "bankAccounts",
    item: "bankAccount",
    label: "Bank account",
    selfService: false,
    single: "is_primary",
    orderBy: "is_primary DESC, bank_name",
    masked: "account_number",
    fields: {
      accountHolderName: ["account_holder_name", text("Account holder name", 200, { required: true, min: 2 })],
      bankName: ["bank_name", text("Bank name", 150, { required: true, min: 2 })],
      branch: ["branch", text("Branch", 150)],
      accountNumber: ["account_number", text("Account number", 34, { required: true, pattern: /^[0-9A-Za-z]{6,34}$/ })],
      ifscCode: ["ifsc_code", text("IFSC code", 11, { required: true, upper: true, pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/ })],
      accountType: ["account_type", oneOf("Account type", ["Savings", "Current", "Salary"])],
      isPrimary: ["is_primary", bool("Primary")],
    },
    duplicate: "This account number is already recorded for the employee.",
  },
  history: {
    table: "employee_employment_history",
    key: "history",
    item: "entry",
    label: "Employment history entry",
    selfService: false,
    orderBy: "effective_date DESC, id DESC",
    readOnlyWhere: "source = 'system'",
    extraInsert: { source: "manual" },
    recordedBy: "recorded_by",
    dateColumns: ["effective_date"],
    fields: {
      eventType: [
        "event_type",
        oneOf(
          "Event type",
          ["Joined", "Promotion", "Transfer", "Role Change", "Status Change", "Previous Employment", "Other"],
          { required: true }
        ),
      ],
      effectiveDate: ["effective_date", date("Effective date", { required: true })],
      department: ["department", text("Department", 150)],
      designation: ["designation", text("Designation", 150)],
      organization: ["organization", text("Organization", 200)],
      notes: ["notes", text("Notes", 2000)],
    },
  },
};

function selectList(section, { unmasked }) {
  const columns = ["id", "employee_id", "created_at"];
  if (section.table !== "employee_employment_history") columns.push("updated_at");
  if (section.table === "employee_employment_history") {
    columns.push("previous_department", "previous_designation", "previous_status", "new_status", "source");
  }
  for (const [column] of Object.values(section.fields)) {
    if (column === section.masked && !unmasked) {
      columns.push(`'XXXX' || RIGHT(${column}, 4) AS ${column}`);
    } else if (section.dateColumns?.includes(column)) {
      columns.push(`to_char(${column}, 'YYYY-MM-DD') AS ${column}`);
    } else {
      columns.push(column);
    }
  }
  return columns.join(", ");
}

function validate(section, body, { partial }) {
  const values = {};
  for (const [field, [column, check]] of Object.entries(section.fields)) {
    if (partial && body[field] === undefined) continue;
    const result = check(body[field]);
    if (result.error) return { message: result.error };
    values[column] = result.value;
  }
  return { values };
}

/** Resolves access to an employee's section. */
async function sectionAccess(request, employeeId, section, { write }) {
  const access = await requireCompanyAccess(request, { mutation: write });
  if (access.error) return access;
  const employee = await pool.query("SELECT id FROM employees WHERE id = $1 AND company_id = $2", [
    employeeId,
    access.companyId,
  ]);
  if (!employee.rowCount) return { error: fail(404, "Employee not found.") };
  const manager = isManager(access.membership);
  const own = !manager && (await isOwnRecord(access.companyId, access.user, employeeId));
  if (!manager && !own) return { error: fail(404, "Employee not found.") };
  if (write && !manager && !section.selfService) {
    return { error: fail(403, `Only company admins or HR managers can change ${section.label.toLowerCase()} details.`) };
  }
  return { ...access, manager };
}

function sectionError(section, error, action) {
  if (error.code === "23505") return fail(409, section.duplicate || `This ${section.label.toLowerCase()} already exists.`);
  if (error.code === "23514") return fail(400, `${section.label} has an invalid value.`);
  return serverError(`${action} ${section.label} failed`, error, `Unable to ${action.toLowerCase()} ${section.label.toLowerCase()}.`);
}

export function sectionCollection(name) {
  const section = SECTIONS[name];

  async function GET(request, { params }) {
    await connection();
    try {
      const employeeId = parseId((await params).employeeId);
      if (!employeeId) return fail(400, "A valid employeeId is required.");
      const access = await sectionAccess(request, employeeId, section, { write: false });
      if (access.error) return access.error;
      const result = await pool.query(
        `SELECT ${selectList(section, { unmasked: access.manager })} FROM ${section.table}
         WHERE employee_id = $1 AND company_id = $2 ORDER BY ${section.orderBy}`,
        [employeeId, access.companyId]
      );
      return ok({ count: result.rowCount, [section.key]: result.rows });
    } catch (error) {
      return sectionError(section, error, "List");
    }
  }

  async function POST(request, { params }) {
    await connection();
    let client;
    try {
      const employeeId = parseId((await params).employeeId);
      if (!employeeId) return fail(400, "A valid employeeId is required.");
      const parsed = await readJsonObject(request);
      if (parsed.error) return parsed.error;
      const access = await sectionAccess(request, employeeId, section, { write: true });
      if (access.error) return access.error;
      const { values, message } = validate(section, parsed.body, { partial: false });
      if (message) return fail(400, message);

      Object.assign(values, section.extraInsert ?? {});
      if (section.recordedBy) values[section.recordedBy] = access.user.id;
      const columns = Object.keys(values);
      client = await pool.connect();
      await client.query("BEGIN");
      if (section.single && values[section.single]) {
        await client.query(
          `UPDATE ${section.table} SET ${section.single} = false, updated_at = NOW()
           WHERE employee_id = $1 AND company_id = $2 AND ${section.single}`,
          [employeeId, access.companyId]
        );
      }
      const inserted = await client.query(
        `INSERT INTO ${section.table} (company_id, employee_id, ${columns.join(", ")})
         VALUES ($1, $2, ${columns.map((_, i) => `$${i + 3}`).join(", ")})
         RETURNING id`,
        [access.companyId, employeeId, ...columns.map((c) => values[c])]
      );
      await client.query("COMMIT");
      const row = await pool.query(
        `SELECT ${selectList(section, { unmasked: access.manager })} FROM ${section.table} WHERE id = $1`,
        [inserted.rows[0].id]
      );
      return ok({ message: `${section.label} added.`, [section.item]: row.rows[0] }, 201);
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      return sectionError(section, error, "Add");
    } finally {
      client?.release();
    }
  }

  return { GET, POST };
}

export function sectionItem(name) {
  const section = SECTIONS[name];

  async function load(db, id, employeeId, companyId) {
    const result = await db.query(
      `SELECT id${section.readOnlyWhere ? `, (${section.readOnlyWhere}) AS read_only` : ""}
       FROM ${section.table} WHERE id = $1 AND employee_id = $2 AND company_id = $3 FOR UPDATE`,
      [id, employeeId, companyId]
    );
    return result.rows[0] ?? null;
  }

  async function PATCH(request, { params }) {
    await connection();
    let client;
    try {
      const { employeeId: rawEmployee, itemId: rawItem } = await params;
      const employeeId = parseId(rawEmployee);
      const id = parseId(rawItem);
      if (!employeeId || !id) return fail(400, "A valid employeeId and item ID are required.");
      const parsed = await readJsonObject(request);
      if (parsed.error) return parsed.error;
      const access = await sectionAccess(request, employeeId, section, { write: true });
      if (access.error) return access.error;
      const { values, message } = validate(section, parsed.body, { partial: true });
      if (message) return fail(400, message);
      const columns = Object.keys(values);
      if (!columns.length) return fail(400, "No valid fields provided for update.");

      client = await pool.connect();
      await client.query("BEGIN");
      const current = await load(client, id, employeeId, access.companyId);
      if (!current) {
        await client.query("ROLLBACK");
        return fail(404, `${section.label} not found.`);
      }
      if (current.read_only) {
        await client.query("ROLLBACK");
        return fail(409, "System-recorded history entries cannot be changed.");
      }
      if (section.single && values[section.single]) {
        await client.query(
          `UPDATE ${section.table} SET ${section.single} = false, updated_at = NOW()
           WHERE employee_id = $1 AND company_id = $2 AND ${section.single} AND id <> $3`,
          [employeeId, access.companyId, id]
        );
      }
      const sets = columns.map((c, i) => `${c} = $${i + 1}`);
      if (section.table !== "employee_employment_history") sets.push("updated_at = NOW()");
      await client.query(`UPDATE ${section.table} SET ${sets.join(", ")} WHERE id = $${columns.length + 1}`, [
        ...columns.map((c) => values[c]),
        id,
      ]);
      await client.query("COMMIT");
      const row = await pool.query(
        `SELECT ${selectList(section, { unmasked: access.manager })} FROM ${section.table} WHERE id = $1`,
        [id]
      );
      return ok({ message: `${section.label} updated.`, [section.item]: row.rows[0] });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      return sectionError(section, error, "Update");
    } finally {
      client?.release();
    }
  }

  async function DELETE(request, { params }) {
    await connection();
    let client;
    try {
      const { employeeId: rawEmployee, itemId: rawItem } = await params;
      const employeeId = parseId(rawEmployee);
      const id = parseId(rawItem);
      if (!employeeId || !id) return fail(400, "A valid employeeId and item ID are required.");
      const access = await sectionAccess(request, employeeId, section, { write: true });
      if (access.error) return access.error;
      client = await pool.connect();
      await client.query("BEGIN");
      const current = await load(client, id, employeeId, access.companyId);
      if (!current) {
        await client.query("ROLLBACK");
        return fail(404, `${section.label} not found.`);
      }
      if (current.read_only) {
        await client.query("ROLLBACK");
        return fail(409, "System-recorded history entries cannot be deleted.");
      }
      await client.query(`DELETE FROM ${section.table} WHERE id = $1`, [id]);
      await client.query("COMMIT");
      return ok({ message: `${section.label} deleted.` });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      return sectionError(section, error, "Delete");
    } finally {
      client?.release();
    }
  }

  return { PATCH, DELETE };
}

export { selectList as sectionSelectList };
