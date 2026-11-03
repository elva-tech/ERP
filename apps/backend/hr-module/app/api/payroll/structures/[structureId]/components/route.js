
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  MANAGER_ROLES,
  fail,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
} from "@/lib/api";
import { calculateStructure } from "@/lib/payroll";

async function loadLines(db, structureId) {
  const result = await db.query(
    `SELECT sc.id, sc.component_id, c.name, c.component_type, c.calculation_type, c.percentage_of,
            c.is_statutory, c.status AS component_status,
            sc.amount::float8 AS amount, sc.percentage::float8 AS percentage
     FROM salary_structure_components sc
     JOIN salary_components c ON c.id = sc.component_id
     WHERE sc.structure_id = $1
     ORDER BY CASE c.component_type WHEN 'Earning' THEN 1 WHEN 'Deduction' THEN 2 ELSE 3 END, c.name`,
    [structureId]
  );
  return result.rows;
}

async function findStructure(structureId, companyId) {
  const result = await pool.query(
    "SELECT id, name FROM salary_structures WHERE id = $1 AND company_id = $2",
    [structureId, companyId]
  );
  return result.rows[0];
}

/**
 * GET /api/payroll/structures/[structureId]/components?companyId=X[&previewCtc=600000]
 * Lists structure lines; previewCtc returns a monthly calculation preview.
 */
export async function GET(request, { params }) {
  await connection();

  try {
    const structureId = parseId((await params).structureId);
    if (!structureId) return fail(400, "A valid structureId is required.");

    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES });
    if (access.error) return access.error;

    if (!(await findStructure(structureId, access.companyId))) return fail(404, "Salary structure not found.");

    const lines = await loadLines(pool, structureId);
    const previewCtc = Number(new URL(request.url).searchParams.get("previewCtc"));
    const preview = previewCtc > 0 ? calculateStructure(lines, previewCtc) : null;

    return ok({ count: lines.length, components: lines, preview });
  } catch (error) {
    return serverError("List structure components failed", error, "Unable to retrieve structure components.");
  }
}

/**
 * PUT /api/payroll/structures/[structureId]/components
 * { components: [{ componentId, amount?, percentage? }] } replaces all lines.
 * Fixed components need amount (monthly); Percentage components need percentage.
 */
export async function PUT(request, { params }) {
  await connection();

  let client;
  try {
    const structureId = parseId((await params).structureId);
    if (!structureId) return fail(400, "A valid structureId is required.");

    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES, mutation: true });
    if (access.error) return access.error;

    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const items = parsed.body.components;
    if (!Array.isArray(items) || items.length > 100) return fail(400, "components must be an array (max 100).");

    if (!(await findStructure(structureId, access.companyId))) return fail(404, "Salary structure not found.");

    const ids = items.map((item) => parseId(item?.componentId));
    if (ids.some((id) => !id)) return fail(400, "Every line needs a valid componentId.");
    if (new Set(ids).size !== ids.length) return fail(400, "A component can only appear once in a structure.");

    const components = await pool.query(
      `SELECT id::text, name, component_type, calculation_type, percentage_of, is_statutory
       FROM salary_components WHERE company_id = $1 AND id = ANY($2::bigint[])`,
      [access.companyId, ids]
    );
    const byId = new Map(components.rows.map((c) => [c.id, c]));

    const lines = [];
    for (const [index, item] of items.entries()) {
      const component = byId.get(ids[index]);
      if (!component) return fail(400, `Line ${index + 1}: component not found in this company.`);
      const number = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
      const amount = number(item.amount);
      const percentage = number(item.percentage);
      if (component.calculation_type === "Fixed") {
        if (amount === null || !Number.isFinite(amount) || amount < 0 || amount > 1e12) {
          return fail(400, `"${component.name}" needs a monthly amount of 0 or more.`);
        }
      } else if (percentage === null || !Number.isFinite(percentage) || percentage < 0 || percentage > 1000) {
        return fail(400, `"${component.name}" needs a percentage between 0 and 1000.`);
      }
      lines.push({
        component_id: component.id,
        ...component,
        amount: component.calculation_type === "Fixed" ? amount : null,
        percentage: component.calculation_type === "Percentage" ? percentage : null,
      });
    }

    const check = calculateStructure(lines, 1200000);
    if (check.error) return fail(400, check.error);

    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("DELETE FROM salary_structure_components WHERE structure_id = $1", [structureId]);
    for (const line of lines) {
      await client.query(
        `INSERT INTO salary_structure_components (company_id, structure_id, component_id, amount, percentage)
         VALUES ($1, $2, $3, $4, $5)`,
        [access.companyId, structureId, line.component_id, line.amount, line.percentage]
      );
    }
    await client.query("UPDATE salary_structures SET updated_at = NOW() WHERE id = $1", [structureId]);
    await client.query("COMMIT");

    return ok({ message: "Salary structure components saved.", components: await loadLines(pool, structureId) });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Save structure components failed", error, "Unable to save structure components.");
  } finally {
    client?.release();
  }
}
