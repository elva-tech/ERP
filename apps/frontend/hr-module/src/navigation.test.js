
import { describe, expect, it, vi } from "vitest";

vi.mock("./modules/helpers", () => ({
  canManage: (role) => ["company_admin", "hr_manager"].includes(role),
  isAdmin: (role) => role === "company_admin",
}));

import {
  canAccess,
  accessibleSectionsFor,
  visibleSectionsFor,
} from "./navigation";

describe("canAccess", () => {
  it("allows all members to access pages marked all", () => {
    expect(
      canAccess("all", {
        role: "employee",
        ownEmployeeId: null,
        isApprovalDelegate: false,
      }),
    ).toBe(true);
  });

  it("allows HR managers to access manager pages", () => {
    expect(
      canAccess("manager", {
        role: "hr_manager",
        ownEmployeeId: null,
        isApprovalDelegate: false,
      }),
    ).toBe(true);
  });

  it("denies employees access to manager pages", () => {
    expect(
      canAccess("manager", {
        role: "employee",
        ownEmployeeId: null,
        isApprovalDelegate: false,
      }),
    ).toBe(false);
  });

  it("restricts admin pages to company admins", () => {
    expect(
      canAccess("admin", {
        role: "company_admin",
        ownEmployeeId: null,
        isApprovalDelegate: false,
      }),
    ).toBe(true);

    expect(
      canAccess("admin", {
        role: "hr_manager",
        ownEmployeeId: null,
        isApprovalDelegate: false,
      }),
    ).toBe(false);
  });

  it("allows self pages only when an employee is linked", () => {
    expect(
      canAccess("self", {
        role: "employee",
        ownEmployeeId: 42,
        isApprovalDelegate: false,
      }),
    ).toBe(true);

    expect(
      canAccess("self", {
        role: "employee",
        ownEmployeeId: null,
        isApprovalDelegate: false,
      }),
    ).toBe(false);
  });

  it("allows approval delegates to access approver pages", () => {
    expect(
      canAccess("approver", {
        role: "employee",
        ownEmployeeId: null,
        isApprovalDelegate: true,
      }),
    ).toBe(true);
  });

  it("denies unknown access levels", () => {
    expect(
      canAccess("unknown", {
        role: "company_admin",
        ownEmployeeId: 42,
        isApprovalDelegate: true,
      }),
    ).toBe(false);
  });
});

describe("navigation sections", () => {
  const context = {
    role: "employee",
    ownEmployeeId: 42,
    isApprovalDelegate: false,
  };

  it("includes accessible hidden pages in accessible sections", () => {
    const labels = accessibleSectionsFor(context).flatMap((section) =>
      section.items.map((item) => item.label),
    );

    expect(labels).toContain("My Profile");
  });

  it("excludes hidden pages from visible sections", () => {
    const labels = visibleSectionsFor(context).flatMap((section) =>
      section.items.map((item) => item.label),
    );

    expect(labels).not.toContain("My Profile");
    expect(labels).not.toContain("Employee Profile");
  });
});
