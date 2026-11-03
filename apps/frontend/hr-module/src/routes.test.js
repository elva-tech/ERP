import { describe, expect, it } from "vitest";
import { findRoute } from "./routes";

describe("route registry", () => {
  it("resolves screens by their stable route IDs", () => {
    expect(findRoute("payroll-processing")).toMatchObject({
      id: "payroll-processing",
      label: "Payroll Processing",
    });
  });

  it("does not treat display labels as route keys", () => {
    expect(findRoute("Payroll Processing")).toBeUndefined();
    expect(findRoute("Leave Requests")).toBeUndefined();
  });
});
