import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmployee, updateEmployee } from "./employees";

function response(ok, status, data) {
  return {
    ok,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

describe("employee API service", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates an employee with the existing URL, method, and payload", async () => {
    const payload = { companyId: "company-1", name: "Example" };
    fetch.mockResolvedValue(response(true, 201, { employee: { id: "emp-1" } }));

    await expect(createEmployee(payload)).resolves.toEqual({
      employee: { id: "emp-1" },
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/employees",
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }),
    );
  });

  it("propagates employee API errors and preserves company query parameters", async () => {
    fetch.mockResolvedValue(response(false, 403, { message: "Forbidden" }));

    await expect(
      updateEmployee("emp/1", "company 1", { status: "Inactive" }),
    ).rejects.toMatchObject({ status: 403, message: "Forbidden" });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/employees/emp%2F1?companyId=company+1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "Inactive" }),
      }),
    );
  });
});