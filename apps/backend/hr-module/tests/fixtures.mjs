// Controlled, synthetic test fixtures for the HTTP end-to-end tests.
// Every record is tagged so it can never be confused with business data:
//   companies: "E2E Test Company <X> [automated]"
//   users:     *@elva-test.invalid  (reserved .invalid TLD, never deliverable)
// teardown() removes only records belonging to those tagged companies/users.

import { createRequire } from "node:module";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const require = createRequire(path.join(appRoot, "package.json"));
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

export const TEST_EMAIL_DOMAIN = "elva-test.invalid";
export const TEST_COMPANY_PATTERN = "E2E Test Company % [automated]";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = path.join(appRoot, ".env.local");
  const line = fs
    .readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL is not configured in .env.local");
  return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

export function createPool() {
  return new Pool({ connectionString: loadDatabaseUrl(), connectionTimeoutMillis: 5000 });
}

/** Database names accepted as dedicated, disposable test databases. */
export const TEST_DATABASE_PATTERN = /(^|_)test(_|$)/i;

/**
 * Refuses to continue unless the fixtures connection points at a dedicated
 * test database (its name must contain "test", e.g. hrms_test). The tests
 * create and delete rows, so they must never run against business data.
 */
export async function assertTestDatabase(pool) {
  const result = await pool.query("SELECT current_database() AS name");
  const name = result.rows[0].name;
  if (!TEST_DATABASE_PATTERN.test(name)) {
    throw new Error(
      `Refusing to run: database "${name}" is not a dedicated test database. ` +
        'Set DATABASE_URL to a database whose name contains "test" (e.g. hrms_test).'
    );
  }
  return name;
}

/** Email addresses used by login-throttling tests that have no user row. */
export const THROTTLE_UNKNOWN_EMAIL = `e2e.throttle-unknown@${TEST_EMAIL_DOMAIN}`;

/** The only emails registration tests may use, so their rate-limit rows can be removed. */
export const REGISTRATION_TEST_EMAILS = [
  `e2e.register-a@${TEST_EMAIL_DOMAIN}`,
  `e2e.register-b@${TEST_EMAIL_DOMAIN}`,
];

const loginHash = (email) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

// Same default as lib/document-storage.js; set DOCUMENT_STORAGE_DIR to match
// the backend under test if it uses a different directory.
const DOCUMENT_ROOT = path.resolve(process.env.DOCUMENT_STORAGE_DIR || path.join(appRoot, "storage", "documents"));

/**
 * Deletes only the exact files recorded for fixture documents. Company folders
 * are never removed: the directory may be shared with a non-test backend whose
 * company IDs overlap with the test database's.
 */
function removeStoredFiles(keys) {
  let removed = 0;
  for (const key of keys) {
    if (!/^[0-9]+\/[0-9a-f-]{36}\.(pdf|png|jpg)$/.test(key)) continue;
    const full = path.resolve(DOCUMENT_ROOT, key);
    if (!full.startsWith(DOCUMENT_ROOT + path.sep)) continue;
    try {
      fs.unlinkSync(full);
      removed += 1;
    } catch (error) {
      if (error.code !== "ENOENT") console.warn(`Could not remove fixture document file: ${error.code}`);
    }
  }
  return removed;
}

// Child tables first, so foreign keys never block cleanup.
const COMPANY_TABLES = [
  "membership_events",
  "company_invitations",
  "employee_document_events",
  "employee_documents",
  "employee_employment_history",
  "employee_bank_accounts",
  "employee_emergency_contacts",
  "employee_addresses",
  "designation_departments",
  "approval_audit_log",
  "approval_delegates",
  "company_policies",
  "payroll_advance_recoveries",
  "payslips",
  "payroll_runs",
  "employee_salary_assignments",
  "employee_advances",
  "leave_balances",
  "leave_requests",
  "leave_types",
  "holidays",
  "attendance_regularizations",
  "attendance_records",
  "raw_punches",
  "rosters",
  "shifts",
  "biometric_devices",
  "employees",
  "designations",
  "departments",
  "company_memberships",
];

