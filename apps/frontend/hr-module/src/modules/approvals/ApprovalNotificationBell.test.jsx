
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ApprovalNotificationBell from "./ApprovalNotificationBell";
import { withQuery } from "../../api";
import { useApi } from "../helpers";

vi.mock("../../api", () => ({
  withQuery: vi.fn((path, params) => {
    const query = new URLSearchParams(params).toString();
    return query ? `${path}?${query}` : path;
  }),
}));

vi.mock("../helpers", () => ({
  formatDate: (value) => value || "—",
  formatMoney: (value) => String(value),
  useApi: vi.fn(),
}));

describe("ApprovalNotificationBell", () => {
  let reload;
  let onOpenApprovals;

  beforeEach(() => {
    vi.clearAllMocks();

    reload = vi.fn();
    onOpenApprovals = vi.fn();

    useApi.mockReturnValue({
      data: null,
      error: "",
      loading: false,
      reload,
    });
  });

  it("requests pending approvals for the active company", () => {
    render(
      <ApprovalNotificationBell
        companyId="company-1"
        onOpenApprovals={onOpenApprovals}
      />,
    );

    expect(withQuery).toHaveBeenCalledWith(
      "/api/approvals/pending",
      { companyId: "company-1" },
    );

    expect(useApi).toHaveBeenCalledWith(
      "/api/approvals/pending?companyId=company-1",
    );
  });

  it("reloads approvals and displays the loading state when opened", () => {
    useApi.mockReturnValue({
      data: null,
      error: "",
      loading: true,
      reload,
    });

    render(
      <ApprovalNotificationBell
        companyId="company-1"
        onOpenApprovals={onOpenApprovals}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Approvals: none pending",
      }),
    );

    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Loading…")).toBeTruthy();
    expect(
      screen.getByRole("dialog", { name: "Pending approvals" }),
    ).toBeTruthy();
  });

  it("displays an API error inside the open notification", () => {
    useApi.mockReturnValue({
      data: null,
      error: "Unable to load approvals.",
      loading: false,
      reload,
    });

    render(
      <ApprovalNotificationBell
        companyId="company-1"
        onOpenApprovals={onOpenApprovals}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Approvals: none pending",
      }),
    );

    expect(
      screen.getByRole("alert").textContent,
    ).toBe("Unable to load approvals.");
  });

  it("shows the empty state when no approvals are pending", () => {
    useApi.mockReturnValue({
      data: {
        leaveRequests: [],
        regularizations: [],
        advances: [],
      },
      error: "",
      loading: false,
      reload,
    });

    render(
      <ApprovalNotificationBell
        companyId="company-1"
        onOpenApprovals={onOpenApprovals}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Approvals: none pending",
      }),
    );

    expect(
      screen.getByText("Nothing is waiting for your review."),
    ).toBeTruthy();
  });

  it("shows pending request details and opens My Approvals", () => {
    useApi.mockReturnValue({
      data: {
        leaveRequests: [
          {
            id: 1,
            employee_name: "Example Employee",
            leave_type_name: "Annual Leave",
            from_date: "2026-11-01",
            to_date: "2026-11-02",
            days: 2,
          },
        ],
        regularizations: [
          {
            id: 2,
            employee_name: "Example Employee",
            attendance_date: "2026-11-03",
          },
        ],
        advances: [
          {
            id: 3,
            employee_name: "Example Employee",
            amount: 500,
            purpose: "Travel",
          },
        ],
      },
      error: "",
      loading: false,
      reload,
    });

    render(
      <ApprovalNotificationBell
        companyId="company-1"
        onOpenApprovals={onOpenApprovals}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Approvals: 3 pending",
      }),
    );

    expect(
      screen.getByText("Example Employee · Annual Leave"),
    ).toBeTruthy();

    expect(
      screen.getByText(
        "Leave 2026-11-01 – 2026-11-02 (2 days)",
      ),
    ).toBeTruthy();

    expect(
      screen.getByText("Example Employee · Regularization"),
    ).toBeTruthy();

    expect(
      screen.getByText("Example Employee · Advance"),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Open My Approvals" }),
    );

    expect(onOpenApprovals).toHaveBeenCalledTimes(1);
  });
});
