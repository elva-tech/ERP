import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

/**
 * Integration tests must never reach a shared or production database.
 * Only a loopback host, a non-default port and a database name containing
 * "test" are accepted.
 */
export function assertIsolatedTestDatabase(urlString = process.env.DATABASE_URL) {
  if (!urlString) throw new Error("DATABASE_URL is not set for the integration tests.");
  const url = new URL(urlString);
  const database = url.pathname.replace(/^\//, "");
  const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname);
  if (!loopback || (url.port || "5432") === "5432" || !/test/i.test(database)) {
    throw new Error(
      "Refusing to run: DATABASE_URL must be a loopback, non-5432 database whose name contains 'test'.",
    );
  }
  return urlString;
}

export function createTestPool() {
  return new pg.Pool({ connectionString: assertIsolatedTestDatabase(), max: 20 });
}

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

/** Seeds two tenants with admin/hr/employee users (company A) and an admin (company B). */
export async function seedTenants(pool) {
  const suffix = randomBytes(4).toString("hex");
  const password = randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 4);

  const company = async (name) =>
    (await pool.query(
      "INSERT INTO companies (company_name, status) VALUES ($1, 'active') RETURNING id::text",
      [`${name} ${suffix}`],
    )).rows[0].id;

  const user = async (label, companyId, role, status = "active") => {
    const email = `${label}-${suffix}@isolated-test.invalid`;
    const id = (await pool.query(
      "INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id::text",
      [email, passwordHash, label],
    )).rows[0].id;
    await pool.query(
      "INSERT INTO company_memberships (company_id, user_id, role, status) VALUES ($1, $2, $3, $4)",
      [companyId, id, role, status],
    );
    const token = randomBytes(32).toString("hex");
    await pool.query(
      "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
      [id, sha256(token)],
    );
    return { id, email, token, companyId, role };
  };

  const employee = async (companyId, code, userId = null) =>
    (await pool.query(
      `INSERT INTO employees (company_id, employee_code, name, department, designation, email, user_id)
       VALUES ($1, $2, $3, 'Test', 'Tester', $4, $5) RETURNING id::text`,
      [companyId, code, `Employee ${code}`, `${code.toLowerCase()}-${suffix}@isolated-test.invalid`, userId],
    )).rows[0].id;

  const companyA = await company("Tenant A");
  const companyB = await company("Tenant B");
  const adminA = await user("admin-a", companyA, "company_admin");
  const hrA = await user("hr-a", companyA, "hr_manager");
  const employeeA = await user("employee-a", companyA, "employee");
  const adminB = await user("admin-b", companyB, "company_admin");
  const suspendedA = await user("suspended-a", companyA, "hr_manager", "suspended");

  const employeeRecordA = await employee(companyA, "EA1", employeeA.id);
  const employeePeerA = await employee(companyA, "EA2");
  const employeeRecordB = await employee(companyB, "EB1", adminB.id);
  return {
    password,
    companyA,
    companyB,
    adminA,
    hrA,
    employeeA,
    adminB,
    suspendedA,
    employeeRecordA,
    employeePeerA,
    employeeRecordB,
  };
}

export async function cleanupTenants(pool, seed) {
  const companies = [seed.companyA, seed.companyB];
  const users = [seed.adminA, seed.hrA, seed.employeeA, seed.adminB, seed.suspendedA].map((u) => u.id);
  await pool.query("DELETE FROM payroll_run_idempotency WHERE company_id = ANY($1::bigint[])", [companies]);
  await pool.query("DELETE FROM payroll_runs WHERE company_id = ANY($1::bigint[])", [companies]);
  await pool.query("DELETE FROM sessions WHERE user_id = ANY($1::bigint[])", [users]);
  await pool.query("DELETE FROM employees WHERE company_id = ANY($1::bigint[])", [companies]);
  await pool.query("DELETE FROM membership_events WHERE company_id = ANY($1::bigint[])", [companies]);
  await pool.query("DELETE FROM company_memberships WHERE company_id = ANY($1::bigint[])", [companies]);
  await pool.query("DELETE FROM login_attempts WHERE true").catch(() => {});
  await pool.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [users]);
  await pool.query("DELETE FROM companies WHERE id = ANY($1::bigint[])", [companies]);
}
