import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { cleanupTenants, createTestPool, seedTenants } from "./helpers.mjs";

// Live backend + real PostgreSQL. Start the backend against the isolated test
// database and set BASE_URL (default http://127.0.0.1:3100).
const BASE_URL = (process.env.BASE_URL || "http://localhost:3100").replace(/\/+$/, "");
let pool;
let seed;

before(async () => {
  pool = createTestPool();
  seed = await seedTenants(pool);
});

after(async () => {
  if (pool) {
    if (seed) await cleanupTenants(pool, seed);
    await pool.end();
  }
});

async function call(method, path, { as, body, headers = {}, origin = BASE_URL } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(origin ? { Origin: origin } : {}),
      ...(as ? { Cookie: `hrms_session=${as.token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: response.status, json };
}

const q = (companyId) => `companyId=${companyId}`;

test("unauthenticated requests receive 401 on every HR domain", async () => {
  const paths = [
    `/api/employees?${q(seed.companyA)}`,
    `/api/attendance/records?${q(seed.companyA)}`,
    `/api/leave/requests?${q(seed.companyA)}`,
    `/api/payroll/runs?${q(seed.companyA)}`,
    `/api/payroll/payslips?${q(seed.companyA)}`,
  ];
  for (const path of paths) {
    assert.equal((await call("GET", path)).status, 401, path);
  }
  const post = await call("POST", "/api/payroll/runs", {
    body: { companyId: seed.companyA, year: 2032, month: 1 },
  });
  assert.equal(post.status, 401);
});

test("an invalid or expired session token is rejected with 401", async () => {
  const response = await call("GET", `/api/employees?${q(seed.companyA)}`, {
    as: { token: "0".repeat(64) },
  });
  assert.equal(response.status, 401);
});

test("cross-tenant access is denied with 403 for every role", async () => {
  for (const actor of [seed.adminA, seed.hrA, seed.employeeA]) {
    for (const path of [
      `/api/employees?${q(seed.companyB)}`,
      `/api/attendance/records?${q(seed.companyB)}`,
      `/api/leave/requests?${q(seed.companyB)}`,
      `/api/payroll/runs?${q(seed.companyB)}`,
      `/api/employees/${seed.employeeRecordB}?${q(seed.companyB)}`,
    ]) {
      assert.equal((await call("GET", path, { as: actor })).status, 403, `${actor.role} ${path}`);
    }
  }
  const crossPost = await call("POST", "/api/payroll/runs", {
    as: seed.adminA,
    body: { companyId: seed.companyB, year: 2032, month: 2 },
  });
  assert.equal(crossPost.status, 403);
  const { rows } = await pool.query("SELECT 1 FROM payroll_runs WHERE company_id = $1", [seed.companyB]);
  assert.equal(rows.length, 0);
});

test("a company A employee id cannot be read through company B scope", async () => {
  const response = await call("GET", `/api/employees/${seed.employeeRecordA}?${q(seed.companyB)}`, {
    as: seed.adminB,
  });
  assert.ok([403, 404].includes(response.status), `status ${response.status}`);
});

test("suspended memberships are denied", async () => {
  const response = await call("GET", `/api/payroll/runs?${q(seed.companyA)}`, { as: seed.suspendedA });
  assert.equal(response.status, 403);
});

test("an employee role cannot use payroll or manager-only endpoints (403)", async () => {
  const denied = [
    ["GET", `/api/payroll/runs?${q(seed.companyA)}`],
    ["GET", `/api/payroll/statutory?${q(seed.companyA)}&runId=1`],
    ["POST", "/api/payroll/runs", { companyId: seed.companyA, year: 2032, month: 3 }],
    ["POST", "/api/employees", { companyId: seed.companyA, name: "X", email: "x@isolated-test.invalid" }],
    ["POST", "/api/leave/carry-forward", { companyId: seed.companyA, fromYear: 2031 }],
    ["POST", "/api/attendance/records", {
      companyId: seed.companyA,
      employeeId: seed.employeeRecordA,
      date: "2032-03-01",
      checkIn: "09:00",
    }],
  ];
  for (const [method, path, body] of denied) {
    const response = await call(method, path, { as: seed.employeeA, body });
    assert.equal(response.status, 403, `${method} ${path}`);
  }
  const { rows } = await pool.query("SELECT 1 FROM payroll_runs WHERE company_id = $1", [seed.companyA]);
  assert.equal(rows.length, 0);

  // Employees may read only their own payslips, which the backend scopes by employee link.
  const own = await call("GET", `/api/payroll/payslips?${q(seed.companyA)}&employeeId=${seed.employeeRecordB}`, {
    as: seed.employeeA,
  });
  assert.equal(own.status, 200);
  assert.equal(own.json.count, 0);
});

test("an HR manager can manage payroll runs but not admin-only carry-forward", async () => {
  const create = await call("POST", "/api/payroll/runs", {
    as: seed.hrA,
    body: { companyId: seed.companyA, year: 2032, month: 4 },
    headers: { "Idempotency-Key": "live-hr-1" },
  });
  assert.equal(create.status, 201);

  const replay = await call("POST", "/api/payroll/runs", {
    as: seed.hrA,
    body: { companyId: seed.companyA, year: 2032, month: 4 },
    headers: { "Idempotency-Key": "live-hr-1" },
  });
  assert.equal(replay.status, 201);
  assert.equal(replay.json.run.id, create.json.run.id);

  const conflict = await call("POST", "/api/payroll/runs", {
    as: seed.hrA,
    body: { companyId: seed.companyA, year: 2032, month: 5 },
    headers: { "Idempotency-Key": "live-hr-1" },
  });
  assert.equal(conflict.status, 409);

  const carry = await call("POST", "/api/leave/carry-forward", {
    as: seed.hrA,
    body: { companyId: seed.companyA, fromYear: 2031 },
  });
  assert.equal(carry.status, 403);
});

test("restricted payroll run actions are denied outside the permitted role and tenant", async () => {
  const created = await call("POST", "/api/payroll/runs", {
    as: seed.adminA,
    body: { companyId: seed.companyA, year: 2033, month: 1 },
  });
  assert.equal(created.status, 201);
  const runId = created.json.run.id;

  // finalize and cancel are company_admin only; none of these requests may reach processing.
  for (const action of ["finalize", "cancel"]) {
    const hr = await call("PATCH", `/api/payroll/runs/${runId}?${q(seed.companyA)}`, {
      as: seed.hrA,
      body: { action },
    });
    assert.equal(hr.status, 403, `hr ${action}`);
  }
  for (const action of ["process", "finalize", "cancel"]) {
    const employee = await call("PATCH", `/api/payroll/runs/${runId}?${q(seed.companyA)}`, {
      as: seed.employeeA,
      body: { action },
    });
    assert.equal(employee.status, 403, `employee ${action}`);

    const otherTenant = await call("PATCH", `/api/payroll/runs/${runId}?${q(seed.companyA)}`, {
      as: seed.adminB,
      body: { action },
    });
    assert.equal(otherTenant.status, 403, `cross-tenant ${action}`);

    const wrongScope = await call("PATCH", `/api/payroll/runs/${runId}?${q(seed.companyB)}`, {
      as: seed.adminB,
      body: { action },
    });
    assert.equal(wrongScope.status, 404, `wrong-scope ${action}`);
  }

  const { rows } = await pool.query("SELECT status FROM payroll_runs WHERE id = $1", [runId]);
  assert.equal(rows[0].status, "Draft");
});

test("state-changing requests without an allowed Origin are rejected (403)", async () => {
  const response = await call("POST", "/api/payroll/runs", {
    as: seed.adminA,
    origin: null,
    body: { companyId: seed.companyA, year: 2032, month: 6 },
  });
  assert.equal(response.status, 403);
  const hostile = await call("POST", "/api/payroll/runs", {
    as: seed.adminA,
    origin: "https://evil.example",
    body: { companyId: seed.companyA, year: 2032, month: 6 },
  });
  assert.equal(hostile.status, 403);
});

test("employees cannot read a colleague's salary in the same company", async () => {
  const otherSalary = await call(
    "GET",
    `/api/employees/${seed.employeePeerA}/salary?${q(seed.companyA)}`,
    { as: seed.employeeA },
  );

  assert.equal(otherSalary.status, 404, `status ${otherSalary.status}`);
});

test("login works with real credentials and creates a session; wrong password is 401", async () => {
  const good = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email: seed.adminA.email, password: seed.password }),
  });
  assert.equal(good.status, 200);
  const cookie = good.headers.get("set-cookie") || "";
  assert.match(cookie, /hrms_session=/);
  const token = /hrms_session=([^;]+)/.exec(cookie)[1];
  const me = await call("GET", "/api/auth/me", { as: { token } });
  assert.equal(me.status, 200);

  const bad = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email: seed.adminA.email, password: "wrong-password" }),
  });
  assert.equal(bad.status, 401);
});

test("login is refused when the account is inactive or has no active membership", async () => {
  await pool.query("UPDATE users SET status = 'inactive' WHERE id = $1", [seed.hrA.id]);
  const inactive = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email: seed.hrA.email, password: seed.password }),
  });
  assert.equal(inactive.status, 401);

  const noMembership = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email: seed.suspendedA.email, password: seed.password }),
  });
  assert.equal(noMembership.status, 401);
});
