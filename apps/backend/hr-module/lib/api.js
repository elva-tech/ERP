import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  getAuthenticatedUser,
  getActiveCompanyMembership,
} from "@/lib/session";
import { isSafeRequestOrigin } from "@/lib/security";

export const MANAGER_ROLES = ["company_admin", "hr_manager"];
export const ADMIN_ROLES = ["company_admin"];

const ID_PATTERN = /^[1-9]\d{0,18}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function ok(data, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function fail(status, message, extra = {}) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

export function parseId(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === "string" && ID_PATTERN.test(value.trim())) {
    return value.trim();
  }
  return null;
}

export function isValidDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function trimmed(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function readJsonObject(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { error: fail(400, "Request body must be valid JSON.") };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: fail(400, "Request body must be a JSON object.") };
  }
  return { body };
}

/**
 * Resolves the authenticated user and verifies an active membership in the
 * requested company. The company ID is only a selector; access is always
 * decided by the membership row on the server.
 */
export async function requireCompanyAccess(request, options = {}) {
  const { roles = [], companyId: explicitCompanyId, mutation = false } = options;

  if (mutation && !isSafeRequestOrigin(request)) {
    return { error: fail(403, "Forbidden request origin.") };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: fail(401, "Authentication required.") };
  }

  const companyId = parseId(
    explicitCompanyId ?? new URL(request.url).searchParams.get("companyId")
  );
  if (!companyId) {
    return { error: fail(400, "A valid companyId is required.") };
  }

  const membership = await getActiveCompanyMembership(user.id, companyId);
  if (!membership) {
    return { error: fail(403, "Active company membership required.") };
  }

  if (roles.length && !roles.includes(membership.role)) {
    return { error: fail(403, "You do not have permission to perform this action.") };
  }

  return { user, membership, companyId };
}

/**
 * Returns the employee record explicitly linked (employees.user_id) to the
 * signed-in user in this company, or null. Emails are never used to infer
 * the link; HR links accounts to employee records on purpose.
 */
export async function findOwnEmployee(companyId, user, db = pool) {
  const result = await db.query(
    `SELECT id, name, email FROM employees
     WHERE company_id = $1 AND user_id = $2
     LIMIT 1`,
    [companyId, user.id]
  );
  return result.rows[0] ?? null;
}

/** True when the signed-in user is the employee the record belongs to. */
export async function isOwnRecord(companyId, user, employeeId, db = pool) {
  const own = await findOwnEmployee(companyId, user, db);
  return Boolean(own) && String(own.id) === String(employeeId);
}

export function isManager(membership) {
  return MANAGER_ROLES.includes(membership.role);
}

export function serverError(context, error, message) {
  console.error(`${context}:`, error?.message || error);
  return fail(500, message);
}
