import { describe, expect, it } from "vitest";
import { createRouteHash, parseRouteHash } from "./routeLocation";

describe("route hash locations", () => {
  it("defaults an empty hash to the dashboard", () => {
    expect(parseRouteHash("")).toEqual({
      routeId: "dashboard",
      employeeId: null,
    });
  });

  it("parses a route ID independently of its display label", () => {
    expect(parseRouteHash("#/payroll-processing")).toEqual({
      routeId: "payroll-processing",
      employeeId: null,
    });
  });

  it("round-trips an employee profile ID safely", () => {
    const hash = createRouteHash("employee-profile", {
      employeeId: "employee/42",
    });

    expect(hash).toBe("#/employee-profile/employee%2F42");
    expect(parseRouteHash(hash)).toEqual({
      routeId: "employee-profile",
      employeeId: "employee/42",
    });
  });

  it("ignores malformed profile IDs and unrelated path segments", () => {
    expect(parseRouteHash("#/dashboard/ignored")).toEqual({
      routeId: "dashboard",
      employeeId: null,
    });
    expect(parseRouteHash("#/employee-profile/%E0%A4%A")).toEqual({
      routeId: "employee-profile",
      employeeId: null,
    });
  });
});
