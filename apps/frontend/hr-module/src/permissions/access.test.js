import { describe, expect, it } from "vitest";
import {
  canMutateWorkspace,
  canPerformAction,
  canViewRoute,
  hasPermission,
} from "./access";
import { visibleSectionsFor } from "../navigation";

function managerPermissions() {
  return [
    "hr.main.dashboard.view",
    "hr.employees.directory.view",
    "hr.employees.directory.create",
    "hr.organization.departments.view",
    "hr.organization.departments.manage",
    "hr.organization.designations.view",
    "hr.attendance.dashboard.view",
    "hr.leave.approvals.view",
    "hr.payroll.processing.view",
    "hr.settings.users.view",
  ];
}

function employeePermissions() {
  return [
    "hr.main.dashboard.view",
    "hr.profile.self.view",
    "hr.employees.directory.view",
    "hr.leave.requests.view",
    "hr.leave.requests.create",
    "hr.payroll.payslips.view",
  ];
}

describe("access utilities", () => {
  it("checks individual permission codes", () => {
    expect(hasPermission(employeePermissions(), "hr.leave.requests.create")).toBe(
      true,
    );
    expect(hasPermission(employeePermissions(), "hr.leave.types.manage")).toBe(
      false,
    );
  });

  it("maps routes to view permissions", () => {
    expect(canViewRoute(managerPermissions(), "departments")).toBe(true);
    expect(canViewRoute(employeePermissions(), "departments")).toBe(false);
  });

  it("separates view-only users from mutating actions", () => {
    expect(canMutateWorkspace(employeePermissions())).toBe(false);
    expect(canPerformAction(managerPermissions(), "hr.employees.directory.create")).toBe(
      true,
    );
    expect(canPerformAction(employeePermissions(), "hr.employees.directory.create")).toBe(
      false,
    );
  });
});

describe("permission-driven navigation", () => {
  it("shows different menus for manager vs employee permission sets", () => {
    const managerLabels = visibleSectionsFor({
      permissionCodes: managerPermissions(),
      role: "hr_manager",
      ownEmployeeId: "1",
      isApprovalDelegate: false,
    }).flatMap((section) => section.items.map((item) => item.label));

    const employeeLabels = visibleSectionsFor({
      permissionCodes: employeePermissions(),
      role: "employee",
      ownEmployeeId: "2",
      isApprovalDelegate: false,
    }).flatMap((section) => section.items.map((item) => item.label));

    expect(managerLabels).toContain("Departments");
    expect(managerLabels).toContain("Payroll Processing");
    expect(employeeLabels).not.toContain("Departments");
    expect(employeeLabels).not.toContain("Payroll Processing");
    expect(employeeLabels).toContain("Leave Requests");
  });
});