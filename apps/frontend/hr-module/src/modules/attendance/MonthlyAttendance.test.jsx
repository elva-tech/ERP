
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlyAttendance } from "./MonthlyAttendance";

const mockUseApi = vi.fn();

vi.mock("../helpers", () => ({
  canManage: (role) => role === "admin" || role === "hr",
  compactInputClass: "month-input",
  currentMonth: () => "2026-10",
  monthBounds: (month) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const days = new Date(year, monthNumber, 0).getDate();

    return {
      from: `${month}-01`,
      to: `${month}-${String(days).padStart(2, "0")}`,
      days,
    };
  },
  useApi: (...args) => mockUseApi(...args),
}));

vi.mock("../../api", () => ({
  withQuery: (path, params) => ({ path, params }),
}));

vi.mock("../ui", () => ({
  Notice: ({ notice }) => <div>{notice.message}</div>,
  PageHeader: ({ title, subtitle, children }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </header>
  ),
  Panel: ({ title, children }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("./constants", () => ({
  STATUS_CODES: {
    Present: "P",
    Absent: "A",
    Late: "L",
    "Missing Punch": "MP",
  },
}));

describe("MonthlyAttendance", () => {
  beforeEach(() => {
    mockUseApi.mockReset();
  });

  it("renders the monthly attendance heading and selected month", () => {
    mockUseApi.mockReturnValue({
      data: { records: [], count: 0 },
      loading: false,
    });

    render(
      <MonthlyAttendance
        companyId="company-1"
        role="admin"
        employees={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Monthly Attendance" }),
    ).toBeTruthy();

    expect(screen.getByDisplayValue("2026-10")).toBeTruthy();
    expect(
      screen.getByText("2026-10 attendance register"),
    ).toBeTruthy();
  });

  it("shows the loading state", () => {
    mockUseApi.mockReturnValue({
      data: null,
      loading: true,
    });

    render(
      <MonthlyAttendance
        companyId="company-1"
        role="admin"
        employees={[]}
      />,
    );

    expect(screen.getByText(/Loading/)).toBeTruthy();
  });

  it("shows the empty state when there are no employees or records", () => {
    mockUseApi.mockReturnValue({
      data: { records: [], count: 0 },
      loading: false,
    });

    render(
      <MonthlyAttendance
        companyId="company-1"
        role="admin"
        employees={[]}
      />,
    );

    expect(
      screen.getByText("No attendance records for this month."),
    ).toBeTruthy();
  });

  it("displays attendance codes and employee totals", () => {
    mockUseApi.mockReturnValue({
      data: {
        count: 3,
        records: [
          {
            employee_id: "emp-1",
            employee_name: "Test Employee",
            employee_code: "EMP001",
            attendance_date: "2026-10-01",
            status: "Present",
          },
          {
            employee_id: "emp-1",
            employee_name: "Test Employee",
            employee_code: "EMP001",
            attendance_date: "2026-10-02",
            status: "Late",
          },
          {
            employee_id: "emp-1",
            employee_name: "Test Employee",
            employee_code: "EMP001",
            attendance_date: "2026-10-03",
            status: "Absent",
          },
        ],
      },
      loading: false,
    });

    render(
      <MonthlyAttendance
        companyId="company-1"
        role="admin"
        employees={[
          {
            id: "emp-1",
            name: "Test Employee",
            status: "Active",
          },
        ]}
      />,
    );

    expect(screen.getByText("Test Employee")).toBeTruthy();
    expect(screen.getByTitle("Present").textContent).toBe("P");
    expect(screen.getByTitle("Late").textContent).toBe("L");
    expect(screen.getByTitle("Absent").textContent).toBe("A");

    const employeeRow = screen.getByText("Test Employee").closest("tr");
    expect(employeeRow.cells[employeeRow.cells.length - 3].textContent).toBe("2");
    expect(employeeRow.cells[employeeRow.cells.length - 2].textContent).toBe("1");
    expect(employeeRow.cells[employeeRow.cells.length - 1].textContent).toBe("1");
  });
});
