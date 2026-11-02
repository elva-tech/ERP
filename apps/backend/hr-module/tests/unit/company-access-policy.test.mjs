import test from "node:test";
import assert from "node:assert/strict";
import { authorizeCompanyAccess } from "../../lib/company-access-policy.js";

const user = { id: "10" };
const activeMember = {
  user_id: 10n,
  company_id: 20n,
  role: "company_admin",
  status: "active",
};

test("rejects requests without an authenticated user", () => {
  const result = authorizeCompanyAccess({
    user: null,
    membership: activeMember,
    companyId: "20",
  });

  assert.equal(result.error.status, 401);
});

test("rejects a membership for another tenant", () => {
  const result = authorizeCompanyAccess({
    user,
    membership: { ...activeMember, company_id: 21n },
    companyId: "20",
  });

  assert.equal(result.error.status, 403);
});

test("rejects a membership belonging to another user", () => {
  const result = authorizeCompanyAccess({
    user,
    membership: { ...activeMember, user_id: 11n },
    companyId: "20",
  });

  assert.equal(result.error.status, 403);
});

test("rejects inactive memberships", () => {
  const result = authorizeCompanyAccess({
    user,
    membership: { ...activeMember, status: "suspended" },
    companyId: "20",
  });

  assert.equal(result.error.status, 403);
});

test("allows employee reads but denies manager-only employee writes", () => {
  const employeeMembership = { ...activeMember, role: "employee" };
  const read = authorizeCompanyAccess({
    user,
    membership: employeeMembership,
    companyId: "20",
  });
  const write = authorizeCompanyAccess({
    user,
    membership: employeeMembership,
    companyId: "20",
    roles: ["company_admin", "hr_manager"],
  });

  assert.equal(read.error, undefined);
  assert.equal(write.error.status, 403);
});

test("denies manager access to administrator-only payroll actions", () => {
  const managerMembership = { ...activeMember, role: "hr_manager" };
  const result = authorizeCompanyAccess({
    user,
    membership: managerMembership,
    companyId: "20",
    roles: ["company_admin"],
  });

  assert.equal(result.error.status, 403);
});

test("allows an authorized manager for manager-scoped payroll operations", () => {
  const managerMembership = { ...activeMember, role: "hr_manager" };
  const result = authorizeCompanyAccess({
    user,
    membership: managerMembership,
    companyId: "20",
    roles: ["company_admin", "hr_manager"],
  });

  assert.equal(result.companyId, "20");
  assert.equal(result.membership.role, "hr_manager");
});