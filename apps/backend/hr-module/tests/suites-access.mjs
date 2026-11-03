// Invitations, company-scoped suspension, last-admin protection, registration
// rate limiting and database-enforced tenant references. Uses company C, which
// no other suite touches, plus companies A and B for cross-tenant checks.

import { expect, expectStatus } from "./assert.mjs";
import { REGISTRATION_TEST_EMAILS, TEST_EMAIL_DOMAIN } from "./fixtures.mjs";

const q = (companyId) => `?companyId=${encodeURIComponent(companyId)}`;
const NEW_PASSWORD = `Inv1te-${Date.now().toString(36)}-pass`;

async function loggedIn(ApiClient, user, label) {
  const client = new ApiClient(label);
  await client.login(user);
  return client;
}

async function createEmployee(api, companyId, { code, name, email, department, designation }) {
  const r = await api.post("/api/employees", {
    companyId,
    employeeCode: code,
    name,
    department,
    designation,
    email,
  });
  expectStatus(r, 201, `create employee ${code}`);
  return String(r.data.employee.id);
}

export async function invitationSuite(t, { ApiClient, fixtures, state, pool }) {
  const c = fixtures.companyC;
  const { adminC, hrC, staffC, multi } = fixtures.users;
  const adminCApi = await loggedIn(ApiClient, adminC, "adminC");
  const hrCApi = await loggedIn(ApiClient, hrC, "hrC");
  const staffCApi = await loggedIn(ApiClient, staffC, "staffC");
  const anon = new ApiClient("invitee");
  state.adminC = adminCApi;
  state.hrC = hrCApi;
  state.staffC = staffCApi;

  const invite = (api, body, companyId = c) => api.post(`/api/invitations${q(companyId)}`, body);
  const lookup = (client, token) => client.post("/api/invitations/lookup", { token });
  const accept = (client, body) => client.post("/api/invitations/accept", body);
  const newEmail = `e2e.invitee-new@${TEST_EMAIL_DOMAIN}`;

  await t.check("company C has a department, designation and an unlinked employee record", async () => {
    expectStatus(await adminCApi.post("/api/departments", { companyId: c, departmentName: "E2E C Operations" }), 201);
    expectStatus(await adminCApi.post("/api/designations", { companyId: c, designationName: "E2E C Associate" }), 201);
    state.cOrg = { department: "E2E C Operations", designation: "E2E C Associate" };
    state.cNewHireId = await createEmployee(adminCApi, c, {
      code: "E2E-C-001",
      name: "E2E New Hire C",
      email: newEmail,
      ...state.cOrg,
    });
  });

  await t.check("employees cannot issue invitations (403)", async () => {
    expectStatus(await invite(staffCApi, { email: `e2e.nope@${TEST_EMAIL_DOMAIN}`, role: "employee" }), 403);
  });
  await t.check("HR managers can invite employees but not admins or HR managers (403)", async () => {
    expectStatus(await invite(hrCApi, { email: `e2e.hr-escalate@${TEST_EMAIL_DOMAIN}`, role: "company_admin" }), 403);
    expectStatus(await invite(hrCApi, { email: `e2e.hr-escalate@${TEST_EMAIL_DOMAIN}`, role: "hr_manager" }), 403);
    const r = await invite(hrCApi, { email: `e2e.hr-invitee@${TEST_EMAIL_DOMAIN}`, role: "employee" });
    expectStatus(r, 201);
    state.hrIssuedToken = r.data.token;
  });
  await t.check("invitation input is validated", async () => {
    expectStatus(await invite(adminCApi, { email: "not-an-email", role: "employee" }), 400);
    expectStatus(await invite(adminCApi, { email: `e2e.x@${TEST_EMAIL_DOMAIN}`, role: "platform_admin" }), 400);
    expectStatus(await invite(adminCApi, { email: staffC.email, role: "employee" }), 409);
  });
  await t.check("an employee record of another company cannot be attached (400)", async () => {
    const r = await invite(adminCApi, { email: `e2e.cross@${TEST_EMAIL_DOMAIN}`, role: "employee", employeeId: state.employeeId });
    expectStatus(r, 400);
  });
  await t.check("an invitation is issued with a one-time token that is never listed", async () => {
    const r = await invite(adminCApi, { email: newEmail, role: "employee", employeeId: state.cNewHireId });
    expectStatus(r, 201);
    expect(/^[A-Za-z0-9_-]{43}$/.test(r.data.token), "token format");
    state.newHireToken = r.data.token;
    state.newHireInvitationId = r.data.invitation.id;
    const list = await adminCApi.get(`/api/invitations${q(c)}`);
    expectStatus(list, 200);
    const text = JSON.stringify(list.data);
    expect(!text.includes(r.data.token) && !text.includes("token_hash"), "token or hash exposed in list");
    const row = list.data.invitations.find((i) => i.id === state.newHireInvitationId);
    expect(row && row.state === "pending" && row.employee_id === state.cNewHireId, JSON.stringify(row));
    const stored = await pool.query("SELECT token_hash FROM company_invitations WHERE id = $1", [state.newHireInvitationId]);
    expect(stored.rows[0].token_hash !== r.data.token && /^[0-9a-f]{64}$/.test(stored.rows[0].token_hash), "token stored in clear");
  });
  await t.check("other companies cannot list or revoke company C invitations", async () => {
    expectStatus(await state.adminB.get(`/api/invitations${q(c)}`), 403);
    expectStatus(await state.adminB.delete(`/api/invitations/${state.newHireInvitationId}${q(c)}`), 403);
    expectStatus(await state.adminB.delete(`/api/invitations/${state.newHireInvitationId}${q(fixtures.companyB)}`), 404);
  });
  await t.check("lookup describes the invitation; malformed or unknown tokens are rejected", async () => {
    expectStatus(await lookup(anon, "short"), 404);
    expectStatus(await lookup(anon, "A".repeat(43)), 404);
    const r = await lookup(anon, state.newHireToken);
    expectStatus(r, 200);
    const inv = r.data.invitation;
    expect(inv.companyName === "E2E Test Company C [automated]" && inv.email === newEmail, JSON.stringify(inv));
    expect(inv.role === "employee" && inv.accountExists === false && inv.employeeName === "E2E New Hire C", JSON.stringify(inv));
  });
  await t.check("acceptance requires a full name and a 12-72 character password", async () => {
    expectStatus(await accept(anon, { token: state.newHireToken, fullName: "E2E New Hire C", password: "short" }), 400);
    expectStatus(await accept(anon, { token: state.newHireToken, fullName: "", password: NEW_PASSWORD }), 400);
    expectStatus(await lookup(anon, state.newHireToken), 200);
  });
  await t.check("a new hire joins only the inviting company, with the invited role, ignoring tenant/role in the body", async () => {
    const r = await accept(anon, {
      token: state.newHireToken,
      fullName: "E2E New Hire C",
      password: NEW_PASSWORD,
      companyId: fixtures.companyA,
      role: "company_admin",
    });
    expectStatus(r, 200);
    expect(r.data.companyId === c && r.data.role === "employee", JSON.stringify(r.data));
    expect(anon.cookie.startsWith("hrms_session="), "no session after acceptance");
    const me = await anon.get("/api/auth/me");
    expectStatus(me, 200);
    const ms = me.data.memberships;
    expect(ms.length === 1 && String(ms[0].companyId) === c && ms[0].role === "employee", JSON.stringify(ms));
    expect(ms[0].employeeId === state.cNewHireId, `linked employee ${ms[0].employeeId}`);
    expectStatus(await anon.get(`/api/employees${q(fixtures.companyA)}`), 403);
    expectStatus(await anon.get(`/api/employees${q(c)}`), 200);
    state.newHire = anon;
  });
  await t.check("an invitation can be used only once (410)", async () => {
    const other = new ApiClient("replay");
    const r = await accept(other, { token: state.newHireToken, fullName: "E2E Replay", password: NEW_PASSWORD });
    expectStatus(r, 410);
    expect(r.data.state === "accepted", JSON.stringify(r.data));
    expectStatus(await lookup(other, state.newHireToken), 410);
  });
  await t.check("the invitee chose the password: the new account signs in with it", async () => {
    const fresh = new ApiClient("new-hire-login");
    await fresh.login({ email: newEmail, password: NEW_PASSWORD });
  });

  await t.check("expired invitations cannot be looked up or accepted (410)", async () => {
    const r = await invite(adminCApi, { email: `e2e.expired@${TEST_EMAIL_DOMAIN}`, role: "employee" });
    expectStatus(r, 201);
    await pool.query(
      `UPDATE company_invitations
       SET created_at = NOW() - INTERVAL '4 days', expires_at = NOW() - INTERVAL '1 minute'
       WHERE id = $1 AND company_id = $2`,
      [r.data.invitation.id, c]
    );
    const seen = await lookup(new ApiClient("expired"), r.data.token);
    expectStatus(seen, 410);
    expect(seen.data.state === "expired", JSON.stringify(seen.data));
    const used = await accept(new ApiClient("expired"), { token: r.data.token, fullName: "E2E Expired", password: NEW_PASSWORD });
    expectStatus(used, 410);
    const user = await pool.query("SELECT 1 FROM users WHERE email = $1", [`e2e.expired@${TEST_EMAIL_DOMAIN}`]);
    expect(user.rowCount === 0, "account created from an expired invitation");
  });
  await t.check("revoked and replaced invitations stop working", async () => {
    const email = `e2e.revoked@${TEST_EMAIL_DOMAIN}`;
    const first = await invite(adminCApi, { email, role: "employee" });
    const second = await invite(adminCApi, { email, role: "employee" });
    expectStatus(second, 201);
    const replaced = await lookup(new ApiClient("r"), first.data.token);
    expect(replaced.status === 410 && replaced.data.state === "revoked", JSON.stringify(replaced.data));
    expectStatus(await adminCApi.delete(`/api/invitations/${second.data.invitation.id}${q(c)}`), 200);
    expectStatus(await adminCApi.delete(`/api/invitations/${second.data.invitation.id}${q(c)}`), 409);
    expectStatus(await accept(new ApiClient("r"), { token: second.data.token, fullName: "E2E Revoked", password: NEW_PASSWORD }), 410);
  });
  await t.check("HR managers cannot revoke admin invitations (403)", async () => {
    const r = await invite(adminCApi, { email: `e2e.future-admin@${TEST_EMAIL_DOMAIN}`, role: "company_admin" });
    expectStatus(r, 201);
    expectStatus(await hrCApi.delete(`/api/invitations/${r.data.invitation.id}${q(c)}`), 403);
    expectStatus(await adminCApi.delete(`/api/invitations/${r.data.invitation.id}${q(c)}`), 200);
  });

  await t.check("an existing account must authenticate before accepting", async () => {
    const r = await invite(adminCApi, { email: multi.email, role: "employee" });
    expectStatus(r, 201);
    state.multiToken = r.data.token;
    const anonymous = new ApiClient("multi-anon");
    const seen = await lookup(anonymous, r.data.token);
    expect(seen.data.invitation.accountExists === true, JSON.stringify(seen.data));
    const noAuth = await accept(anonymous, { token: r.data.token });
    expectStatus(noAuth, 401);
    expect(noAuth.data.requiresLogin === true, JSON.stringify(noAuth.data));
    const wrong = await accept(anonymous, { token: r.data.token, password: "not-the-password-1" });
    expectStatus(wrong, 401);
    // A new-account form cannot take over an existing account.
    expectStatus(await accept(anonymous, { token: r.data.token, fullName: "Takeover", password: NEW_PASSWORD }), 401);
    expect(!anonymous.cookie, "session issued without authentication");
  });
  await t.check("a different signed-in account cannot accept someone else's invitation (403)", async () => {
    const r = await accept(staffCApi, { token: state.multiToken });
    expectStatus(r, 403);
    expect(r.data.code === "wrong_account", JSON.stringify(r.data));
  });
  await t.check("the existing account accepts while signed in; other memberships and password are unchanged", async () => {
    const multiApi = await loggedIn(ApiClient, multi, "multi-accept");
    expectStatus(await accept(multiApi, { token: state.multiToken }), 200);
    const me = await multiApi.get("/api/auth/me");
    const roles = Object.fromEntries(me.data.memberships.map((m) => [String(m.companyId), m.role]));
    expect(
      roles[fixtures.companyA] === "employee" && roles[fixtures.companyB] === "hr_manager" && roles[c] === "employee",
      JSON.stringify(roles)
    );
    await loggedIn(ApiClient, multi, "multi-relogin");
  });
  await t.check("an invitation issued by someone who lost the right to grant it is void (410)", async () => {
    const r = await invite(hrCApi, { email: `e2e.stale@${TEST_EMAIL_DOMAIN}`, role: "employee" });
    expectStatus(r, 201);
    expectStatus(await adminCApi.patch(`/api/members/${hrC.userId}${q(c)}`, { role: "employee" }), 200);
    try {
      const used = await accept(new ApiClient("stale"), { token: r.data.token, fullName: "E2E Stale", password: NEW_PASSWORD });
      expectStatus(used, 410);
    } finally {
      expectStatus(await adminCApi.patch(`/api/members/${hrC.userId}${q(c)}`, { role: "hr_manager" }), 200);
    }
  });
  await t.check("invitation activity is audited", async () => {
    const r = await pool.query(
      "SELECT action, COUNT(*)::int AS n FROM membership_events WHERE company_id = $1 GROUP BY action",
      [c]
    );
    const counts = Object.fromEntries(r.rows.map((row) => [row.action, row.n]));
    expect(counts.invited >= 6 && counts.invitation_accepted === 2 && counts.invitation_revoked >= 2, JSON.stringify(counts));
  });
}

