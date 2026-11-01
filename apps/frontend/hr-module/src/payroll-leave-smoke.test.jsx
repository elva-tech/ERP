import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PayrollProcessing } from "./modules/payroll/PayrollProcessing";
import { LeaveBalance } from "./modules/leave";

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(data),
  };
}

describe("Payroll and Leave API smoke tests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads payroll runs for the selected company using the session cookie", async () => {
    fetch.mockResolvedValue(jsonResponse({ runs: [] }));

    render(
      <PayrollProcessing
        companyId="company-smoke"
        role="company_admin"
        departments={[]}
      />,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toMatch(
        /\/api\/payroll\/runs\?companyId=company-smoke$/,
      );
      expect(fetch.mock.calls[0][1]).toEqual(
        expect.objectContaining({ credentials: "include" }),
      );
    });

    expect(
      screen.getByRole("heading", { name: "Payroll Processing" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("No payroll runs yet.")).toBeInTheDocument();
  });

  it("loads leave balances for the selected company and year", async () => {
    const year = new Date().getFullYear();
    fetch.mockResolvedValue(jsonResponse({ balances: [] }));

    render(<LeaveBalance companyId="company-smoke" role="employee" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toMatch(
        new RegExp(`/api/leave/balances\\?companyId=company-smoke&year=${year}$`),
      );
      expect(fetch.mock.calls[0][1]).toEqual(
        expect.objectContaining({ credentials: "include" }),
      );
    });

    expect(
      screen.getByRole("heading", { name: "Leave Balance" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("No balances. Add active employees and leave types first."),
    ).toBeInTheDocument();
  });

  it("reuses a payroll key after an uncertain failure and blocks duplicate submits", async () => {
    let rejectFirstPost;
    let createdRun = false;
    const postRequests = [];
    fetch.mockImplementation((url, options) => {
      if (options.method === "POST" && url.endsWith("/api/payroll/runs")) {
        postRequests.push(options);
        if (postRequests.length === 1) {
          return new Promise((resolve) => {
            rejectFirstPost = () => resolve(jsonResponse({ message: "Temporary server error" }, 503));
          });
        }
        createdRun = true;
        return Promise.resolve(jsonResponse({
          message: "Payroll run created.",
          run: { id: 77, status: "Draft", payslip_count: 0 },
        }, 201));
      }

      if (url.includes("/api/payroll/runs/77")) {
        return Promise.resolve(jsonResponse({ run: { id: 77 }, payslips: [] }));
      }
      return Promise.resolve(jsonResponse({
        runs: createdRun ? [{ id: 77, status: "Draft", payslip_count: 0 }] : [],
      }));
    });

    render(
      <PayrollProcessing
        companyId="company-smoke"
        role="company_admin"
        departments={[]}
      />,
    );

    const createButton = screen.getByRole("button", { name: "+ Create run" });
    fireEvent.click(createButton);
    await waitFor(() => expect(postRequests).toHaveLength(1));
    expect(createButton).toBeDisabled();
    fireEvent.click(createButton);
    expect(postRequests).toHaveLength(1);

    rejectFirstPost();
    expect(await screen.findByText("Temporary server error")).toBeInTheDocument();
    fireEvent.click(createButton);
    await waitFor(() => expect(postRequests).toHaveLength(2));
    expect(postRequests[1].headers.get("Idempotency-Key")).toBe(
      postRequests[0].headers.get("Idempotency-Key"),
    );
    expect(postRequests[1].headers.get("Idempotency-Key")).toBeTruthy();
    expect(await screen.findByText("Payroll run created.")).toBeInTheDocument();
  });
});
