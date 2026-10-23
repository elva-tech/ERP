import { expect, expectStatus } from "./assert.mjs";
import { THROTTLE_UNKNOWN_EMAIL } from "./fixtures.mjs";
import {
  carryForwardSuite,
  delegationSuite,
  designationDepartments,
  documentsSuite,
  multiCompanySuite,
  policyRulesSuite,
  policySuite,
  profileSuite,
  provisionalPayrollSuite,
} from "./suites-extended.mjs";
import {
  deactivationSuite,
  invitationSuite,
  memberAccessSuite,
  registrationSuite,
  tenantConstraintSuite,
} from "./suites-access.mjs";

const q = (companyId) => `?companyId=${encodeURIComponent(companyId)}`;

async function health(t, { ApiClient, origin }) {
  const anon = new ApiClient("anon");
  for (const path of ["/api/health", "/api/health/db", "/api/health/prisma"]) {
    await t.check(`GET ${path} returns 200`, async () => {
      const r = await anon.get(path);
      expectStatus(r, 200);
      expect(r.data.success === true, "success flag missing");
    });
  }
  await t.check("CORS allows the frontend origin with credentials", async () => {
    const r = await anon.get("/api/health");
    expect(r.headers.get("access-control-allow-origin") === origin, "missing ACAO");
    expect(r.headers.get("access-control-allow-credentials") === "true", "missing ACAC");
  });
  await t.check("CORS does not echo an unknown origin", async () => {
    const r = await anon.get("/api/health", { origin: "https://evil.example" });
    expect(!r.headers.get("access-control-allow-origin"), "unknown origin was allowed");
  });
}

async function auth(t, { ApiClient, fixtures, state }) {
  const { adminA } = fixtures.users;
  const client = new ApiClient("adminA");

  await t.check("GET /api/auth/me without session returns 401", async () => {
    expectStatus(await client.get("/api/auth/me"), 401);
  });
  await t.check("login without Origin header is rejected (403)", async () => {
    const r = await client.post(
      "/api/auth/login",
      { email: adminA.email, password: adminA.password },
      { origin: null }
    );
    expectStatus(r, 403);
  });
  await t.check("login from a foreign origin is rejected (403)", async () => {
    const r = await client.post(
      "/api/auth/login",
      { email: adminA.email, password: adminA.password },
      { origin: "https://evil.example" }
    );
    expectStatus(r, 403);
  });
  await t.check("login with wrong password returns 401", async () => {
    const r = await client.post("/api/auth/login", {
      email: adminA.email,
      password: "wrong-password-123",
    });
    expectStatus(r, 401);
    expect(!client.cookie, "cookie set on failed login");
  });
  await t.check("login with valid credentials returns 200 and sets httpOnly cookie", async () => {
    const r = await client.login(adminA);
    expect(client.cookie.startsWith("hrms_session="), "session cookie missing");
    const raw = r.headers.getSetCookie().join(";").toLowerCase();
    expect(raw.includes("httponly"), "cookie is not httpOnly");
  });
  await t.check("GET /api/auth/me restores session with only own memberships", async () => {
    const r = await client.get("/api/auth/me");
    expectStatus(r, 200);
    const ids = r.data.memberships.map((m) => String(m.companyId));
    expect(ids.length === 1 && ids[0] === fixtures.companyA, `unexpected memberships ${ids}`);
    expect(r.data.memberships[0].role === "company_admin", "role missing");
  });

  state.adminA = client;
  for (const key of ["hrA", "employeeA", "adminB"]) {
    const c = new ApiClient(key);
    await c.login(fixtures.users[key]);
    state[key] = c;
  }
}

async function departments(t, { fixtures, state }) {
  const api = state.adminA;
  const cid = fixtures.companyA;

  await t.check("create department returns 201", async () => {
    const r = await api.post("/api/departments", {
      companyId: cid,
      departmentName: "E2E Engineering",
      description: "Automated test department",
    });
    expectStatus(r, 201);
    state.deptId = String(r.data.department.id);
  });
  await t.check("second department for later reassignment", async () => {
    const r = await api.post("/api/departments", { companyId: cid, departmentName: "E2E Finance" });
    expectStatus(r, 201);
    state.dept2Id = String(r.data.department.id);
  });
  await t.check("duplicate department name (case-insensitive) returns 409", async () => {
    const r = await api.post("/api/departments", { companyId: cid, departmentName: "e2e engineering" });
    expectStatus(r, 409);
  });
  await t.check("invalid department name returns 400", async () => {
    expectStatus(await api.post("/api/departments", { companyId: cid, departmentName: "x" }), 400);
  });
  await t.check("list departments returns created records", async () => {
    const r = await api.get(`/api/departments${q(cid)}`);
    expectStatus(r, 200);
    const names = r.data.departments.map((d) => d.department_name);
    expect(names.includes("E2E Engineering") && names.includes("E2E Finance"), `got ${names}`);
  });
  await t.check("PATCH department description and status", async () => {
    const r = await api.patch(`/api/departments/${state.deptId}${q(cid)}`, {
      description: "Updated by test",
      status: "Inactive",
    });
    expectStatus(r, 200);
    expect(r.data.department.status === "Inactive", "status not updated");
  });
  await t.check("reactivate department", async () => {
    const r = await api.patch(`/api/departments/${state.deptId}${q(cid)}`, { status: "Active" });
    expectStatus(r, 200);
    expect(r.data.department.status === "Active", "status not reactivated");
  });
  await t.check("GET department item reflects persisted changes", async () => {
    const r = await api.get(`/api/departments/${state.deptId}${q(cid)}`);
    expectStatus(r, 200);
    expect(r.data.department.description === "Updated by test", "description not persisted");
  });
}

async function designations(t, { fixtures, state }) {
  const api = state.adminA;
  const cid = fixtures.companyA;

  await t.check("create designation returns 201", async () => {
    const r = await api.post("/api/designations", { companyId: cid, designationName: "E2E Engineer" });
    expectStatus(r, 201);
    state.desgId = String(r.data.designation.id);
  });
  await t.check("duplicate designation returns 409", async () => {
    expectStatus(
      await api.post("/api/designations", { companyId: cid, designationName: "E2E ENGINEER" }),
      409
    );
  });
  await t.check("PATCH designation status Inactive then Active", async () => {
    let r = await api.patch(`/api/designations/${state.desgId}${q(cid)}`, { status: "Inactive" });
    expectStatus(r, 200);
    r = await api.patch(`/api/designations/${state.desgId}${q(cid)}`, { status: "Active" });
    expectStatus(r, 200);
    expect(r.data.designation.status === "Active", "status not Active");
  });
  await t.check("list designations includes record", async () => {
    const r = await api.get(`/api/designations${q(cid)}`);
    expectStatus(r, 200);
    expect(r.data.designations.some((d) => String(d.id) === state.desgId), "not listed");
  });
}

