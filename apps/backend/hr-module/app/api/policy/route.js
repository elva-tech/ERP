import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  ADMIN_ROLES,
  MANAGER_ROLES,
  fail,
  ok,
  readJsonObject,
  requireCompanyAccess,
  serverError,
} from "@/lib/api";
import { POLICY_COLUMNS, readPolicy, validatePolicyInput } from "@/lib/policy";

/**
 * GET /api/policy?companyId=X (managers)
 * The draft HR/payroll policy, the approved snapshot in force, and the
 * decisions still missing before it can be approved.
 */
export async function GET(request) {
  await connection();
  try {
    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES });
    if (access.error) return access.error;
    return ok(await readPolicy(access.companyId));
  } catch (error) {
    return serverError("Read policy failed", error, "Unable to retrieve the company policy.");
  }
}

/**
 * PUT /api/policy { companyId, ...settings } (company_admin)
 * Saves draft settings. Any change bumps the version and returns the policy
 * to Draft; payroll keeps using the previously approved snapshot until the
 * new version is approved.
 */
export async function PUT(request) {
  await connection();
  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;

    const access = await requireCompanyAccess(request, {
      roles: ADMIN_ROLES,
      companyId: parsed.body.companyId ?? "",
      mutation: true,
    });
    if (access.error) return access.error;

    const { values, message } = validatePolicyInput(parsed.body);
    if (message) return fail(400, message);
    const keys = Object.keys(values);
    if (!keys.length) return fail(400, "No policy settings provided.");

    const columns = [...POLICY_COLUMNS, "notes"];
    const insertValues = columns.map((c) => (values[c] === undefined ? null : values[c]));
    const updates = keys.map((k) => `${k} = EXCLUDED.${k}`);

    await pool.query(
      `INSERT INTO company_policies (company_id, ${columns.join(", ")}, updated_by, updated_at)
       VALUES ($1, ${columns.map((_, i) => `$${i + 2}`).join(", ")}, $${columns.length + 2}, NOW())
       ON CONFLICT (company_id) DO UPDATE SET ${updates.join(", ")},
         version = company_policies.version + 1, status = 'Draft',
         updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [access.companyId, ...insertValues, access.user.id]
    );

    return ok({ message: "Policy saved as a draft. Approve it to use it for payroll.", ...(await readPolicy(access.companyId)) });
  } catch (error) {
    if (error.code === "23514") return fail(400, "A policy value violates a database rule.");
    return serverError("Save policy failed", error, "Unable to save the company policy.");
  }
}
