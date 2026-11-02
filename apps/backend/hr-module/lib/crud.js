import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  ADMIN_ROLES,
  MANAGER_ROLES,
  fail,
  isManager,
  isValidDate,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
} from "@/lib/api";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Validates one field according to its spec. Returns { value } or { message }.
 * Spec: { column, type, label, required, min, max, values, default, nullable }
 */
function validateField(spec, raw) {
  const label = spec.label;
  const empty = raw === undefined || raw === null || raw === "";

  if (empty) {
    if (spec.required) return { message: `${label} is required.` };
    return { value: spec.nullable === false ? spec.default : null };
  }

  switch (spec.type) {
    case "string": {
      if (typeof raw !== "string") return { message: `${label} must be text.` };
      const value = raw.trim();
      if (value.length < (spec.min ?? 0) || value.length > (spec.max ?? 5000)) {
        return { message: `${label} must be ${spec.min ?? 0}-${spec.max ?? 5000} characters.` };
      }
      return { value: value || null };
    }
    case "enum":
      if (!spec.values.includes(raw)) {
        return { message: `${label} must be one of: ${spec.values.join(", ")}.` };
      }
      return { value: raw };
    case "int": {
      const value = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(value) || value < (spec.min ?? 0) || value > (spec.max ?? 1e9)) {
        return { message: `${label} must be a whole number between ${spec.min ?? 0} and ${spec.max ?? 1e9}.` };
      }
      return { value };
    }
    case "decimal": {
      const value = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(value) || value < (spec.min ?? 0) || value > (spec.max ?? 1e12)) {
        return { message: `${label} must be a number between ${spec.min ?? 0} and ${spec.max ?? 1e12}.` };
      }
      return { value: Math.round(value * 100) / 100 };
    }
    case "bool":
      if (typeof raw === "boolean") return { value: raw };
      if (raw === "true" || raw === "false") return { value: raw === "true" };
      return { message: `${label} must be true or false.` };
    case "date":
      if (!isValidDate(raw)) return { message: `${label} must be a valid date (YYYY-MM-DD).` };
      return { value: raw };
    case "time":
      if (typeof raw !== "string" || !TIME_PATTERN.test(raw)) {
        return { message: `${label} must be a valid time (HH:MM).` };
      }
      return { value: raw };
    case "id": {
      const value = parseId(raw);
      if (!value) return { message: `${label} is invalid.` };
      return { value };
    }
    default:
      return { message: `${label} has an unsupported type.` };
  }
}

export function validateFields(fields, body, { partial }) {
  const values = {};
  for (const [key, spec] of Object.entries(fields)) {
    if (spec.readOnly) continue;
    if (partial && body[key] === undefined) continue;
    if (!partial && body[key] === undefined && spec.default !== undefined) {
      values[key] = spec.default;
      continue;
    }
    const result = validateField(spec, body[key]);
    if (result.message) return { message: result.message };
    values[key] = result.value;
  }
  return { values };
}

/** Confirms that referenced IDs (e.g. employeeId) belong to the same company. */
async function checkReferences(fields, values, companyId) {
  for (const [key, spec] of Object.entries(fields)) {
    if (!spec.references || values[key] == null) continue;
    const result = await pool.query(
      `SELECT 1 FROM ${spec.references} WHERE id = $1 AND company_id = $2`,
      [values[key], companyId]
    );
    if (!result.rowCount) return `${spec.label} does not belong to this company.`;
  }
  return null;
}

/**
 * Builds GET/POST collection and GET/PATCH/DELETE item handlers for a simple
 * company-owned table. Every query is constrained by company_id.
 */