async function employees(t, { fixtures, state }) {
  const api = state.adminA;
  const cid = fixtures.companyA;
  const base = {
    companyId: cid,
    employeeCode: "E2E-001",
    name: "E2E Employee A",
    department: "E2E Engineering",
    designation: "E2E Engineer",
    email: fixtures.users.employeeA.email,
    phone: "+91 90000 00000",
  };

  await t.check("create employee with valid department/designation returns 201", async () => {
    const r = await api.post("/api/employees", base);
    expectStatus(r, 201);
    state.employeeId = String(r.data.employee.id);
    expect(r.data.employee.status === "Active", "default status not Active");
  });
  await t.check("employee with unknown department is rejected (400)", async () => {
    const r = await api.post("/api/employees", {
      ...base,
      employeeCode: "E2E-002",
      email: "e2e.other@elva-test.invalid",
      department: "Does Not Exist",
    });
    expectStatus(r, 400);
  });
  await t.check("employee missing email is rejected (400)", async () => {
    const r = await api.post("/api/employees", { ...base, employeeCode: "E2E-003", email: "" });
    expectStatus(r, 400);
  });
  await t.check("duplicate employee code returns 409", async () => {
    const r = await api.post("/api/employees", { ...base, email: "e2e.dupe@elva-test.invalid" });
    expectStatus(r, 409);
  });
  await t.check("second employee for leave/attendance tests", async () => {
    const r = await api.post("/api/employees", {
      ...base,
      employeeCode: "E2E-004",
      name: "E2E Second Employee",
      email: "e2e.second@elva-test.invalid",
    });
    expectStatus(r, 201);
    state.employee2Id = String(r.data.employee.id);
  });
  await t.check("GET employee item", async () => {
    const r = await api.get(`/api/employees/${state.employeeId}${q(cid)}`);
    expectStatus(r, 200);
    expect(r.data.employee.employee_code === "E2E-001", "wrong record");
  });
  await t.check("partial PATCH updates phone only", async () => {
    const r = await api.patch(`/api/employees/${state.employeeId}${q(cid)}`, { phone: "+91 90000 11111" });
    expectStatus(r, 200);
    expect(r.data.employee.phone === "+91 90000 11111", "phone not updated");
    expect(r.data.employee.name === base.name, "other fields changed");
  });
  await t.check("deactivate and reactivate employee", async () => {
    let r = await api.patch(`/api/employees/${state.employeeId}${q(cid)}`, { status: "Inactive" });
    expectStatus(r, 200);
    expect(r.data.employee.status === "Inactive", "not deactivated");
    r = await api.patch(`/api/employees/${state.employeeId}${q(cid)}`, { status: "Active" });
    expectStatus(r, 200);
    expect(r.data.employee.status === "Active", "not reactivated");
  });
  await t.check("department rename cascades to employees", async () => {
    let r = await api.patch(`/api/departments/${state.deptId}${q(cid)}`, {
      departmentName: "E2E Platform Engineering",
    });
    expectStatus(r, 200);
    r = await api.get(`/api/employees/${state.employeeId}${q(cid)}`);
    expect(r.data.employee.department === "E2E Platform Engineering", "employee department not cascaded");
    r = await api.get(`/api/departments/${state.deptId}${q(cid)}`);
    expect(r.data.department.employee_count === 2, `employee_count ${r.data.department.employee_count}`);
  });
  await t.check("deleting a department with employees returns 409", async () => {
    expectStatus(await api.delete(`/api/departments/${state.deptId}${q(cid)}`), 409);
  });
  await t.check("deleting an unused department succeeds", async () => {
    expectStatus(await api.delete(`/api/departments/${state.dept2Id}${q(cid)}`), 200);
    expectStatus(await api.get(`/api/departments/${state.dept2Id}${q(cid)}`), 404);
  });
  await t.check("data persists and is visible from another user's session", async () => {
    const r = await state.hrA.get(`/api/employees${q(cid)}`);
    expectStatus(r, 200);
    expect(r.data.employees.some((e) => String(e.id) === state.employeeId), "employee not persisted");
  });
}

async function identityLinks(t, { fixtures, state }) {
  const api = state.adminA;
  const cid = fixtures.companyA;
  const { employeeA, hrA, adminB } = fixtures.users;

  await t.check("matching email alone does not link a login to an employee", async () => {
    const me = await state.employeeA.get("/api/auth/me");
    expect(me.data.memberships[0].employeeId === null, `employeeId ${me.data.memberships[0].employeeId}`);
    const balances = await state.employeeA.get(`/api/leave/balances${q(cid)}&year=2099`);
    expectStatus(balances, 200);
    expect(balances.data.count === 0, `unlinked login saw ${balances.data.count} balances`);
  });
  await t.check("unlinked login cannot submit self-service requests (403)", async () => {
    const r = await state.employeeA.post("/api/payroll/advances", { companyId: cid, amount: 100 });
    expectStatus(r, 403);
  });
  await t.check("linking a login from another company is rejected (400)", async () => {
    const r = await api.patch(`/api/employees/${state.employeeId}${q(cid)}`, { userId: adminB.userId });
    expectStatus(r, 400);
  });
  await t.check("employee role cannot link logins (403)", async () => {
    const r = await state.employeeA.patch(`/api/employees/${state.employeeId}${q(cid)}`, { userId: employeeA.userId });
    expectStatus(r, 403);
  });
  await t.check("manager links employee login explicitly", async () => {
    const r = await api.patch(`/api/employees/${state.employeeId}${q(cid)}`, { userId: employeeA.userId });
    expectStatus(r, 200);
    expect(String(r.data.employee.user_id) === employeeA.userId, `user_id ${r.data.employee.user_id}`);
  });
  await t.check("the same login cannot be linked to a second employee (409)", async () => {
    const r = await api.patch(`/api/employees/${state.employee2Id}${q(cid)}`, { userId: employeeA.userId });
    expectStatus(r, 409);
  });
  await t.check("HR manager login linked to their own employee record", async () => {
    const r = await api.patch(`/api/employees/${state.employee2Id}${q(cid)}`, { userId: hrA.userId });
    expectStatus(r, 200);
  });
  await t.check("/api/auth/me reports the linked employee", async () => {
    const me = await state.employeeA.get("/api/auth/me");
    expect(me.data.memberships[0].employeeId === state.employeeId, `employeeId ${me.data.memberships[0].employeeId}`);
  });
  await t.check("members list shows links (managers only)", async () => {
    const r = await api.get(`/api/members${q(cid)}`);
    expectStatus(r, 200);
    const member = r.data.members.find((m) => String(m.user_id) === employeeA.userId);
    expect(member && String(member.employee_id) === state.employeeId, JSON.stringify(member));
    expectStatus(await state.employeeA.get(`/api/members${q(cid)}`), 403);
    expectStatus(await state.adminB.get(`/api/members${q(cid)}`), 403);
  });
  await t.check("employee directory hides colleagues' contact details", async () => {
    const r = await state.employeeA.get(`/api/employees${q(cid)}`);
    expectStatus(r, 200);
    const leaked = r.data.employees.filter((e) => "email" in e || "phone" in e || "user_id" in e);
    expect(leaked.length === 0 && r.data.employees.length >= 2, JSON.stringify(r.data.employees[0]));
  });
  await t.check("employee sees own full record but only directory fields of a colleague", async () => {
    const own = await state.employeeA.get(`/api/employees/${state.employeeId}${q(cid)}`);
    expectStatus(own, 200);
    expect(own.data.employee.email === employeeA.email, "own email missing");
    const other = await state.employeeA.get(`/api/employees/${state.employee2Id}${q(cid)}`);
    expectStatus(other, 200);
    expect(!("email" in other.data.employee) && !("phone" in other.data.employee), JSON.stringify(other.data.employee));
  });
  await t.check("HR still sees full employee fields", async () => {
    const r = await state.hrA.get(`/api/employees${q(cid)}`);
    expect(r.data.employees.every((e) => "email" in e && "phone" in e), "HR lost fields");
  });
}

async function permissions(t, { fixtures, state }) {
  const cid = fixtures.companyA;

  await t.check("hr_manager can create department", async () => {
    const r = await state.hrA.post("/api/departments", { companyId: cid, departmentName: "E2E HR Dept" });
    expectStatus(r, 201);
    state.hrDeptId = String(r.data.department.id);
  });
  await t.check("hr_manager cannot delete department (admin only)", async () => {
    expectStatus(await state.hrA.delete(`/api/departments/${state.hrDeptId}${q(cid)}`), 403);
  });
  await t.check("employee role can read employee list", async () => {
    expectStatus(await state.employeeA.get(`/api/employees${q(cid)}`), 200);
  });
  await t.check("employee role cannot create department (403)", async () => {
    const r = await state.employeeA.post("/api/departments", { companyId: cid, departmentName: "E2E Nope" });
    expectStatus(r, 403);
  });
  await t.check("employee role cannot edit an employee (403)", async () => {
    const r = await state.employeeA.patch(`/api/employees/${state.employeeId}${q(cid)}`, { name: "Hacked" });
    expectStatus(r, 403);
  });
  await t.check("employee role cannot delete an employee (403)", async () => {
    expectStatus(await state.employeeA.delete(`/api/employees/${state.employeeId}${q(cid)}`), 403);
  });
  await t.check("mutation without Origin header is rejected (403)", async () => {
    const r = await state.adminA.patch(
      `/api/departments/${state.hrDeptId}${q(cid)}`,
      { status: "Inactive" },
      { origin: null }
    );
    expectStatus(r, 403);
  });
}

