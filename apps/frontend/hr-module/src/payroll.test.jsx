
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("./modules/helpers", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useApi: vi.fn(() => ({
      data: null,
      loading: true,
      error: "",
      reload: vi.fn(),
    })),
    canManage: vi.fn((role) =>
      ["company_admin", "hr_manager"].includes(role),
    ),
  };
});

vi.mock("./permissions/AccessProvider", () => ({
  AccessProvider: ({ children }) => children,
  useAccess: () => ({
    permissionCodes: [
      "hr.payroll.salary_structure.view",
      "hr.payroll.salary_structure.manage",
    ],
    canPerform: () => true,
    hasPermission: () => true,
    canApproveInbox: () => false,
    canMutateWorkspace: () => true,
  }),
}));

vi.mock("./permissions/useModuleAccess", () => ({
  useModuleAccess: () => ({
    payroll: {
      manageStructure: true,
      manageProcessing: false,
      finalizeRun: false,
      cancelRun: false,
      managePolicy: false,
      createAdvance: false,
      exportPayslips: false,
      viewRuns: false,
    },
  }),
}));

vi.mock("./modules/useConfirm", () => ({
  useConfirm: () => ({
    confirm: vi.fn(),
    dialog: null,
  }),
}));

import { SalaryStructure } from "./modules/payroll/SalaryStructure";

describe("Salary Structure screen", () => {
  it("renders salary structure navigation and payroll guidance", () => {
    render(
      <SalaryStructure
        companyId="test-company"
        role="company_admin"
        employees={[]}
        departments={[]}
        designations={[]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Structures" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Components" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Employee Assignments" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Payroll is calculated only from the configured salary components/i),
    ).toBeInTheDocument();
  });
});
