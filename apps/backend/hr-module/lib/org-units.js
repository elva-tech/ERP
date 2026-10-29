import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  ADMIN_ROLES,
  MANAGER_ROLES,
  fail,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
} from "@/lib/api";

/**
 * Departments and designations share the same shape and rules. Employees
 * reference them by name, so renames are cascaded to employees in the same
 * transaction and deletes are blocked while employees are assigned.
 * Designations can also be linked to departments of the same company
 * (departmentIds); deleting either side removes the link.
 */
const UNITS = {
  department: {
    table: "departments",
    nameColumn: "department_name",
    employeeColumn: "department",
    bodyName: "departmentName",
    label: "Department",
    plural: "departments",
  },
  designation: {
    table: "designations",
    nameColumn: "designation_name",
    employeeColumn: "designation",
    bodyName: "designationName",
    label: "Designation",
    plural: "designations",
    linksDepartments: true,
  },
};

function columns(unit) {
  return `id, company_id, ${unit.nameColumn}, description, status, created_at, updated_at`;
}

function validate(unit, body, { partial }) {
  const values = {};

  if (body[unit.bodyName] !== undefined || !partial) {
    const name = typeof body[unit.bodyName] === "string" ? body[unit.bodyName].trim() : "";
    if (name.length < 2 || name.length > 150) {
      return { message: `${unit.label} name must be between 2 and 150 characters.` };
    }
    values.name = name;
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") {
      return { message: "Description must be text." };
    }
    const description = (body.description || "").trim();
    if (description.length > 5000) {
      return { message: "Description must be at most 5000 characters." };
    }
    values.description = description || null;
  }

  if (body.status !== undefined) {
    if (!["Active", "Inactive"].includes(body.status)) {
      return { message: "Status must be Active or Inactive." };
    }
    values.status = body.status;
  } else if (!partial) {
    values.status = "Active";
  }

  if (unit.linksDepartments && body.departmentIds !== undefined) {
    if (!Array.isArray(body.departmentIds) || body.departmentIds.length > 100) {
      return { message: "departmentIds must be a list of department IDs." };
    }
    const ids = body.departmentIds.map(parseId);
    if (ids.some((value) => !value)) return { message: "departmentIds contains an invalid ID." };
    values.departmentIds = [...new Set(ids)];
  }

  return { values };
}

/** Returns an error message when any department is not in this company. */
async function invalidDepartments(db, companyId, ids) {
  if (!ids.length) return null;
  const found = await db.query(
    "SELECT COUNT(*)::int AS count FROM departments WHERE company_id = $1 AND id = ANY($2::bigint[])",
    [companyId, ids]
  );
  return found.rows[0].count === ids.length ? null : "One or more selected departments do not exist in this company.";
}

async function setDepartments(db, companyId, designationId, ids) {
  await db.query("DELETE FROM designation_departments WHERE designation_id = $1 AND company_id = $2", [
    designationId,
    companyId,
  ]);
  if (ids.length) {
    await db.query(
      `INSERT INTO designation_departments (company_id, designation_id, department_id)
       SELECT $1, $2, unnest($3::bigint[])`,
      [companyId, designationId, ids]
    );
  }
}

async function withDepartments(unit, companyId, rows) {
  if (!unit.linksDepartments || !rows.length) return rows;
  const links = await pool.query(
    `SELECT dd.designation_id, d.id, d.department_name, d.status
     FROM designation_departments dd
     JOIN departments d ON d.id = dd.department_id AND d.company_id = dd.company_id
     WHERE dd.company_id = $1 AND dd.designation_id = ANY($2::bigint[])
     ORDER BY d.department_name`,
    [companyId, rows.map((row) => row.id)]
  );
  const byDesignation = new Map();
  for (const link of links.rows) {
    const key = String(link.designation_id);
    if (!byDesignation.has(key)) byDesignation.set(key, []);
    byDesignation.get(key).push({ id: link.id, department_name: link.department_name, status: link.status });
  }
  return rows.map((row) => ({ ...row, departments: byDesignation.get(String(row.id)) ?? [] }));
}

async function decorate(unit, companyId, rows) {
  return withDepartments(unit, companyId, await withEmployeeCounts(unit, companyId, rows));
}