async function isolation(t, { fixtures, state }) {
  const a = fixtures.companyA;
  const b = fixtures.companyB;
  const attacker = state.adminB;

  await t.check("company B admin cannot list company A employees (403)", async () => {
    expectStatus(await attacker.get(`/api/employees${q(a)}`), 403);
  });
  await t.check("company B admin cannot list company A departments/designations (403)", async () => {
    expectStatus(await attacker.get(`/api/departments${q(a)}`), 403);
    expectStatus(await attacker.get(`/api/designations${q(a)}`), 403);
  });
  await t.check("company B admin cannot read A's employee via B's companyId (404)", async () => {
    expectStatus(await attacker.get(`/api/employees/${state.employeeId}${q(b)}`), 404);
  });
  await t.check("company B admin cannot modify A's employee via B's companyId (404)", async () => {
    const r = await attacker.patch(`/api/employees/${state.employeeId}${q(b)}`, { name: "Hijacked" });
    expectStatus(r, 404);
  });
  await t.check("company B admin cannot delete A's employee via B's companyId (404)", async () => {
    expectStatus(await attacker.delete(`/api/employees/${state.employeeId}${q(b)}`), 404);
  });
  await t.check("company B admin cannot modify A's department (404)", async () => {
    const r = await attacker.patch(`/api/departments/${state.deptId}${q(b)}`, { status: "Inactive" });
    expectStatus(r, 404);
  });
  await t.check("company B admin cannot create records in company A (403)", async () => {
    const r = await attacker.post("/api/departments", { companyId: a, departmentName: "E2E Injected" });
    expectStatus(r, 403);
  });
  await t.check("company A employee untouched after attacks", async () => {
    const r = await state.adminA.get(`/api/employees/${state.employeeId}${q(a)}`);
    expectStatus(r, 200);
    expect(r.data.employee.name === "E2E Employee A", "employee was modified");
  });
  await t.check("company B sees an empty, separate employee list", async () => {
    const r = await attacker.get(`/api/employees${q(b)}`);
    expectStatus(r, 200);
    expect(r.data.employees.length === 0, "company B sees foreign employees");
  });
}

async function logout(t, { ApiClient, fixtures }) {
  const client = new ApiClient("logout");
  await client.login(fixtures.users.adminB);
  const savedCookie = client.cookie;

  await t.check("logout returns 200 and clears cookie", async () => {
    const r = await client.post("/api/auth/logout", {});
    expectStatus(r, 200);
    expect(!client.cookie, "cookie not cleared");
  });
  await t.check("old session token is invalid after logout (401)", async () => {
    client.cookie = savedCookie;
    expectStatus(await client.get("/api/auth/me"), 401);
  });
}

/** Generic CRUD + isolation checks for factory-based resources. */
function crudSuite({ path, key, listKey, create, invalid, update, verify }) {
  return async (t, { fixtures, state }) => {
    const api = state.adminA;
    const cid = fixtures.companyA;
    let id;

    await t.check(`create ${key} returns 201`, async () => {
      const r = await api.post(path, { companyId: cid, ...create() });
      expectStatus(r, 201);
      id = String(r.data[key].id);
      state[`${key}Id`] = id;
    });
    if (invalid) {
      await t.check(`invalid ${key} returns 400`, async () => {
        expectStatus(await api.post(path, { companyId: cid, ...invalid() }), 400);
      });
    }
    await t.check(`list ${listKey} includes created ${key}`, async () => {
      const r = await api.get(`${path}${q(cid)}`);
      expectStatus(r, 200);
      expect(r.data[listKey].some((row) => String(row.id) === id), "record not listed");
    });
    await t.check(`PATCH ${key} persists`, async () => {
      const r = await api.patch(`${path}/${id}${q(cid)}`, update);
      expectStatus(r, 200);
      const read = await api.get(`${path}/${id}${q(cid)}`);
      expectStatus(read, 200);
      verify(read.data[key]);
    });
    await t.check(`employee role cannot create ${key} (403)`, async () => {
      expectStatus(await state.employeeA.post(path, { companyId: cid, ...create() }), 403);
    });
    await t.check(`company B cannot list/read/modify A's ${key}`, async () => {
      expectStatus(await state.adminB.get(`${path}${q(cid)}`), 403);
      const b = fixtures.companyB;
      expectStatus(await state.adminB.get(`${path}/${id}${q(b)}`), 404);
      expectStatus(await state.adminB.patch(`${path}/${id}${q(b)}`, update), 404);
      expectStatus(await state.adminB.delete(`${path}/${id}${q(b)}`), 404);
    });
  };
}

const shiftsSuite = crudSuite({
  path: "/api/attendance/shifts",
  key: "shift",
  listKey: "shifts",
  create: () => ({ name: "E2E General Shift", startTime: "09:00", endTime: "18:00" }),
  invalid: () => ({ name: "E2E Bad Shift", startTime: "09:00", endTime: "09:00" }),
  update: { graceMinutes: 20, status: "Active" },
  verify: (row) => expect(row.grace_minutes === 20, `grace_minutes ${row.grace_minutes}`),
});

const devicesSuite = crudSuite({
  path: "/api/attendance/devices",
  key: "device",
  listKey: "devices",
  create: () => ({ name: "E2E Gate Reader", connection: "LAN", ipAddress: "192.0.2.10" }),
  invalid: () => ({ name: "E2E Bad Device", connection: "Bluetooth" }),
  update: { status: "Maintenance" },
  verify: (row) => expect(row.status === "Maintenance", `status ${row.status}`),
});

const holidaysSuite = crudSuite({
  path: "/api/leave/holidays",
  key: "holiday",
  listKey: "holidays",
  create: () => ({ name: "E2E Company Day", date: "2099-03-15", type: "Company" }),
  invalid: () => ({ name: "E2E Bad Date", date: "2099-02-30" }),
  update: { description: "Automated test holiday" },
  verify: (row) => {
    expect(row.holiday_date === "2099-03-15", `holiday_date ${row.holiday_date}`);
    expect(row.description === "Automated test holiday", "description not saved");
  },
});

const leaveTypesSuite = crudSuite({
  path: "/api/leave/types",
  key: "leaveType",
  listKey: "leaveTypes",
  create: () => ({ name: "E2E Casual Leave", daysPerYear: 3, isPaid: true }),
  invalid: () => ({ name: "E2E Bad Leave", daysPerYear: -1 }),
  update: { description: "Automated test leave type" },
  verify: (row) => expect(Number(row.days_per_year) === 3, `days_per_year ${row.days_per_year}`),
});

const componentsSuite = crudSuite({
  path: "/api/payroll/components",
  key: "component",
  listKey: "components",
  create: () => ({ name: "E2E Basic", componentType: "Earning", calculationType: "Fixed" }),
  invalid: () => ({ name: "E2E Bad Component", componentType: "Bonus" }),
  update: { status: "Inactive" },
  verify: (row) => expect(row.status === "Inactive", `status ${row.status}`),
});

