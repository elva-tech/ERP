
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

vi.mock("./modules/useConfirm", () => ({
  useConfirm: () => ({
    confirm: vi.fn(),
    dialog: null,
  }),
}));

import { AttendanceDashboard } from "./modules/attendance";

describe("Attendance Dashboard screen", () => {
  it("renders the heading and attendance controls while data loads", () => {
    render(
      <AttendanceDashboard
        companyId="test-company"
        role="employee"
        employees={[]}
        departments={[]}
        onNavigate={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Attendance Dashboard" }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Attendance date")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Daily attendance" }),
    ).toBeInTheDocument();
  });
});
