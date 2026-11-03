import { pool } from "@/lib/db";
import { POLICY_FIELDS, missingPolicyDecisions } from "@/lib/rules/payroll-rules.mjs";

const COLUMNS = Object.values(POLICY_FIELDS).map((spec) => spec.column);

export const POLICY_SELECT = `SELECT p.company_id, p.version, p.status, ${COLUMNS.map((c) => `p.${c}`).join(", ")},
  p.notes, p.approved_snapshot, p.updated_at, p.approved_at,
  ue.full_name AS updated_by_name, ua.full_name AS approved_by_name
  FROM company_policies p
  LEFT JOIN users ue ON ue.id = p.updated_by
  LEFT JOIN users ua ON ua.id = p.approved_by`;

/** Draft policy row (or a blank, unsaved draft) with the list of missing decisions. */
export async function readPolicy(companyId, db = pool) {
  const result = await db.query(`${POLICY_SELECT} WHERE p.company_id = $1`, [companyId]);
  const row = result.rows[0] ?? {
    company_id: String(companyId),
    version: 0,
    status: "Draft",
    ...Object.fromEntries(COLUMNS.map((c) => [c, null])),
    notes: null,
    approved_snapshot: null,
  };
  return { policy: row, missing: missingPolicyDecisions(row) };
}

/**
 * The policy payroll and attendance actually use: the last approved snapshot,
 * or null when the company has never approved one.
 */
export async function approvedPolicy(companyId, db = pool) {
  const result = await db.query(
    "SELECT approved_snapshot FROM company_policies WHERE company_id = $1",
    [companyId]
  );
  return result.rows[0]?.approved_snapshot ?? null;
}

/** Validates a partial policy update. Returns { values } keyed by column or { message }. */
export function validatePolicyInput(body) {
  const values = {};
  for (const [key, spec] of Object.entries(POLICY_FIELDS)) {
    if (body[key] === undefined) continue;
    const raw = body[key];
    if (raw === null || raw === "") {
      values[spec.column] = null;
      continue;
    }
    if (spec.values) {
      if (!spec.values.includes(raw)) return { message: `${spec.label} must be one of: ${spec.values.join(", ")}.` };
      values[spec.column] = raw;
    } else if (spec.int) {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(n) || n < spec.int[0] || n > spec.int[1]) {
        return { message: `${spec.label} must be a whole number between ${spec.int[0]} and ${spec.int[1]}.` };
      }
      values[spec.column] = n;
    }
  }
  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== "string") return { message: "Notes must be text." };
    const notes = (body.notes || "").trim();
    if (notes.length > 5000) return { message: "Notes must be at most 5000 characters." };
    values.notes = notes || null;
  }
  return { values };
}

export function snapshotOf(row) {
  return {
    version: row.version,
    ...Object.fromEntries(COLUMNS.map((c) => [c, row[c] ?? null])),
  };
}

export { COLUMNS as POLICY_COLUMNS };
