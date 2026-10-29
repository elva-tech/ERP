// HTTP end-to-end tests against a running backend.
//
//   npm run test:e2e                 run all suites, then remove fixtures
//   node tests/api.e2e.mjs --keep    keep fixtures for manual UI testing
//   node tests/api.e2e.mjs --cleanup only remove fixtures
//
// The tests write data, so they only run against a dedicated test database:
// DATABASE_URL (used for fixtures) must name a database containing "test",
// and the backend at BASE_URL must report the same database via
// /api/health/db. BASE_URL defaults to http://localhost:3000. Requests send
// TEST_ORIGIN (default the Vite origin) so browser CORS/origin rules apply.

import { assertTestDatabase, createPool, setup, teardown } from "./fixtures.mjs";
import { suites } from "./suites.mjs";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const ORIGIN = process.env.TEST_ORIGIN || "http://localhost:5173";
const args = new Set(process.argv.slice(2));

class ApiClient {
  constructor(label) {
    this.label = label;
    this.cookie = "";
  }

  async request(method, path, { body, form, origin = ORIGIN, headers = {}, raw = false } = {}) {
    const finalHeaders = { ...headers };
    if (origin) finalHeaders.Origin = origin;
    if (this.cookie) finalHeaders.Cookie = this.cookie;
    if (body !== undefined) finalHeaders["Content-Type"] = "application/json";

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: form ?? (body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)),
      redirect: "manual",
    });
    if (raw) {
      return { status: response.status, headers: response.headers, bytes: Buffer.from(await response.arrayBuffer()) };
    }

    const setCookie = response.headers.getSetCookie?.() ?? [];
    for (const raw of setCookie) {
      const [pair] = raw.split(";");
      if (pair.startsWith("hrms_session=")) {
        const value = pair.slice("hrms_session=".length);
        this.cookie = value ? pair : "";
      }
    }

    let data = null;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 200) };
    }
    return { status: response.status, data, headers: response.headers };
  }

  get(path, options) {
    return this.request("GET", path, options);
  }
  post(path, body, options = {}) {
    return this.request("POST", path, { ...options, body });
  }
  patch(path, body, options = {}) {
    return this.request("PATCH", path, { ...options, body });
  }
  delete(path, options) {
    return this.request("DELETE", path, options);
  }
  upload(path, form, options = {}) {
    return this.request("POST", path, { ...options, form });
  }

  async login(user) {
    const result = await this.post("/api/auth/login", {
      email: user.email,
      password: user.password,
    });
    if (result.status !== 200) {
      throw new Error(`Login failed for ${this.label}: ${result.status} ${result.data?.message}`);
    }
    return result;
  }
}

class Reporter {
  constructor() {
    this.results = [];
    this.suite = "";
  }

  async check(name, fn) {
    try {
      await fn();
      this.results.push({ suite: this.suite, name, ok: true });
      console.log(`  PASS  ${name}`);
    } catch (error) {
      this.results.push({ suite: this.suite, name, ok: false, error: error.message });
      console.log(`  FAIL  ${name}\n        ${error.message}`);
    }
  }
}

async function main() {
  const pool = createPool();

  try {
    if (args.has("--cleanup")) {
      const removed = await teardown(pool);
      console.log(`Removed test fixtures: ${removed.companies} companies, ${removed.users} users, ${removed.files} document files.`);
      return;
    }

    const fixtureDb = await assertTestDatabase(pool);
    const health = await fetch(`${BASE_URL}/api/health/db`).catch(() => null);
    if (!health || health.status !== 200) {
      console.error(`Backend is not reachable at ${BASE_URL}.`);
      process.exitCode = 1;
      return;
    }
    const serverDb = (await health.json())?.database;
    if (serverDb !== fixtureDb) {
      console.error(
        `Refusing to run: the backend at ${BASE_URL} uses database "${serverDb}", not the test database "${fixtureDb}".`
      );
      process.exitCode = 1;
      return;
    }
    console.log(`Test database: ${fixtureDb} (backend ${BASE_URL})`);

    const fixtures = await setup(pool);
    const reporter = new Reporter();
    const context = { fixtures, pool, ApiClient, state: {}, origin: ORIGIN };

    try {
      for (const [name, run] of suites) {
        reporter.suite = name;
        console.log(`\n${name}`);
        await run(reporter, context);
      }
    } finally {
      if (args.has("--keep")) {
        console.log("\nFixtures kept for manual testing (synthetic accounts):");
        for (const [key, user] of Object.entries(fixtures.users)) {
          console.log(`  ${key}: ${user.email} (${user.role}, company ${user.companyId})`);
        }
        console.log(`  password for all test accounts: ${fixtures.users.adminA.password}`);
        console.log('Remove them later with "npm run test:e2e -- --cleanup".');
      } else {
        const removed = await teardown(pool);
        console.log(`\nCleaned up ${removed.companies} test companies, ${removed.users} test users and ${removed.files} document files.`);
      }
    }

    const failed = reporter.results.filter((r) => !r.ok);
    console.log(
      `\nResult: ${reporter.results.length - failed.length} passed, ${failed.length} failed, ${reporter.results.length} total.`
    );
    if (failed.length) {
      console.log("Failures:");
      for (const f of failed) console.log(`  [${f.suite}] ${f.name}: ${f.error}`);
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("E2E run aborted:", error.message);
  process.exitCode = 1;
});