export function createCrud(config) {
  const {
    table,
    singular,
    plural,
    idParam,
    fields,
    orderBy = "id ASC",
    select,
    restrictedSelect,
    filters = {},
    readRoles = [],
    writeRoles = MANAGER_ROLES,
    deleteRoles = ADMIN_ROLES,
    duplicateMessage = `A ${singular} with these details already exists.`,
    beforeDelete,
    validate,
  } = config;

  const columnList = select || [
    "id",
    "company_id",
    ...Object.values(fields).map((spec) => spec.column),
    "created_at",
    ...(config.noUpdatedAt ? [] : ["updated_at"]),
  ].join(", ");

  /** Non-managers get restrictedSelect (if configured) instead of the full column list. */
  function readColumns(membership) {
    return restrictedSelect && !isManager(membership) ? restrictedSelect : columnList;
  }

  function handleDbError(error, action) {
    if (error.code === "23505") return fail(409, duplicateMessage);
    if (error.code === "23514") return fail(400, `The ${singular} values violate a database rule.`);
    if (error.code === "22001") return fail(400, `A ${singular} value is too long.`);
    if (error.code === "23503") {
      return fail(409, `This ${singular} is referenced by other records and cannot be ${action}.`);
    }
    return null;
  }

  async function list(request) {
    await connection();
    try {
      const access = await requireCompanyAccess(request, { roles: readRoles });
      if (access.error) return access.error;

      const url = new URL(request.url);
      const conditions = ["company_id = $1"];
      const args = [access.companyId];
      for (const [param, filter] of Object.entries(filters)) {
        const raw = url.searchParams.get(param);
        if (!raw) continue;
        const value = filter.parse ? filter.parse(raw) : raw;
        if (value === null || value === undefined) continue;
        args.push(value);
        conditions.push(filter.sql.replace("?", `$${args.length}`));
      }

      const result = await pool.query(
        `SELECT ${readColumns(access.membership)} FROM ${table}
         WHERE ${conditions.join(" AND ")}
         ORDER BY ${orderBy}`,
        args
      );
      return ok({ count: result.rowCount, [plural]: result.rows });
    } catch (error) {
      return serverError(`List ${plural} failed`, error, `Unable to retrieve ${plural}.`);
    }
  }

  async function create(request) {
    await connection();
    try {
      const parsed = await readJsonObject(request);
      if (parsed.error) return parsed.error;

      const access = await requireCompanyAccess(request, {
        roles: writeRoles,
        companyId: parsed.body.companyId ?? "",
        mutation: true,
      });
      if (access.error) return access.error;

      const { values, message } = validateFields(fields, parsed.body, { partial: false });
      if (message) return fail(400, message);

      const customError = validate ? await validate(values, { companyId: access.companyId }) : null;
      if (customError) return fail(400, customError);

      const referenceError = await checkReferences(fields, values, access.companyId);
      if (referenceError) return fail(400, referenceError);

      const keys = Object.keys(values);
      const result = await pool.query(
        `INSERT INTO ${table} (company_id, ${keys.map((k) => fields[k].column).join(", ")})
         VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(", ")})
         RETURNING ${columnList}`,
        [access.companyId, ...keys.map((k) => values[k])]
      );

      return ok({ message: `${capitalize(singular)} created successfully.`, [singular]: result.rows[0] }, 201);
    } catch (error) {
      return (
        handleDbError(error, "created") ||
        serverError(`Create ${singular} failed`, error, `Unable to create ${singular}.`)
      );
    }
  }

  async function read(request, { params }) {
    await connection();
    try {
      const id = parseId((await params)[idParam]);
      if (!id) return fail(400, `A valid ${idParam} is required.`);

      const access = await requireCompanyAccess(request, { roles: readRoles });
      if (access.error) return access.error;

      const result = await pool.query(
        `SELECT ${readColumns(access.membership)} FROM ${table} WHERE id = $1 AND company_id = $2`,
        [id, access.companyId]
      );
      if (!result.rowCount) return fail(404, `${capitalize(singular)} not found.`);
      return ok({ [singular]: result.rows[0] });
    } catch (error) {
      return serverError(`Get ${singular} failed`, error, `Unable to retrieve ${singular}.`);
    }
  }

  async function update(request, { params }) {
    await connection();
    try {
      const id = parseId((await params)[idParam]);
      if (!id) return fail(400, `A valid ${idParam} is required.`);

      const access = await requireCompanyAccess(request, { roles: writeRoles, mutation: true });
      if (access.error) return access.error;

      const parsed = await readJsonObject(request);
      if (parsed.error) return parsed.error;

      const { values, message } = validateFields(fields, parsed.body, { partial: true });
      if (message) return fail(400, message);
      const keys = Object.keys(values);
      if (keys.length === 0) return fail(400, "No valid fields provided for update.");

      if (validate) {
        const current = await pool.query(
          `SELECT ${columnList} FROM ${table} WHERE id = $1 AND company_id = $2`,
          [id, access.companyId]
        );
        if (!current.rowCount) return fail(404, `${capitalize(singular)} not found.`);
        const customError = await validate(values, {
          companyId: access.companyId,
          current: current.rows[0],
        });
        if (customError) return fail(400, customError);
      }

      const referenceError = await checkReferences(fields, values, access.companyId);
      if (referenceError) return fail(400, referenceError);

      const sets = keys.map((k, i) => `${fields[k].column} = $${i + 1}`);
      if (!config.noUpdatedAt) sets.push("updated_at = NOW()");
      const result = await pool.query(
        `UPDATE ${table} SET ${sets.join(", ")}
         WHERE id = $${keys.length + 1} AND company_id = $${keys.length + 2}
         RETURNING ${columnList}`,
        [...keys.map((k) => values[k]), id, access.companyId]
      );
      if (!result.rowCount) return fail(404, `${capitalize(singular)} not found.`);

      return ok({ message: `${capitalize(singular)} updated successfully.`, [singular]: result.rows[0] });
    } catch (error) {
      return (
        handleDbError(error, "updated") ||
        serverError(`Update ${singular} failed`, error, `Unable to update ${singular}.`)
      );
    }
  }

  async function remove(request, { params }) {
    await connection();
    try {
      const id = parseId((await params)[idParam]);
      if (!id) return fail(400, `A valid ${idParam} is required.`);

      const access = await requireCompanyAccess(request, { roles: deleteRoles, mutation: true });
      if (access.error) return access.error;

      if (beforeDelete) {
        const blocker = await beforeDelete(id, access.companyId);
        if (blocker) return fail(409, blocker);
      }

      const result = await pool.query(
        `DELETE FROM ${table} WHERE id = $1 AND company_id = $2 RETURNING id`,
        [id, access.companyId]
      );
      if (!result.rowCount) return fail(404, `${capitalize(singular)} not found.`);

      return ok({ message: `${capitalize(singular)} deleted successfully.`, id: result.rows[0].id });
    } catch (error) {
      return (
        handleDbError(error, "deleted") ||
        serverError(`Delete ${singular} failed`, error, `Unable to delete ${singular}.`)
      );
    }
  }

  return { list, create, read, update, remove };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