async function withEmployeeCounts(unit, companyId, rows) {
  const counts = await pool.query(
    `SELECT LOWER(${unit.employeeColumn}) AS name, COUNT(*)::int AS count
     FROM employees WHERE company_id = $1
     GROUP BY LOWER(${unit.employeeColumn})`,
    [companyId]
  );
  const byName = new Map(counts.rows.map((row) => [row.name, row.count]));
  return rows.map((row) => ({
    ...row,
    employee_count: byName.get(String(row[unit.nameColumn]).toLowerCase()) ?? 0,
  }));
}

export function collectionHandlers(kind) {
  const unit = UNITS[kind];

  async function GET(request) {
    await connection();
    try {
      const access = await requireCompanyAccess(request);
      if (access.error) return access.error;

      const result = await pool.query(
        `SELECT ${columns(unit)} FROM ${unit.table}
         WHERE company_id = $1
         ORDER BY ${unit.nameColumn} ASC`,
        [access.companyId]
      );
      const rows = await decorate(unit, access.companyId, result.rows);

      return ok({ count: rows.length, [unit.plural]: rows });
    } catch (error) {
      return serverError(`List ${unit.plural} failed`, error, `Unable to retrieve ${unit.plural}.`);
    }
  }

  async function POST(request) {
    await connection();
    let client;
    try {
      const parsed = await readJsonObject(request);
      if (parsed.error) return parsed.error;

      const access = await requireCompanyAccess(request, {
        roles: MANAGER_ROLES,
        companyId: parsed.body.companyId ?? "",
        mutation: true,
      });
      if (access.error) return access.error;

      const { values, message } = validate(unit, parsed.body, { partial: false });
      if (message) return fail(400, message);

      const duplicate = await pool.query(
        `SELECT 1 FROM ${unit.table} WHERE company_id = $1 AND LOWER(${unit.nameColumn}) = LOWER($2)`,
        [access.companyId, values.name]
      );
      if (duplicate.rowCount) {
        return fail(409, `A ${kind} with this name already exists in this company.`);
      }
      if (values.departmentIds) {
        const invalid = await invalidDepartments(pool, access.companyId, values.departmentIds);
        if (invalid) return fail(400, invalid);
      }

      client = await pool.connect();
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO ${unit.table} (company_id, ${unit.nameColumn}, description, status)
         VALUES ($1, $2, $3, $4)
         RETURNING ${columns(unit)}`,
        [access.companyId, values.name, values.description ?? null, values.status]
      );
      if (values.departmentIds) {
        await setDepartments(client, access.companyId, result.rows[0].id, values.departmentIds);
      }
      await client.query("COMMIT");

      const [row] = await withDepartments(unit, access.companyId, [{ ...result.rows[0], employee_count: 0 }]);
      return ok({ message: `${unit.label} created successfully.`, [kind]: row }, 201);
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      if (error.code === "23505") {
        return fail(409, `A ${kind} with this name already exists in this company.`);
      }
      return serverError(`Create ${kind} failed`, error, `Unable to create ${kind}.`);
    } finally {
      client?.release();
    }
  }

  return { GET, POST };
}

export function itemHandlers(kind) {
  const unit = UNITS[kind];
  const paramName = `${kind}Id`;

  async function GET(request, { params }) {
    await connection();
    try {
      const id = parseId((await params)[paramName]);
      if (!id) return fail(400, `A valid ${paramName} is required.`);

      const access = await requireCompanyAccess(request);
      if (access.error) return access.error;

      const result = await pool.query(
        `SELECT ${columns(unit)} FROM ${unit.table} WHERE id = $1 AND company_id = $2`,
        [id, access.companyId]
      );
      if (!result.rowCount) return fail(404, `${unit.label} not found.`);

      const [row] = await decorate(unit, access.companyId, result.rows);
      return ok({ [kind]: row });
    } catch (error) {
      return serverError(`Get ${kind} failed`, error, `Unable to retrieve ${kind}.`);
    }
  }

  async function PATCH(request, { params }) {
    await connection();
    const id = parseId((await params)[paramName]);
    if (!id) return fail(400, `A valid ${paramName} is required.`);

    let client;
    try {
      const access = await requireCompanyAccess(request, {
        roles: MANAGER_ROLES,
        mutation: true,
      });
      if (access.error) return access.error;

      const parsed = await readJsonObject(request);
      if (parsed.error) return parsed.error;

      const { values, message } = validate(unit, parsed.body, { partial: true });
      if (message) return fail(400, message);
      if (Object.keys(values).length === 0) {
        return fail(400, "No valid fields provided for update.");
      }

      client = await pool.connect();
      await client.query("BEGIN");

      const currentResult = await client.query(
        `SELECT ${columns(unit)} FROM ${unit.table}
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, access.companyId]
      );
      const current = currentResult.rows[0];
      if (!current) {
        await client.query("ROLLBACK");
        return fail(404, `${unit.label} not found.`);
      }

      const oldName = current[unit.nameColumn];
      const renamed = values.name !== undefined && values.name !== oldName;

      if (renamed) {
        const duplicate = await client.query(
          `SELECT 1 FROM ${unit.table}
           WHERE company_id = $1 AND LOWER(${unit.nameColumn}) = LOWER($2) AND id <> $3`,
          [access.companyId, values.name, id]
        );
        if (duplicate.rowCount) {
          await client.query("ROLLBACK");
          return fail(409, `A ${kind} with this name already exists in this company.`);
        }
      }

      const sets = [];
      const args = [];
      if (values.name !== undefined) {
        args.push(values.name);
        sets.push(`${unit.nameColumn} = $${args.length}`);
      }
      if (values.description !== undefined) {
        args.push(values.description);
        sets.push(`description = $${args.length}`);
      }
      if (values.status !== undefined) {
        args.push(values.status);
        sets.push(`status = $${args.length}`);
      }
      args.push(id, access.companyId);

      if (values.departmentIds) {
        const invalid = await invalidDepartments(client, access.companyId, values.departmentIds);
        if (invalid) {
          await client.query("ROLLBACK");
          return fail(400, invalid);
        }
        await setDepartments(client, access.companyId, id, values.departmentIds);
      }

      const updated = await client.query(
        `UPDATE ${unit.table}
         SET ${[...sets, "updated_at = NOW()"].join(", ")}
         WHERE id = $${args.length - 1} AND company_id = $${args.length}
         RETURNING ${columns(unit)}`,
        args
      );

      if (renamed) {
        await client.query(
          `UPDATE employees
           SET ${unit.employeeColumn} = $1, updated_at = NOW()
           WHERE company_id = $2 AND LOWER(${unit.employeeColumn}) = LOWER($3)`,
          [values.name, access.companyId, oldName]
        );
      }

      await client.query("COMMIT");

      const [row] = await decorate(unit, access.companyId, updated.rows);
      return ok({ message: `${unit.label} updated successfully.`, [kind]: row });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      if (error.code === "23505") {
        return fail(409, `A ${kind} with this name already exists in this company.`);
      }
      return serverError(`Update ${kind} failed`, error, `Unable to update ${kind}.`);
    } finally {
      client?.release();
    }
  }

  async function DELETE(request, { params }) {
    await connection();
    try {
      const id = parseId((await params)[paramName]);
      if (!id) return fail(400, `A valid ${paramName} is required.`);

      const access = await requireCompanyAccess(request, {
        roles: ADMIN_ROLES,
        mutation: true,
      });
      if (access.error) return access.error;

      const current = await pool.query(
        `SELECT ${unit.nameColumn} AS name FROM ${unit.table} WHERE id = $1 AND company_id = $2`,
        [id, access.companyId]
      );
      if (!current.rowCount) return fail(404, `${unit.label} not found.`);

      const assigned = await pool.query(
        `SELECT COUNT(*)::int AS count FROM employees
         WHERE company_id = $1 AND LOWER(${unit.employeeColumn}) = LOWER($2)`,
        [access.companyId, current.rows[0].name]
      );
      if (assigned.rows[0].count > 0) {
        return fail(
          409,
          `Cannot delete ${kind}: ${assigned.rows[0].count} employee(s) are assigned to it. Reassign them or mark it Inactive.`
        );
      }

      await pool.query(`DELETE FROM ${unit.table} WHERE id = $1 AND company_id = $2`, [
        id,
        access.companyId,
      ]);

      return ok({ message: `${unit.label} deleted successfully.`, [paramName]: id });
    } catch (error) {
      return serverError(`Delete ${kind} failed`, error, `Unable to delete ${kind}.`);
    }
  }

  return { GET, PATCH, DELETE };
}