async function rostersSuite(t, { fixtures, state }) {
  const api = state.adminA;
  const cid = fixtures.companyA;

  await t.check("assign roster to employee returns 201", async () => {
    const r = await api.post("/api/attendance/rosters", {
      companyId: cid,
      employeeId: state.employeeId,
      shiftId: state.shiftId,
      effectiveFrom: "2099-01-01",
    });
    expectStatus(r, 201);
    state.rosterId = String(r.data.roster.id);
  });
  await t.check("roster with effectiveTo before effectiveFrom returns 400", async () => {
    const r = await api.post("/api/attendance/rosters", {
      companyId: cid,
      employeeId: state.employeeId,
      shiftId: state.shiftId,
      effectiveFrom: "2099-02-01",
      effectiveTo: "2099-01-01",
    });
    expectStatus(r, 400);
  });
  await t.check("roster list shows employee and shift names", async () => {
    const r = await api.get(`/api/attendance/rosters${q(cid)}&employeeId=${state.employeeId}`);
    expectStatus(r, 200);
    const row = r.data.rosters.find((x) => String(x.id) === state.rosterId);
    expect(row && row.shift_name === "E2E General Shift" && row.employee_name, "names missing");
  });
  await t.check("roster PATCH sets effectiveTo", async () => {
    const r = await api.patch(`/api/attendance/rosters/${state.rosterId}${q(cid)}`, {
      effectiveTo: "2099-12-31",
    });
    expectStatus(r, 200);
    expect(r.data.roster.effective_to === "2099-12-31", `effective_to ${r.data.roster.effective_to}`);
  });
  await t.check("roster referencing another company's employee is rejected", async () => {
    const r = await state.adminB.post("/api/attendance/rosters", {
      companyId: fixtures.companyB,
      employeeId: state.employeeId,
      shiftId: state.shiftId,
      effectiveFrom: "2099-01-01",
    });
    expect([400, 404].includes(r.status), `expected 400/404, got ${r.status}`);
  });
}

async function leaveWorkflow(t, { fixtures, state }) {
  const cid = fixtures.companyA;
  const admin = state.adminA;
  const emp = state.employeeA;
  const typeId = state.leaveTypeId;

  await t.check("balances list default allocation from leave type", async () => {
    const r = await admin.get(`/api/leave/balances${q(cid)}&year=2099&employeeId=${state.employeeId}`);
    expectStatus(r, 200);
    const row = r.data.balances.find((b) => String(b.leave_type_id) === typeId);
    expect(row && row.allocated === 3 && row.is_default_allocation === true, JSON.stringify(row));
  });
  await t.check("employee applies for own leave (201, 2 days)", async () => {
    const r = await emp.post("/api/leave/requests", {
      companyId: cid,
      leaveTypeId: typeId,
      fromDate: "2099-04-01",
      toDate: "2099-04-02",
      reason: "Automated test",
    });
    expectStatus(r, 201);
    expect(r.data.request.days === 2, `days ${r.data.request.days}`);
    state.leaveId = String(r.data.request.id);
  });
  await t.check("available balance already excludes pending days", async () => {
    const r = await emp.get(`/api/leave/balances${q(cid)}&year=2099`);
    expectStatus(r, 200);
    const row = r.data.balances.find((b) => String(b.leave_type_id) === typeId);
    expect(row && row.used === 0 && row.pending === 2 && row.available === 1, JSON.stringify(row));
  });
  await t.check("employee cannot apply for another employee (403)", async () => {
    const r = await emp.post("/api/leave/requests", {
      companyId: cid,
      employeeId: state.employee2Id,
      leaveTypeId: typeId,
      fromDate: "2099-05-01",
      toDate: "2099-05-01",
    });
    expectStatus(r, 403);
  });
  await t.check("overlapping request returns 409", async () => {
    const r = await emp.post("/api/leave/requests", {
      companyId: cid,
      leaveTypeId: typeId,
      fromDate: "2099-04-02",
      toDate: "2099-04-03",
    });
    expectStatus(r, 409);
  });
  await t.check("request exceeding balance (incl. pending) returns 400", async () => {
    const r = await emp.post("/api/leave/requests", {
      companyId: cid,
      leaveTypeId: typeId,
      fromDate: "2099-06-01",
      toDate: "2099-06-02",
    });
    expectStatus(r, 400);
  });
  await t.check("request spanning two years returns 400", async () => {
    const r = await emp.post("/api/leave/requests", {
      companyId: cid,
      leaveTypeId: typeId,
      fromDate: "2099-12-31",
      toDate: "2100-01-01",
    });
    expectStatus(r, 400);
  });
  await t.check("employee sees only own requests", async () => {
    const r = await emp.get(`/api/leave/requests${q(cid)}`);
    expectStatus(r, 200);
    expect(r.data.requests.every((x) => String(x.employee_id) === state.employeeId), "foreign requests visible");
  });
  await t.check("employee cannot approve leave (403)", async () => {
    expectStatus(await emp.patch(`/api/leave/requests/${state.leaveId}${q(cid)}`, { action: "approve" }), 403);
  });
  await t.check("company B cannot approve A's leave (404)", async () => {
    const r = await state.adminB.patch(`/api/leave/requests/${state.leaveId}${q(fixtures.companyB)}`, {
      action: "approve",
    });
    expectStatus(r, 404);
  });
  await t.check("manager approves leave and balance used becomes 2", async () => {
    const r = await state.hrA.patch(`/api/leave/requests/${state.leaveId}${q(cid)}`, { action: "approve" });
    expectStatus(r, 200);
    expect(r.data.status === "Approved", "not approved");
    const b = await admin.get(`/api/leave/balances${q(cid)}&year=2099&employeeId=${state.employeeId}`);
    const row = b.data.balances.find((x) => String(x.leave_type_id) === typeId);
    expect(row.used === 2 && row.available === 1, JSON.stringify(row));
  });
  await t.check("approving again returns 409", async () => {
    expectStatus(await admin.patch(`/api/leave/requests/${state.leaveId}${q(cid)}`, { action: "approve" }), 409);
  });
  await t.check("employee cancels own approved leave and balance is restored", async () => {
    const r = await emp.patch(`/api/leave/requests/${state.leaveId}${q(cid)}`, { action: "cancel" });
    expectStatus(r, 200);
    const b = await admin.get(`/api/leave/balances${q(cid)}&year=2099&employeeId=${state.employeeId}`);
    const row = b.data.balances.find((x) => String(x.leave_type_id) === typeId);
    expect(row.used === 0 && row.available === 3, JSON.stringify(row));
  });
  await t.check("manager applies for another employee and rejects it", async () => {
    let r = await admin.post("/api/leave/requests", {
      companyId: cid,
      employeeId: state.employee2Id,
      leaveTypeId: typeId,
      fromDate: "2099-07-01",
      toDate: "2099-07-01",
    });
    expectStatus(r, 201);
    state.leave2Id = String(r.data.request.id);
    r = await admin.patch(`/api/leave/requests/${r.data.request.id}${q(cid)}`, {
      action: "reject",
      reviewNote: "Automated test",
    });
    expectStatus(r, 200);
    expect(r.data.request.status === "Rejected" && r.data.request.review_note === "Automated test", "not rejected");
  });
  await t.check("manager sets explicit allocation", async () => {
    const r = await admin.post("/api/leave/balances", {
      companyId: cid,
      employeeId: state.employee2Id,
      leaveTypeId: typeId,
      year: 2099,
      allocated: 5,
      carryForward: 1,
    });
    expectStatus(r, 200);
    expect(r.data.balance.available === 6, JSON.stringify(r.data.balance));
  });
  await t.check("employee cannot set allocations (403)", async () => {
    const r = await emp.post("/api/leave/balances", {
      companyId: cid,
      employeeId: state.employeeId,
      leaveTypeId: typeId,
      year: 2099,
      allocated: 100,
    });
    expectStatus(r, 403);
  });
  await t.check("HR manager cannot approve or reject their own leave (403)", async () => {
    let r = await state.hrA.post("/api/leave/requests", {
      companyId: cid,
      employeeId: state.employee2Id,
      leaveTypeId: typeId,
      fromDate: "2099-08-03",
      toDate: "2099-08-03",
    });
    expectStatus(r, 201);
    const ownId = r.data.request.id;
    expectStatus(await state.hrA.patch(`/api/leave/requests/${ownId}${q(cid)}`, { action: "approve" }), 403);
    expectStatus(await state.hrA.patch(`/api/leave/requests/${ownId}${q(cid)}`, { action: "reject" }), 403);
    r = await state.hrA.patch(`/api/leave/requests/${ownId}${q(cid)}`, { action: "cancel" });
    expectStatus(r, 200);
    expect(r.data.status === "Cancelled", r.data.status);
  });
  await t.check("leave type in use cannot be deleted (409)", async () => {
    expectStatus(await admin.delete(`/api/leave/types/${typeId}${q(cid)}`), 409);
  });
}

