
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
    canManage: vi.fn(() => false),
  };
});

vi.mock("./modules/useConfirm", () => ({
  useConfirm: () => ({
    confirm: vi.fn(),
    dialog: null,
  }),
}));

import { LeaveBalance } from "./modules/leave";

describe("Leave Balance screen", () => {
  it("renders the heading and loading state", () => {
    render(<LeaveBalance companyId="test-company" role="employee" />);

    expect(
      screen.getByRole("heading", { name: "Leave Balance" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Entitlement, usage and availability/i),
    ).toBeInTheDocument();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
