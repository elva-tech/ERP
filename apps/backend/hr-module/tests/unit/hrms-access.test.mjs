import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveMembershipPermissions,
  ROUTE_VIEW_PERMISSION,
  buildMembershipAccessContext,
} from "../../lib/hrms-permission-catalog.js";

test("managers receive broader navigation permissions than employees", () => {
  const manager = resolveMembershipPermissions({
    role: "hr_manager",
    employeeId: "10",
    isApprovalDelegate: false,
  });
  const employee = resolveMembershipPermissions({
    role: "employee",
    employeeId: "11",
    isApprovalDelegate: false,
  });

  assert.ok(manager.includes("hr.organization.departments.view"));
  assert.ok(!employee.includes("hr.organization.departments.view"));
  assert.ok(employee.includes("hr.leave.requests.create"));
});

test("HR role division v1.0: HR admin vs HR vs employee menus", () => {
  const admin = resolveMembershipPermissions({
    role: "company_admin",
    employeeId: "1",
    isApprovalDelegate: false,
  });
  const hr = resolveMembershipPermissions({
    role: "hr_manager",
    employeeId: "2",
    isApprovalDelegate: false,
  });
  const employee = resolveMembershipPermissions({
    role: "employee",
    employeeId: "3",
    isApprovalDelegate: false,
  });

  assert.ok(admin.includes("hr.attendance.devices.view"));
  assert.ok(admin.includes("hr.payroll.processing.view"));
  assert.ok(!hr.includes("hr.attendance.devices.view"));
  assert.ok(!hr.includes("hr.attendance.punches.view"));
  assert.ok(!hr.includes("hr.attendance.shifts.view"));
  assert.ok(!hr.includes("hr.attendance.roster.view"));
  assert.ok(!hr.includes("hr.leave.types.view"));
  assert.ok(!hr.includes("hr.payroll.salary_structure.view"));
  assert.ok(!hr.includes("hr.payroll.processing.view"));
  assert.ok(!hr.includes("hr.statutory.pf.view"));
  assert.ok(!hr.includes("hr.settings.users.view"));
  assert.ok(hr.includes("hr.employees.directory.edit"));
  assert.ok(hr.includes("hr.payroll.payslips.view"));

  assert.ok(!employee.includes("hr.employees.directory.view"));
  assert.ok(!employee.includes("hr.payroll.advances.view"));
  assert.ok(employee.includes("hr.profile.self.view"));
});

test("approval delegates receive inbox permissions without a manager role", () => {
  const delegate = resolveMembershipPermissions({
    role: "employee",
    employeeId: "11",
    isApprovalDelegate: true,
  });

  assert.ok(delegate.includes("hr.approvals.my.view"));
  assert.ok(delegate.includes("hr.approvals.my.approve"));
});

test("self profile requires a linked employee record", () => {
  const codes = resolveMembershipPermissions({
    role: "employee",
    employeeId: null,
    isApprovalDelegate: false,
  });

  assert.ok(!codes.includes("hr.profile.self.view"));
});

test("buildMembershipAccessContext returns IAM-ready payload", () => {
  const access = buildMembershipAccessContext({
    companyId: "1",
    companyName: "Acme",
    role: "company_admin",
    employeeId: "5",
    isApprovalDelegate: false,
  });

  assert.equal(access.application, "hrms");
  assert.equal(access.companyId, "1");
  assert.deepEqual(access.roles, ["company_admin"]);
  assert.ok(access.permissionCodes.length > 20);
  assert.ok(access.actions["hr.leave.requests"].includes("view"));
});

test("route view permission map covers HR navigation route ids", () => {
  const routeIds = [
    "dashboard",
    "my-profile",
    "my-approvals",
    "departments",
    "employee-directory",
    "designations",
    "employee-profile",
    "attendance-dashboard",
    "daily-attendance",
    "monthly-attendance",
    "biometric-devices",
    "attendance-exceptions",
    "employee-attendance",
    "raw-punches",
    "attendance-regularization",
    "shift-management",
    "roster-management",
    "overtime",
    "leave-dashboard",
    "leave-types",
    "leave-requests",
    "leave-approvals",
    "leave-balance",
    "holiday-calendar",
    "leave-carry-forward",
    "salary-structure",
    "payroll-processing",
    "payslips",
    "employee-advances",
    "payroll-policy",
    "pf",
    "esic",
    "statutory-reports",
    "users-access",
    "approval-delegation",
  ];

  for (const routeId of routeIds) {
    assert.ok(ROUTE_VIEW_PERMISSION[routeId], routeId);
  }
});