export async function memberAccessSuite(t, { ApiClient, fixtures, state, pool }) {
  const c = fixtures.companyC;
  const { adminC, adminC2, hrC, staffC, multi } = fixtures.users;
  const adminCApi = state.adminC;
  const hrCApi = state.hrC;
  const staffCApi = state.staffC;
  const member = (api, userId, body, companyId = c) => api.patch(`/api/members/${userId}${q(companyId)}`, body);

  await t.check("members list can include suspended members (managers only)", async () => {
    const r = await adminCApi.get(`/api/members${q(c)}&includeSuspended=1`);
    expectStatus(r, 200);
    expect(r.data.members.every((m) => ["active", "suspended"].includes(m.membership_status)), "unexpected status");
    expectStatus(await staffCApi.get(`/api/members${q(c)}&includeSuspended=1`), 403);
  });
  await t.check("employees cannot change access (403)", async () => {
    expectStatus(await member(staffCApi, hrC.userId, { status: "suspended" }), 403);
  });
  await t.check("HR managers cannot change roles or touch admin/HR access (403)", async () => {
    expectStatus(await member(hrCApi, staffC.userId, { role: "hr_manager" }), 403);
    expectStatus(await member(hrCApi, adminC2.userId, { status: "suspended" }), 403);
  });
  await t.check("nobody can change their own access (403)", async () => {
    expectStatus(await member(adminCApi, adminC.userId, { role: "employee" }), 403);
    expectStatus(await member(hrCApi, hrC.userId, { status: "suspended" }), 403);
  });
  await t.check("access changes are validated and company-scoped", async () => {
    expectStatus(await member(adminCApi, staffC.userId, { role: "owner" }), 400);
    expectStatus(await member(adminCApi, staffC.userId, { status: "deleted" }), 400);
    expectStatus(await member(adminCApi, staffC.userId, {}), 400);
    expectStatus(await member(state.adminB, staffC.userId, { status: "suspended" }), 403);
    expectStatus(await member(state.adminB, staffC.userId, { status: "suspended" }, fixtures.companyB), 404);
  });
  await t.check("HR suspends an employee: access to the company stops at once, and reactivation restores it", async () => {
    expectStatus(await member(hrCApi, staffC.userId, { status: "suspended" }), 200);
    expectStatus(await staffCApi.get(`/api/employees${q(c)}`), 403);
    const me = await staffCApi.get("/api/auth/me");
    expect(!me.data.memberships.some((m) => String(m.companyId) === c), "suspended company still listed");
    expectStatus(await member(hrCApi, staffC.userId, { status: "active" }), 200);
    expectStatus(await staffCApi.get(`/api/employees${q(c)}`), 200);
  });
  await t.check("suspension in one company leaves the user's other companies untouched", async () => {
    const multiApi = await loggedIn(ApiClient, multi, "multi-suspend");
    expectStatus(await member(state.adminB, multi.userId, { status: "suspended" }, fixtures.companyB), 200);
    try {
      expectStatus(await multiApi.get(`/api/employees${q(fixtures.companyB)}`), 403);
      expectStatus(await multiApi.get(`/api/employees${q(fixtures.companyA)}`), 200);
      expectStatus(await multiApi.get(`/api/employees${q(c)}`), 200);
    } finally {
      expectStatus(await member(state.adminB, multi.userId, { status: "active" }, fixtures.companyB), 200);
    }
    expectStatus(await multiApi.get(`/api/employees${q(fixtures.companyB)}`), 200);
  });
  await t.check("concurrent mutual demotion of two admins leaves exactly one active admin", async () => {
    const admin2Api = await loggedIn(ApiClient, adminC2, "adminC2");
    const [one, two] = await Promise.all([
      member(adminCApi, adminC2.userId, { role: "employee" }),
      member(admin2Api, adminC.userId, { role: "employee" }),
    ]);
    const statuses = [one.status, two.status].sort();
    expect(statuses[0] === 200 && [403, 409].includes(statuses[1]), `statuses ${statuses}`);
    const admins = await pool.query(
      "SELECT user_id FROM company_memberships WHERE company_id = $1 AND role = 'company_admin' AND status = 'active'",
      [c]
    );
    expect(admins.rowCount === 1, `active admins ${admins.rowCount}`);
    // Restore both admins for the remaining checks.
    const survivor = String(admins.rows[0].user_id) === adminC.userId ? adminCApi : admin2Api;
    const demoted = survivor === adminCApi ? adminC2 : adminC;
    expectStatus(await member(survivor, demoted.userId, { role: "company_admin" }), 200);
  });
  await t.check("the sole remaining admin cannot be suspended by HR or by themselves", async () => {
    expectStatus(await member(adminCApi, adminC2.userId, { status: "suspended" }), 200);
    try {
      expectStatus(await member(adminCApi, adminC.userId, { status: "suspended" }), 403);
      expectStatus(await member(hrCApi, adminC.userId, { status: "suspended" }), 403);
      const admins = await pool.query(
        "SELECT COUNT(*)::int AS n FROM company_memberships WHERE company_id = $1 AND role = 'company_admin' AND status = 'active'",
        [c]
      );
      expect(admins.rows[0].n === 1, `active admins ${admins.rows[0].n}`);
    } finally {
      expectStatus(await member(adminCApi, adminC2.userId, { status: "active" }), 200);
    }
  });
  await t.check("role and status changes are audited with the acting user", async () => {
    const r = await pool.query(
      `SELECT action, actor_user_id::text AS actor FROM membership_events
       WHERE company_id = $1 AND action IN ('role_changed', 'suspended', 'reactivated')`,
      [c]
    );
    const actions = new Set(r.rows.map((row) => row.action));
    expect(actions.has("role_changed") && actions.has("suspended") && actions.has("reactivated"), [...actions].join());
    expect(r.rows.some((row) => row.action === "suspended" && row.actor === hrC.userId), "HR suspension not attributed");
  });
}