export async function teardown(pool) {
  await assertTestDatabase(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const companies = await client.query(
      "SELECT id FROM companies WHERE company_name LIKE $1",
      [TEST_COMPANY_PATTERN]
    );
    const ids = companies.rows.map((row) => row.id);
    let storageKeys = [];

    if (ids.length) {
      const documents = await client.query(
        "SELECT storage_key FROM employee_documents WHERE company_id = ANY($1::bigint[])",
        [ids]
      );
      storageKeys = documents.rows.map((row) => row.storage_key);
      await client.query(
        `DELETE FROM salary_structure_components WHERE structure_id IN
           (SELECT id FROM salary_structures WHERE company_id = ANY($1::bigint[]))`,
        [ids]
      );
      for (const table of COMPANY_TABLES) {
        await client.query(`DELETE FROM ${table} WHERE company_id = ANY($1::bigint[])`, [ids]);
      }
      await client.query("DELETE FROM salary_structures WHERE company_id = ANY($1::bigint[])", [ids]);
      await client.query("DELETE FROM salary_components WHERE company_id = ANY($1::bigint[])", [ids]);
      await client.query("DELETE FROM companies WHERE id = ANY($1::bigint[])", [ids]);
    }

    const users = await client.query("SELECT id, email FROM users WHERE email LIKE $1", [
      `%@${TEST_EMAIL_DOMAIN}`,
    ]);
    const userIds = users.rows.map((row) => row.id);
    const loginHashes = [...users.rows.map((row) => loginHash(row.email)), loginHash(THROTTLE_UNKNOWN_EMAIL)];
    await client.query("DELETE FROM login_attempts WHERE identifier_hash = ANY($1::text[])", [loginHashes]);
    await client.query("DELETE FROM registration_attempts WHERE email_hash = ANY($1::text[])", [
      REGISTRATION_TEST_EMAILS.map(loginHash),
    ]);
    if (userIds.length) {
      await client.query("DELETE FROM sessions WHERE user_id = ANY($1::bigint[])", [userIds]);
      await client.query("DELETE FROM company_memberships WHERE user_id = ANY($1::bigint[])", [userIds]);
      await client.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [userIds]);
    }

    await client.query("COMMIT");
    const files = removeStoredFiles(storageKeys);
    return { companies: ids.length, users: userIds.length, files };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createCompany(client, label) {
  const result = await client.query(
    `INSERT INTO companies (company_name, status, onboarding_source, approved_at)
     VALUES ($1, 'active', 'platform_admin', NOW())
     RETURNING id`,
    [`E2E Test Company ${label} [automated]`]
  );
  return String(result.rows[0].id);
}

async function createUser(client, { key, fullName, companyId, role, password }) {
  const email = `e2e.${key}@${TEST_EMAIL_DOMAIN}`;
  const hash = await bcrypt.hash(password, 10);
  const user = await client.query(
    `INSERT INTO users (email, password_hash, full_name, status, email_verified_at)
     VALUES ($1, $2, $3, 'active', NOW())
     RETURNING id`,
    [email, hash, fullName]
  );
  await client.query(
    `INSERT INTO company_memberships (company_id, user_id, role, status)
     VALUES ($1, $2, $3, 'active')`,
    [companyId, user.rows[0].id, role]
  );
  return { email, password, userId: String(user.rows[0].id), companyId, role };
}

export async function setup(pool) {
  await teardown(pool);

  const password = `T3st-${randomBytes(12).toString("hex")}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const companyA = await createCompany(client, "A");
    const companyB = await createCompany(client, "B");
    // Company C is used only by the access-control suite (invitations,
    // suspension, last-admin protection), so role changes there cannot
    // affect the other suites.
    const companyC = await createCompany(client, "C");

    const users = {
      adminA: await createUser(client, {
        key: "admin-a",
        fullName: "E2E Admin A",
        companyId: companyA,
        role: "company_admin",
        password,
      }),
      hrA: await createUser(client, {
        key: "hr-a",
        fullName: "E2E HR Manager A",
        companyId: companyA,
        role: "hr_manager",
        password,
      }),
      employeeA: await createUser(client, {
        key: "employee-a",
        fullName: "E2E Employee A",
        companyId: companyA,
        role: "employee",
        password,
      }),
      adminB: await createUser(client, {
        key: "admin-b",
        fullName: "E2E Admin B",
        companyId: companyB,
        role: "company_admin",
        password,
      }),
      throttleA: await createUser(client, {
        key: "throttle-a",
        fullName: "E2E Throttle Test A",
        companyId: companyA,
        role: "employee",
        password,
      }),
      multi: await createUser(client, {
        key: "multi",
        fullName: "E2E Multi-Company User",
        companyId: companyA,
        role: "employee",
        password,
      }),
      adminC: await createUser(client, {
        key: "admin-c",
        fullName: "E2E Admin C",
        companyId: companyC,
        role: "company_admin",
        password,
      }),
      adminC2: await createUser(client, {
        key: "admin-c2",
        fullName: "E2E Second Admin C",
        companyId: companyC,
        role: "company_admin",
        password,
      }),
      hrC: await createUser(client, {
        key: "hr-c",
        fullName: "E2E HR Manager C",
        companyId: companyC,
        role: "hr_manager",
        password,
      }),
      staffC: await createUser(client, {
        key: "staff-c",
        fullName: "E2E Staff C",
        companyId: companyC,
        role: "employee",
        password,
      }),
    };
    // The multi-company user is an employee in A and an HR manager in B.
    await client.query(
      `INSERT INTO company_memberships (company_id, user_id, role, status)
       VALUES ($1, $2, 'hr_manager', 'active')`,
      [companyB, users.multi.userId]
    );

    await client.query("COMMIT");
    return { companyA, companyB, companyC, users };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