async function attendanceSuite(t, { fixtures, state }) {
  const cid = fixtures.companyA;
  const admin = state.adminA;
  const emp = state.employeeA;
  const mark = (body) => admin.post("/api/attendance/records", { companyId: cid, employeeId: state.employeeId, ...body });

  await t.check("manual mark within grace (rostered shift) => Present, no overtime", async () => {
    const r = await mark({ date: "2099-03-02", checkIn: "09:10", checkOut: "18:00" });
    expectStatus(r, 201);
    const rec = r.data.record;
    expect(rec.status === "Present" && rec.working_minutes === 530 && rec.overtime_minutes === 0, JSON.stringify(rec));
    expect(rec.check_in_time === "09:10" && rec.shift_name === "E2E General Shift", JSON.stringify(rec));
  });
  await t.check("late check-in and overtime beyond threshold are derived from shift", async () => {
    const r = await mark({ date: "2099-03-03", checkIn: "09:45", checkOut: "19:30" });
    expectStatus(r, 201);
    const rec = r.data.record;
    expect(rec.status === "Late" && rec.working_minutes === 585 && rec.overtime_minutes === 45, JSON.stringify(rec));
  });
  await t.check("check-in without check-out => Missing Punch", async () => {
    const r = await mark({ date: "2099-03-04", checkIn: "09:00" });
    expectStatus(r, 201);
    expect(r.data.record.status === "Missing Punch", r.data.record.status);
  });
  await t.check("re-marking the same day updates instead of duplicating", async () => {
    const r = await mark({ date: "2099-03-04", status: "Absent" });
    expectStatus(r, 201);
    const list = await admin.get(`/api/attendance/records${q(cid)}&date=2099-03-04`);
    expect(list.data.count === 1 && list.data.records[0].status === "Absent", JSON.stringify(list.data.summary));
  });
  await t.check("invalid time is rejected (400)", async () => {
    expectStatus(await mark({ date: "2099-03-05", checkIn: "25:00" }), 400);
  });
  await t.check("monthly range, exceptions and overtime filters", async () => {
    let r = await admin.get(`/api/attendance/records${q(cid)}&from=2099-03-01&to=2099-03-31`);
    expectStatus(r, 200);
    expect(r.data.count === 3 && r.data.overtimeMinutes === 45, `count ${r.data.count} ot ${r.data.overtimeMinutes}`);
    r = await admin.get(`/api/attendance/records${q(cid)}&from=2099-03-01&to=2099-03-31&exceptions=1`);
    expect(r.data.count === 2, `exceptions ${r.data.count}`);
    r = await admin.get(`/api/attendance/records${q(cid)}&from=2099-03-01&to=2099-03-31&overtime=1`);
    expect(r.data.count === 1, `overtime ${r.data.count}`);
  });
  await t.check("employee role cannot mark attendance (403)", async () => {
    const r = await emp.post("/api/attendance/records", {
      companyId: cid,
      employeeId: state.employeeId,
      date: "2099-03-06",
      checkIn: "09:00",
    });
    expectStatus(r, 403);
  });
  await t.check("company B cannot read A's attendance (403)", async () => {
    expectStatus(await state.adminB.get(`/api/attendance/records${q(cid)}`), 403);
  });

  await t.check("employee requests regularization for own past date (201)", async () => {
    const r = await emp.post("/api/attendance/regularizations", {
      companyId: cid,
      date: "2020-01-06",
      checkIn: "09:00",
      checkOut: "17:30",
      reason: "Forgot to punch (automated test)",
    });
    expectStatus(r, 201);
    state.regularizationId = String(r.data.regularization.id);
    expect(r.data.regularization.requested_check_in_time === "09:00", JSON.stringify(r.data.regularization));
  });
  await t.check("regularization for a future date is rejected (400)", async () => {
    const r = await emp.post("/api/attendance/regularizations", {
      companyId: cid,
      date: "2099-01-01",
      checkIn: "09:00",
      reason: "Future",
    });
    expectStatus(r, 400);
  });
  await t.check("employee cannot approve regularization (403)", async () => {
    const r = await emp.patch(`/api/attendance/regularizations/${state.regularizationId}${q(cid)}`, {
      action: "approve",
    });
    expectStatus(r, 403);
  });
  await t.check("company B cannot approve A's regularization (404)", async () => {
    const r = await state.adminB.patch(
      `/api/attendance/regularizations/${state.regularizationId}${q(fixtures.companyB)}`,
      { action: "approve" }
    );
    expectStatus(r, 404);
  });
  await t.check("manager approval writes a regularized attendance record", async () => {
    const r = await state.hrA.patch(`/api/attendance/regularizations/${state.regularizationId}${q(cid)}`, {
      action: "approve",
    });
    expectStatus(r, 200);
    const list = await emp.get(`/api/attendance/records${q(cid)}&date=2020-01-06`);
    expectStatus(list, 200);
    const rec = list.data.records[0];
    expect(rec && rec.is_regularized && rec.check_in_time === "09:00" && rec.check_out_time === "17:30", JSON.stringify(rec));
  });
  await t.check("HR manager cannot approve their own regularization (403)", async () => {
    const r = await state.hrA.post("/api/attendance/regularizations", {
      companyId: cid,
      employeeId: state.employee2Id,
      date: "2020-01-07",
      checkIn: "09:00",
      reason: "Own request (automated test)",
    });
    expectStatus(r, 201);
    const id = r.data.regularization.id;
    expectStatus(await state.hrA.patch(`/api/attendance/regularizations/${id}${q(cid)}`, { action: "approve" }), 403);
    expectStatus(await admin.patch(`/api/attendance/regularizations/${id}${q(cid)}`, { action: "reject" }), 200);
  });
  await t.check("import punches matches by employee code and keeps unmatched", async () => {
    const r = await admin.post("/api/attendance/punches", {
      companyId: cid,
      punches: [
        { deviceUserId: "E2E-004", punchTime: "2099-03-10T09:00", punchType: "In", deviceId: state.deviceId },
        { deviceUserId: "E2E-004", punchTime: "2099-03-10T18:30", punchType: "Out", deviceId: state.deviceId },
        { deviceUserId: "UNKNOWN-1", punchTime: "2099-03-10T09:05" },
      ],
    });
    expectStatus(r, 201);
    expect(r.data.matched === 2 && r.data.unmatched === 1, JSON.stringify(r.data));
  });
  await t.check("punch import referencing another company's device is rejected (400)", async () => {
    const r = await state.adminB.post("/api/attendance/punches", {
      companyId: fixtures.companyB,
      punches: [{ deviceUserId: "X", punchTime: "2099-03-10T09:00", deviceId: state.deviceId }],
    });
    expectStatus(r, 400);
  });
  await t.check("raw punches list for the date", async () => {
    const r = await admin.get(`/api/attendance/punches${q(cid)}&date=2099-03-10`);
    expectStatus(r, 200);
    expect(r.data.count === 3, `count ${r.data.count}`);
  });
  await t.check("processing punches creates attendance from first/last punch", async () => {
    const r = await admin.post("/api/attendance/punches/process", { companyId: cid, date: "2099-03-10" });
    expectStatus(r, 200);
    expect(r.data.processed === 1, JSON.stringify(r.data));
    const list = await admin.get(`/api/attendance/records${q(cid)}&date=2099-03-10&employeeId=${state.employee2Id}`);
    const rec = list.data.records[0];
    expect(rec && rec.check_in_time === "09:00" && rec.check_out_time === "18:30" && rec.working_minutes === 570, JSON.stringify(rec));
  });
  await t.check("employee role cannot view raw punches (403)", async () => {
    expectStatus(await emp.get(`/api/attendance/punches${q(cid)}&date=2099-03-10`), 403);
  });
  await t.check("employee cannot read a colleague's attendance via employeeId", async () => {
    const managerView = await admin.get(`/api/attendance/records${q(cid)}&date=2099-03-10&employeeId=${state.employee2Id}`);
    expect(managerView.data.count === 1, "colleague record missing for the check");
    const r = await emp.get(`/api/attendance/records${q(cid)}&date=2099-03-10&employeeId=${state.employee2Id}`);
    expectStatus(r, 200);
    expect(r.data.records.every((rec) => String(rec.employee_id) === state.employeeId), "colleague's attendance visible");
  });
  await t.check("monthly summary: per-status counts for recent months, own records for employees", async () => {
    const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date());
    expectStatus(await mark({ date: `${month}-01`, status: "Absent" }), 201);
    expectStatus(await admin.post("/api/attendance/records", { companyId: cid, employeeId: state.employee2Id, date: `${month}-01`, status: "Present" }), 201);

    const r = await admin.get(`/api/attendance/monthly-summary${q(cid)}&months=3`);
    expectStatus(r, 200);
    expect(r.data.months.length === 3, `months ${r.data.months.length}`);
    const current = r.data.months[2];
    expect(current.month === month && current.counts.Present === 1 && current.counts.Absent === 1 && current.total === 2, JSON.stringify(current));
    expect(r.data.months.slice(0, 2).every((m) => m.total === 0 && Object.keys(m.counts).length === 0), JSON.stringify(r.data.months));

    const own = await emp.get(`/api/attendance/monthly-summary${q(cid)}&months=3`);
    expectStatus(own, 200);
    const ownCurrent = own.data.months[2];
    expect(ownCurrent.counts.Absent === 1 && !ownCurrent.counts.Present && ownCurrent.total === 1, JSON.stringify(ownCurrent));

    expectStatus(await admin.get(`/api/attendance/monthly-summary${q(cid)}&months=0`), 400);
    expectStatus(await admin.get(`/api/attendance/monthly-summary${q(cid)}&months=13`), 400);
    expectStatus(await state.adminB.get(`/api/attendance/monthly-summary${q(cid)}`), 403);
  });
  await t.check("employee does not see device IP address or serial number", async () => {
    const r = await emp.get(`/api/attendance/devices${q(cid)}`);
    expectStatus(r, 200);
    expect(r.data.devices.length > 0, "no devices listed");
    expect(r.data.devices.every((d) => !("ip_address" in d) && !("serial_number" in d)), JSON.stringify(r.data.devices[0]));
    const m = await admin.get(`/api/attendance/devices${q(cid)}`);
    expect(m.data.devices.some((d) => d.ip_address === "192.0.2.10"), "manager lost device IP");
  });
}