export async function deactivationSuite(t, { ApiClient, fixtures, state }) {
  const c = fixtures.companyC;
  const { adminC, adminC2, hrC, staffC, multi } = fixtures.users;
  const adminCApi = state.adminC;
  const hrCApi = state.hrC;
  const staffCApi = state.staffC;
  const employeePath = (id, companyId = c) => `/api/employees/${id}${q(companyId)}`;

  await t.check("employee records are linked to company C logins", async () => {
    const link = async (code, name, user) => {
      const id = await createEmployee(adminCApi, c, { code, name, email: user.email, ...state.cOrg });
      expectStatus(await adminCApi.patch(employeePath(id), { userId: user.userId }), 200);
      return id;
    };
    state.cStaffEmployeeId = await link("E2E-C-010", "E2E Staff C", staffC);
    state.cAdmin2EmployeeId = await link("E2E-C-011", "E2E Second Admin C", adminC2);
    state.cAdminEmployeeId = await link("E2E-C-012", "E2E Admin C", adminC);
  });
  await t.check("deactivating an employee suspends their company access; reactivating the record does not restore it", async () => {
    const r = await hrCApi.patch(employeePath(state.cStaffEmployeeId), { status: "Inactive" });
    expectStatus(r, 200);
    expect(r.data.accessSuspended === true && r.data.employee.status === "Inactive", JSON.stringify(r.data));
    expectStatus(await staffCApi.get(`/api/employees${q(c)}`), 403);
    expectStatus(await hrCApi.patch(`/api/members/${staffC.userId}${q(c)}`, { status: "active" }), 409);
    expectStatus(await staffCApi.get(`/api/employees${q(c)}`), 403);
    expectStatus(await hrCApi.patch(employeePath(state.cStaffEmployeeId), { status: "Active" }), 200);
    expectStatus(await staffCApi.get(`/api/employees${q(c)}`), 403);
    expectStatus(await hrCApi.patch(`/api/members/${staffC.userId}${q(c)}`, { status: "active" }), 200);
    expectStatus(await staffCApi.get(`/api/employees${q(c)}`), 200);
  });
  await t.check("HR cannot deactivate an employee who holds admin access; nothing changes (403)", async () => {
    expectStatus(await hrCApi.patch(employeePath(state.cAdmin2EmployeeId), { status: "Inactive" }), 403);
    const r = await adminCApi.get(employeePath(state.cAdmin2EmployeeId));
    expect(r.data.employee.status === "Active", `status ${r.data.employee.status}`);
  });
  await t.check("nobody can deactivate their own employee record (403)", async () => {
    expectStatus(await adminCApi.patch(employeePath(state.cAdminEmployeeId), { status: "Inactive" }), 403);
  });
  await t.check("deactivating in one company does not affect the same person's other companies", async () => {
    const adminBApi = state.adminB;
    const b = fixtures.companyB;
    expectStatus(await adminBApi.post("/api/departments", { companyId: b, departmentName: "E2E B Ops" }), 201);
    expectStatus(await adminBApi.post("/api/designations", { companyId: b, designationName: "E2E B Lead" }), 201);
    const id = await createEmployee(adminBApi, b, {
      code: "E2E-B-MULTI",
      name: "E2E Multi in B",
      email: multi.email,
      department: "E2E B Ops",
      designation: "E2E B Lead",
    });
    expectStatus(await adminBApi.patch(employeePath(id, b), { userId: multi.userId }), 200);
    const multiApi = await loggedIn(ApiClient, multi, "multi-deactivate");
    const r = await adminBApi.patch(employeePath(id, b), { status: "Inactive" });
    expect(r.status === 200 && r.data.accessSuspended === true, JSON.stringify(r.data));
    expectStatus(await multiApi.get(`/api/employees${q(b)}`), 403);
    expectStatus(await multiApi.get(`/api/employees${q(fixtures.companyA)}`), 200);
    expectStatus(await multiApi.get(`/api/employees${q(c)}`), 200);
    expectStatus(await adminBApi.patch(`/api/members/${multi.userId}${q(b)}`, { status: "active" }), 409);
    expectStatus(await adminBApi.patch(employeePath(id, b), { status: "Active" }), 200);
    expectStatus(await adminBApi.patch(`/api/members/${multi.userId}${q(b)}`, { status: "active" }), 200);
  });
  await t.check("HR still cannot reactivate admin access (403)", async () => {
    expectStatus(await hrCApi.patch(`/api/members/${adminC.userId}${q(c)}`, { status: "active" }), 403);
    expectStatus(await hrCApi.patch(`/api/members/${hrC.userId}${q(c)}`, { status: "active" }), 403);
  });
}

