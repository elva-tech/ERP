import test from "node:test";
import assert from "node:assert/strict";
import {
  canGrantRole,
  changeMembership,
  createInvitationToken,
  hashInvitationToken,
  invitationState,
} from "../../lib/access.js";

/** Answers the queries changeMembership makes, and records every statement. */
function fakeClient({ actorRole, target, activeAdmins = 1, linkedEmployeeStatus = null }) {
  const statements = [];
  return {
    statements,
    async query(sql) {
      statements.push(sql);
      if (sql.includes("SELECT cm.role")) return { rows: actorRole ? [{ role: actorRole }] : [] };
      if (sql.includes("FOR UPDATE")) return { rows: target ? [target] : [] };
      if (sql.includes("COUNT(*)")) return { rows: [{ n: activeAdmins }] };
      if (sql.includes("FROM employees")) return { rows: linkedEmployeeStatus ? [{ status: linkedEmployeeStatus }] : [] };
      return { rows: [], rowCount: 1 };
    },
  };
}

const wrote = (client) => client.statements.some((sql) => /UPDATE company_memberships|INSERT INTO membership_events/.test(sql));
const change = (client, overrides) =>
  changeMembership(client, { companyId: "1", actorUserId: "10", targetUserId: "20", ...overrides });

test("only company admins may grant admin or HR roles", () => {
  assert.equal(canGrantRole("company_admin", "company_admin"), true);
  assert.equal(canGrantRole("company_admin", "hr_manager"), true);
  assert.equal(canGrantRole("hr_manager", "employee"), true);
  assert.equal(canGrantRole("hr_manager", "hr_manager"), false);
  assert.equal(canGrantRole("hr_manager", "company_admin"), false);
  assert.equal(canGrantRole("employee", "employee"), false);
  assert.equal(canGrantRole(null, "employee"), false);
});

test("invitation tokens are 256-bit, hashed, and malformed tokens are rejected", () => {
  const token = createInvitationToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(createInvitationToken(), token);
  assert.match(hashInvitationToken(token), /^[0-9a-f]{64}$/);
  for (const bad of [undefined, "", "short", `${token}x`, token.replace(/.$/, "!"), 42]) {
    assert.equal(hashInvitationToken(bad), null);
  }
});

test("invitation state: accepted and revoked win over expiry", () => {
  const past = new Date(Date.now() - 1000).toISOString();
  const future = new Date(Date.now() + 60_000).toISOString();
  assert.equal(invitationState({ expires_at: future }), "pending");
  assert.equal(invitationState({ expires_at: past }), "expired");
  assert.equal(invitationState({ expires_at: past, accepted_at: past }), "accepted");
  assert.equal(invitationState({ expires_at: future, revoked_at: past }), "revoked");
});

test("nobody can change their own access", async () => {
  const client = fakeClient({ actorRole: "company_admin", target: { role: "company_admin", status: "active" } });
  const result = await change(client, { targetUserId: "10", status: "suspended" });
  assert.deepEqual(result.error?.[0], 403);
  assert.equal(wrote(client), false);
});

test("the last active company admin cannot be demoted or suspended", async () => {
  for (const update of [{ role: "employee" }, { role: "hr_manager" }, { status: "suspended" }]) {
    const client = fakeClient({
      actorRole: "company_admin",
      target: { role: "company_admin", status: "active" },
      activeAdmins: 1,
    });
    const result = await change(client, update);
    assert.equal(result.error?.[0], 409, JSON.stringify(update));
    assert.equal(wrote(client), false);
  }
});

test("an admin can be demoted while another active admin remains, and it is audited", async () => {
  const client = fakeClient({
    actorRole: "company_admin",
    target: { role: "company_admin", status: "active" },
    activeAdmins: 2,
  });
  const result = await change(client, { role: "employee" });
  assert.deepEqual(result.membership, { role: "employee", status: "active", changed: true });
  assert.ok(client.statements.some((sql) => sql.includes("UPDATE company_memberships")));
  assert.ok(client.statements.some((sql) => sql.includes("INSERT INTO membership_events")));
});

test("HR managers may only suspend or reactivate employee-role members", async () => {
  const employee = { role: "employee", status: "active" };
  let client = fakeClient({ actorRole: "hr_manager", target: employee });
  assert.equal((await change(client, { status: "suspended" })).membership?.status, "suspended");

  client = fakeClient({ actorRole: "hr_manager", target: employee });
  assert.equal((await change(client, { role: "hr_manager" })).error?.[0], 403);

  client = fakeClient({ actorRole: "hr_manager", target: { role: "hr_manager", status: "active" } });
  assert.equal((await change(client, { status: "suspended" })).error?.[0], 403);

  client = fakeClient({ actorRole: "hr_manager", target: { role: "company_admin", status: "suspended" } });
  assert.equal((await change(client, { status: "active" })).error?.[0], 403);
  assert.equal(wrote(client), false);

  // Even a no-op request on an admin is refused rather than reported as success.
  client = fakeClient({ actorRole: "hr_manager", target: { role: "company_admin", status: "active" } });
  assert.equal((await change(client, { status: "active" })).error?.[0], 403);
});

test("actors without an active manager membership are refused", async () => {
  for (const actorRole of [null, "employee"]) {
    const client = fakeClient({ actorRole, target: { role: "employee", status: "active" } });
    assert.equal((await change(client, { status: "suspended" })).error?.[0], 403);
    assert.equal(wrote(client), false);
  }
});

test("pending or rejected memberships are not managed here", async () => {
  const client = fakeClient({ actorRole: "company_admin", target: { role: "employee", status: "pending" } });
  assert.equal((await change(client, { status: "active" })).error?.[0], 409);
});

test("access cannot be restored while the linked employee record is inactive", async () => {
  const suspended = { role: "employee", status: "suspended" };
  let client = fakeClient({ actorRole: "company_admin", target: suspended, linkedEmployeeStatus: "Inactive" });
  assert.equal((await change(client, { status: "active" })).error?.[0], 409);
  assert.equal(wrote(client), false);

  client = fakeClient({ actorRole: "company_admin", target: suspended, linkedEmployeeStatus: "Active" });
  assert.equal((await change(client, { status: "active" })).membership?.status, "active");

  client = fakeClient({ actorRole: "hr_manager", target: suspended });
  assert.equal((await change(client, { status: "active" })).membership?.status, "active");
});

test("unchanged values write nothing", async () => {
  const client = fakeClient({ actorRole: "company_admin", target: { role: "employee", status: "active" } });
  const result = await change(client, { status: "active" });
  assert.equal(result.membership.changed, false);
  assert.equal(wrote(client), false);
});