async function payrollSuite(t, { fixtures, state }) {
  const cid = fixtures.companyA;
  const admin = state.adminA;
  const emp = state.employeeA;
  const comp = {};
  // Arbitrary test-company configuration exercising the formula engine; not statutory rates.
  const defs = [
    ["Basic", "Earning", "Percentage", "CTC"],
    ["HRA", "Earning", "Percentage", "Basic"],
    ["Special Allowance", "Earning", "Fixed", null],
    ["E2E Other Deduction", "Deduction", "Percentage", "Basic"],
    ["PF Employee Share", "Deduction", "Fixed", null],
    ["PF Employer Share", "Employer Contribution", "Fixed", null],
    ["E2E Loop A", "Earning", "Percentage", "E2E Loop B"],
    ["E2E Loop B", "Earning", "Percentage", "E2E Loop A"],
  ];

  await t.check("create salary components for structure", async () => {
    for (const [name, componentType, calculationType, percentageOf] of defs) {
      const r = await admin.post("/api/payroll/components", { companyId: cid, name, componentType, calculationType, percentageOf });
      expectStatus(r, 201, name);
      comp[name] = String(r.data.component.id);
    }
    state.components = comp;
  });
  await t.check("percentage component without base is rejected (400)", async () => {
    const r = await admin.post("/api/payroll/components", { companyId: cid, name: "E2E No Base", calculationType: "Percentage" });
    expectStatus(r, 400);
  });
  await t.check("create salary structure and save lines", async () => {
    let r = await admin.post("/api/payroll/structures", { companyId: cid, name: "E2E Standard" });
    expectStatus(r, 201);
    state.structureId = String(r.data.structure.id);
    r = await admin.request("PUT", `/api/payroll/structures/${state.structureId}/components${q(cid)}`, {
      body: {
        components: [
          { componentId: comp.Basic, percentage: 40 },
          { componentId: comp.HRA, percentage: 50 },
          { componentId: comp["Special Allowance"], amount: 15000 },
          { componentId: comp["E2E Other Deduction"], percentage: 10 },
          { componentId: comp["PF Employee Share"], amount: 1800 },
          { componentId: comp["PF Employer Share"], amount: 1800 },
        ],
      },
    });
    expectStatus(r, 200);
    expect(r.data.components.length === 6, `lines ${r.data.components.length}`);
  });
  await t.check("structure preview computes from configured lines", async () => {
    const r = await admin.get(`/api/payroll/structures/${state.structureId}/components${q(cid)}&previewCtc=600000`);
    expectStatus(r, 200);
    const p = r.data.preview;
    expect(p.gross === 45000 && p.deductions === 3800 && p.net === 41200 && p.employer === 1800, JSON.stringify(p));
  });
  await t.check("circular percentage references are rejected (400)", async () => {
    const s = await admin.post("/api/payroll/structures", { companyId: cid, name: "E2E Loop" });
    const r = await admin.request("PUT", `/api/payroll/structures/${s.data.structure.id}/components${q(cid)}`, {
      body: { components: [{ componentId: comp["E2E Loop A"], percentage: 10 }, { componentId: comp["E2E Loop B"], percentage: 10 }] },
    });
    expectStatus(r, 400);
  });
  await t.check("assign salary structure to employee", async () => {
    const r = await admin.post("/api/payroll/assignments", {
      companyId: cid,
      employeeId: state.employeeId,
      structureId: state.structureId,
      ctcAnnual: 600000,
      effectiveFrom: "2099-01-01",
    });
    expectStatus(r, 201);
  });
  await t.check("overlapping salary assignment is rejected (400)", async () => {
    const r = await admin.post("/api/payroll/assignments", {
      companyId: cid,
      employeeId: state.employeeId,
      structureId: state.structureId,
      ctcAnnual: 700000,
      effectiveFrom: "2099-06-01",
    });
    expectStatus(r, 400);
  });
  await t.check("employee requests advance; manager approves with EMI", async () => {
    let r = await emp.post("/api/payroll/advances", { companyId: cid, amount: 3000, purpose: "Automated test" });
    expectStatus(r, 201);
    state.advanceId = String(r.data.advance.id);
    expectStatus(await emp.patch(`/api/payroll/advances/${state.advanceId}${q(cid)}`, { action: "approve", emiAmount: 1000 }), 403);
    r = await state.hrA.patch(`/api/payroll/advances/${state.advanceId}${q(cid)}`, { action: "approve", emiAmount: 1000 });
    expectStatus(r, 200);
    expect(r.data.advance.status === "Active" && r.data.advance.balance === 3000, JSON.stringify(r.data.advance));
  });
  await t.check("employee cannot request advance for someone else (403)", async () => {
    const r = await emp.post("/api/payroll/advances", { companyId: cid, employeeId: state.employee2Id, amount: 100 });
    expectStatus(r, 403);
  });
  await t.check("HR manager cannot approve their own advance (403)", async () => {
    const r = await state.hrA.post("/api/payroll/advances", { companyId: cid, employeeId: state.employee2Id, amount: 500 });
    expectStatus(r, 201);
    const id = r.data.advance.id;
    expectStatus(await state.hrA.patch(`/api/payroll/advances/${id}${q(cid)}`, { action: "approve", emiAmount: 100 }), 403);
    expectStatus(await admin.patch(`/api/payroll/advances/${id}${q(cid)}`, { action: "reject" }), 200);
  });
  await t.check("create and process payroll run", async () => {
    let r = await admin.post("/api/payroll/runs", { companyId: cid, year: 2099, month: 3 });
    expectStatus(r, 201);
    state.runId = String(r.data.run.id);
    expectStatus(await admin.post("/api/payroll/runs", { companyId: cid, year: 2099, month: 3 }), 409);
    r = await state.hrA.patch(`/api/payroll/runs/${state.runId}${q(cid)}`, { action: "process" });
    expectStatus(r, 200);
    expect(r.data.processed === 1 && r.data.skipped.length === 1, JSON.stringify(r.data));
  });
  await t.check("payslip amounts match configuration and advance recovery", async () => {
    const r = await admin.get(`/api/payroll/runs/${state.runId}${q(cid)}`);
    expectStatus(r, 200);
    const p = r.data.payslips[0];
    const ok =
      p.basic_pay === 20000 && p.hra === 10000 && p.other_earnings === 15000 && p.gross_pay === 45000 &&
      p.pf_employee === 1800 && p.other_deductions === 3000 && p.total_deductions === 4800 &&
      p.net_salary === 40200 && p.pf_employer === 1800 && p.status === "Draft";
    expect(ok, JSON.stringify(p));
    expect(r.data.run.total_net === 40200, `total_net ${r.data.run.total_net}`);
  });
  await t.check("employee cannot see draft payslips", async () => {
    const r = await emp.get(`/api/payroll/payslips${q(cid)}`);
    expectStatus(r, 200);
    expect(r.data.count === 0, `count ${r.data.count}`);
  });
  await t.check("hr_manager cannot finalize (admin only, 403)", async () => {
    expectStatus(await state.hrA.patch(`/api/payroll/runs/${state.runId}${q(cid)}`, { action: "finalize" }), 403);
  });
  await t.check("company B cannot view or finalize A's payroll", async () => {
    expectStatus(await state.adminB.get(`/api/payroll/runs${q(cid)}`), 403);
    expectStatus(
      await state.adminB.patch(`/api/payroll/runs/${state.runId}${q(fixtures.companyB)}`, { action: "finalize" }),
      404
    );
  });
  await t.check("admin finalizes; advance balance reduced by EMI", async () => {
    const r = await admin.patch(`/api/payroll/runs/${state.runId}${q(cid)}`, { action: "finalize" });
    expectStatus(r, 200);
    expect(r.data.run.status === "Completed", r.data.run.status);
    const a = await admin.get(`/api/payroll/advances${q(cid)}`);
    const adv = a.data.advances.find((x) => String(x.id) === state.advanceId);
    expect(adv.balance === 2000 && adv.status === "Active", JSON.stringify(adv));
  });
  await t.check("completed run cannot be reprocessed (409)", async () => {
    expectStatus(await admin.patch(`/api/payroll/runs/${state.runId}${q(cid)}`, { action: "process" }), 409);
  });
  await t.check("employee sees own generated payslip", async () => {
    const r = await emp.get(`/api/payroll/payslips${q(cid)}`);
    expectStatus(r, 200);
    expect(r.data.count === 1 && r.data.payslips[0].net_salary === 40200, JSON.stringify(r.data.payslips[0]));
  });
  await t.check("statutory report totals come from payslips", async () => {
    const r = await admin.get(`/api/payroll/statutory${q(cid)}&runId=${state.runId}`);
    expectStatus(r, 200);
    expect(r.data.totals.pf_employee === 1800 && r.data.totals.pf_employer === 1800, JSON.stringify(r.data.totals));
  });
  await t.check("employee role cannot read salary structures or assignments (403)", async () => {
    expectStatus(await emp.get(`/api/payroll/structures${q(cid)}`), 403);
    expectStatus(await emp.get(`/api/payroll/assignments${q(cid)}`), 403);
    expectStatus(await emp.get(`/api/payroll/statutory${q(cid)}&runId=${state.runId}`), 403);
  });
}