export async function registrationSuite(t, { ApiClient }) {
  const anon = new ApiClient("registrant");
  const [emailA, emailB] = REGISTRATION_TEST_EMAILS;
  const register = (email, label) =>
    anon.post("/api/companies/register", {
      companyName: `E2E Test Company ${label} [automated]`,
      fullName: "E2E Registrant",
      email,
      password: NEW_PASSWORD,
    });

  // Assumes the default policy: REGISTRATION_MAX_PER_EMAIL=3 per window.
  await t.check("registration creates a pending company whose admin cannot sign in yet", async () => {
    expectStatus(await register(emailA, "Registered A"), 201);
    expectStatus(await anon.post("/api/auth/login", { email: emailA, password: NEW_PASSWORD }), 401);
  });
  await t.check("repeated registrations for one email are refused, then rate limited (429)", async () => {
    expectStatus(await register(emailA, "Registered A2"), 409);
    expectStatus(await register(emailA, "Registered A3"), 409);
    const limited = await register(emailA, "Registered A4");
    expectStatus(limited, 429);
    expect(Number(limited.headers.get("retry-after")) > 0, "Retry-After header missing");
  });
  await t.check("the limit is per email: another address can still register", async () => {
    expectStatus(await register(emailB, "Registered B"), 201);
  });
  await t.check("registration from a foreign origin is rejected (403)", async () => {
    const r = await anon.post(
      "/api/companies/register",
      { companyName: "E2E Test Company X [automated]", fullName: "E2E X", email: emailB, password: NEW_PASSWORD },
      { origin: "https://evil.example" }
    );
    expectStatus(r, 403);
  });
}