async function payrollScenarios(t, { fixtures, state, pool }) {
  const cid = fixtures.companyA;
  const admin = state.adminA;
  const emp = state.employeeA;
  const runPath = (id) => `/api/payroll/runs/${id}${q(cid)}`;
  const createRun = async (month) => {
    const r = await admin.post("/api/payroll/runs", { companyId: cid, year: 2099, month });
    expectStatus(r, 201, `create run for month ${month}`);
    return String(r.data.run.id);
  };
  const processRun = (id) => admin.patch(runPath(id), { action: "process" });
  const slipFor = async (runId, employeeId) => {
    const r = await admin.get(runPath(runId));
    expectStatus(r, 200);
    return r.data.payslips.find((p) => String(p.employee_id) === employeeId);
  };
  const reservations = async () =>
    (
      await pool.query(
        `SELECT payroll_run_id::text AS run, amount::float8 AS amount, status
         FROM payroll_advance_recoveries WHERE advance_id = $1 ORDER BY id`,
        [state.advanceId]
      )
    ).rows;
  const advance = async () => {
    const r = await admin.get(`/api/payroll/advances${q(cid)}`);
    return r.data.advances.find((x) => String(x.id) === state.advanceId);
  };

  // Starting point: advance balance 2000 with EMI 1000; March 2099 is finalized.
  await t.check("three runs processed concurrently never reserve more than the balance", async () => {
    const ids = [await createRun(8), await createRun(9), await createRun(10)];
    const results = await Promise.all(ids.map(processRun));
    results.forEach((r) => expectStatus(r, 200));
    const rows = (await reservations()).filter((r) => r.status === "Reserved");
    const total = rows.reduce((s, r) => s + r.amount, 0);
    expect(rows.length === 2 && total === 2000, JSON.stringify(rows));
    for (const id of ids) expectStatus(await admin.patch(runPath(id), { action: "cancel" }), 200);
    const left = (await reservations()).filter((r) => r.status === "Reserved");
    expect(left.length === 0, JSON.stringify(left));
  });
  await t.check("sequential draft runs each reserve one EMI", async () => {
    state.run4 = await createRun(4);
    state.run5 = await createRun(5);
    expectStatus(await processRun(state.run4), 200);
    expectStatus(await processRun(state.run5), 200);
    const rows = (await reservations()).filter((r) => r.status === "Reserved");
    expect(rows.length === 2 && rows.every((r) => r.amount === 1000), JSON.stringify(rows));
  });
  await t.check("a third draft run recovers nothing once the balance is fully reserved", async () => {
    state.run6 = await createRun(6);
    expectStatus(await processRun(state.run6), 200);
    const slip = await slipFor(state.run6, state.employeeId);
    expect(
      slip.calculation_detail.advanceRecoveries.length === 0 && slip.net_salary === 41200,
      JSON.stringify(slip.calculation_detail.advanceRecoveries)
    );
  });
  await t.check("repeated processing replaces the run's reservation instead of adding one", async () => {
    expectStatus(await processRun(state.run4), 200);
    expectStatus(await processRun(state.run4), 200);
    const rows = (await reservations()).filter((r) => r.run === state.run4);
    expect(rows.length === 1 && rows[0].status === "Reserved" && rows[0].amount === 1000, JSON.stringify(rows));
  });
  await t.check("cancelling a run releases its reservation and keeps the run", async () => {
    const r = await admin.patch(runPath(state.run5), { action: "cancel" });
    expectStatus(r, 200);
    expect(r.data.run.status === "Cancelled" && r.data.releasedRecoveries === 1, JSON.stringify(r.data));
    const rows = (await reservations()).filter((x) => x.run === state.run5);
    expect(rows.length === 1 && rows[0].status === "Released", JSON.stringify(rows));
    expectStatus(await admin.patch(runPath(state.run5), { action: "finalize" }), 409);
    expectStatus(await processRun(state.run5), 409);
  });
  await t.check("released amount becomes available to another draft run", async () => {
    expectStatus(await processRun(state.run6), 200);
    const slip = await slipFor(state.run6, state.employeeId);
    const rec = slip.calculation_detail.advanceRecoveries;
    expect(rec.length === 1 && rec[0].amount === 1000 && slip.net_salary === 40200, JSON.stringify(rec));
  });
  await t.check("a cancelled month can be run again; only one active run per month", async () => {
    state.run5b = await createRun(5);
    expectStatus(await admin.post("/api/payroll/runs", { companyId: cid, year: 2099, month: 5 }), 409);
    const list = await admin.get(`/api/payroll/runs${q(cid)}`);
    const may = list.data.runs.filter((r) => r.pay_period_year === 2099 && r.pay_period_month === 5);
    expect(
      may.length === 2 && may.some((r) => r.status === "Cancelled") && may.some((r) => r.status === "Draft"),
      JSON.stringify(may.map((r) => r.status))
    );
  });
  await t.check("concurrent finalize requests apply the recovery exactly once", async () => {
    const results = await Promise.all([
      admin.patch(runPath(state.run4), { action: "finalize" }),
      admin.patch(runPath(state.run4), { action: "finalize" }),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses[0] === 200 && statuses[1] === 409, `statuses ${statuses}`);
    const adv = await advance();
    expect(adv.balance === 1000 && adv.status === "Active", JSON.stringify(adv));
    const rows = (await reservations()).filter((x) => x.run === state.run4);
    expect(rows[0].status === "Recovered", JSON.stringify(rows));
  });
  await t.check("an advance with a reserved recovery cannot be closed manually (409)", async () => {
    expectStatus(await admin.patch(`/api/payroll/advances/${state.advanceId}${q(cid)}`, { action: "close" }), 409);
  });
  await t.check("recovery across periods closes the advance at zero", async () => {
    expectStatus(await admin.patch(runPath(state.run6), { action: "finalize" }), 200);
    const adv = await advance();
    expect(adv.balance === 0 && adv.status === "Closed", JSON.stringify(adv));
  });
  await t.check("a run processed after the advance closed recovers nothing", async () => {
    expectStatus(await processRun(state.run5b), 200);
    const slip = await slipFor(state.run5b, state.employeeId);
    expect(slip.calculation_detail.advanceRecoveries.length === 0 && slip.net_salary === 41200, JSON.stringify(slip));
  });
  await t.check("negative net pay is reported, blocks finalize, and is not altered", async () => {
    let r = await admin.post("/api/payroll/components", {
      companyId: cid,
      name: "E2E Large Recovery",
      componentType: "Deduction",
      calculationType: "Fixed",
    });
    expectStatus(r, 201);
    const deductionId = String(r.data.component.id);
    r = await admin.post("/api/payroll/structures", { companyId: cid, name: "E2E Negative Net" });
    expectStatus(r, 201);
    const structureId = String(r.data.structure.id);
    r = await admin.request("PUT", `/api/payroll/structures/${structureId}/components${q(cid)}`, {
      body: {
        components: [
          { componentId: state.components["Special Allowance"], amount: 1000 },
          { componentId: deductionId, amount: 5000 },
        ],
      },
    });
    expectStatus(r, 200);
    r = await admin.post("/api/payroll/assignments", {
      companyId: cid,
      employeeId: state.employee2Id,
      structureId,
      ctcAnnual: 12000,
      effectiveFrom: "2099-07-01",
    });
    expectStatus(r, 201);

    state.run7 = await createRun(7);
    r = await processRun(state.run7);
    expectStatus(r, 200);
    const flagged = r.data.negativeNet.find((x) => x.employeeId === state.employee2Id);
    expect(flagged && flagged.netSalary === -4000 && r.data.warnings.length === 1, JSON.stringify(r.data));

    r = await admin.patch(runPath(state.run7), { action: "finalize" });
    expectStatus(r, 409);
    expect(r.data.negativeNet.some((x) => x.employeeId === state.employee2Id), JSON.stringify(r.data));
    const slip = await slipFor(state.run7, state.employee2Id);
    expect(slip.net_salary === -4000 && slip.status === "Draft", JSON.stringify(slip));
    expectStatus(await admin.patch(runPath(state.run7), { action: "cancel" }), 200);
  });

  await t.check("employee sees only own payslips", async () => {
    const r = await emp.get(`/api/payroll/payslips${q(cid)}&employeeId=${state.employee2Id}`);
    expectStatus(r, 200);
    expect(r.data.count === 3, `count ${r.data.count}`);
    expect(r.data.payslips.every((p) => String(p.employee_id) === state.employeeId), "foreign payslip visible");
  });
  await t.check("employee cannot read a colleague's leave, balances, salary or advances", async () => {
    expectStatus(await emp.get(`/api/leave/requests/${state.leave2Id}${q(cid)}`), 404);
    const requests = await emp.get(`/api/leave/requests${q(cid)}&employeeId=${state.employee2Id}`);
    expect(requests.data.requests.every((x) => String(x.employee_id) === state.employeeId), "colleague leave visible");
    const balances = await emp.get(`/api/leave/balances${q(cid)}&year=2099&employeeId=${state.employee2Id}`);
    expect(balances.data.balances.every((x) => String(x.employee_id) === state.employeeId), "colleague balance visible");
    expectStatus(await emp.get(`/api/payroll/assignments${q(cid)}&employeeId=${state.employee2Id}`), 403);
    const advances = await emp.get(`/api/payroll/advances${q(cid)}`);
    expect(advances.data.advances.every((x) => String(x.employee_id) === state.employeeId), "colleague advance visible");
  });
}

async function loginThrottling(t, { ApiClient, fixtures }) {
  const user = fixtures.users.throttleA;
  const client = new ApiClient("throttle");
  const attempt = (password, email = user.email) => client.post("/api/auth/login", { email, password });

  // Assumes the default policy: LOGIN_MAX_FAILURES=5 within LOGIN_WINDOW_MINUTES.
  await t.check("a successful login resets the failure counter", async () => {
    for (let i = 0; i < 2; i++) expectStatus(await attempt("wrong-password-1"), 401);
    expectStatus(await attempt(user.password), 200);
    for (let i = 0; i < 4; i++) expectStatus(await attempt("wrong-password-2"), 401);
  });
  await t.check("after 5 failures the account is refused even with the right password (429)", async () => {
    expectStatus(await attempt("wrong-password-3"), 401);
    const r = await attempt(user.password);
    expectStatus(r, 429);
    expect(Number(r.headers.get("retry-after")) > 0, "Retry-After header missing");
  });
  await t.check("unknown accounts are throttled the same way", async () => {
    for (let i = 0; i < 5; i++) expectStatus(await attempt("wrong-password-4", THROTTLE_UNKNOWN_EMAIL), 401);
    expectStatus(await attempt("wrong-password-4", THROTTLE_UNKNOWN_EMAIL), 429);
  });
  await t.check("other accounts can still sign in", async () => {
    const other = new ApiClient("throttle-other");
    await other.login(fixtures.users.adminB);
  });
}

export const suites = [
  ["Health and CORS", health],
  ["Authentication and sessions", auth],
  ["Departments", departments],
  ["Designations", designations],
  ["Designation departments", designationDepartments],
  ["Employees", employees],
  ["Employee login links and directory privacy", identityLinks],
  ["Shifts", shiftsSuite],
  ["Biometric devices", devicesSuite],
  ["Rosters", rostersSuite],
  ["Attendance, regularization and punches", attendanceSuite],
  ["Holidays", holidaysSuite],
  ["Leave types", leaveTypesSuite],
  ["Leave requests and balances", leaveWorkflow],
  ["Salary components", componentsSuite],
  ["Company HR & payroll policy", policySuite],
  ["Payroll: structures, advances, runs, payslips", payrollSuite],
  ["Payroll: reservations, cancellation, reruns, negative net", payrollScenarios],
  ["Role permissions", permissions],
  ["Company isolation", isolation],
  ["Policy rules: LOP, rounding, re-approval, leave counting, night shift", policyRulesSuite],
  ["Leave carry-forward", carryForwardSuite],
  ["Delegated approvals and approval audit", delegationSuite],
  ["Employee profile", profileSuite],
  ["Employee documents", documentsSuite],
  ["Multi-company user", multiCompanySuite],
  ["Provisional payroll without an approved policy", provisionalPayrollSuite],
  ["Employee invitations", invitationSuite],
  ["Company access: roles, suspension, last admin", memberAccessSuite],
  ["Employee deactivation and access", deactivationSuite],
  ["Company registration and rate limiting", registrationSuite],
  ["Database-enforced tenant references", tenantConstraintSuite],
  ["Login throttling", loginThrottling],
  ["Logout", logout],
];