/**
 * Inserts directly through the database, inside a transaction that is always
 * rolled back, to prove the schema itself rejects cross-company references.
 */
export async function tenantConstraintSuite(t, { fixtures, state, pool }) {
  const a = fixtures.companyA;
  const b = fixtures.companyB;
  const client = await pool.connect();
  const refused = async (label, constraint, sql, params) => {
    await client.query("SAVEPOINT probe");
    try {
      await client.query(sql, params);
      throw new Error(`${label}: insert was accepted`);
    } catch (error) {
      if (error.message.endsWith("insert was accepted")) throw error;
      expect(error.code === "23503" && error.constraint === constraint, `${label}: ${error.code} ${error.constraint}`);
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT probe");
    }
  };

  try {
    await client.query("BEGIN");
    const shiftB = (
      await client.query(
        "INSERT INTO shifts (company_id, name, start_time, end_time) VALUES ($1, 'E2E Probe Shift', '09:00', '17:00') RETURNING id",
        [b]
      )
    ).rows[0].id;
    const structureA = (
      await client.query("INSERT INTO salary_structures (company_id, name) VALUES ($1, 'E2E Probe Structure') RETURNING id", [a])
    ).rows[0].id;
    const componentB = (
      await client.query("INSERT INTO salary_components (company_id, name) VALUES ($1, 'E2E Probe Component') RETURNING id", [b])
    ).rows[0].id;

    await t.check("same-company references are accepted (control)", async () => {
      await client.query("SAVEPOINT control");
      await client.query(
        "INSERT INTO attendance_regularizations (company_id, employee_id, attendance_date) VALUES ($1, $2, '2099-12-01')",
        [a, state.employeeId]
      );
      await client.query("ROLLBACK TO SAVEPOINT control");
    });
    await t.check("a request cannot be filed in company B for an employee of company A", async () => {
      await refused(
        "regularization",
        "attendance_regularizations_employee_company_fkey",
        "INSERT INTO attendance_regularizations (company_id, employee_id, attendance_date) VALUES ($1, $2, '2099-12-01')",
        [b, state.employeeId]
      );
      await refused(
        "advance",
        "employee_advances_employee_company_fkey",
        "INSERT INTO employee_advances (company_id, employee_id, amount, balance) VALUES ($1, $2, 100, 100)",
        [b, state.employeeId]
      );
    });
    await t.check("a roster cannot use another company's shift", async () => {
      await refused(
        "roster",
        "rosters_shift_company_fkey",
        "INSERT INTO rosters (company_id, employee_id, shift_id, effective_from) VALUES ($1, $2, $3, '2099-12-01')",
        [a, state.employeeId, shiftB]
      );
    });
    await t.check("a salary structure cannot include another company's component", async () => {
      await refused(
        "structure component",
        "salary_structure_components_component_company_fkey",
        "INSERT INTO salary_structure_components (company_id, structure_id, component_id, amount) VALUES ($1, $2, $3, 100)",
        [a, structureA, componentB]
      );
    });
    await t.check("an employee record can only be linked to a member of its company", async () => {
      await refused(
        "employee login",
        "employees_membership_fkey",
        "UPDATE employees SET user_id = $1 WHERE id = $2",
        [fixtures.users.adminB.userId, state.employee2Id]
      );
      await refused(
        "delegate",
        "approval_delegates_membership_fkey",
        "INSERT INTO approval_delegates (company_id, user_id, granted_by) VALUES ($1, $2, $3)",
        [a, fixtures.users.adminB.userId, fixtures.users.adminA.userId]
      );
    });
    await t.check("an invitation cannot carry another company's employee record", async () => {
      await refused(
        "invitation",
        "company_invitations_employee_fkey",
        `INSERT INTO company_invitations (company_id, email, role, employee_id, token_hash, invited_by, expires_at)
         VALUES ($1, 'e2e.probe@elva-test.invalid', 'employee', $2, repeat('0', 64), $3, NOW() + INTERVAL '1 hour')`,
        [b, state.employeeId, fixtures.users.adminB.userId]
      );
    });
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
}
