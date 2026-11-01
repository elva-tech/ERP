import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPayrollRunIdempotencyKey,
  createPayrollRun,
  getPayrollRunIdempotencyKey,
} from "./payroll";

function response(ok, status, data) {
  return {
    ok,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

describe("payroll API service", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a payroll run with the existing endpoint and payload", async () => {
    const payload = { companyId: "company-1", year: 2026, month: 10 };
    fetch.mockResolvedValue(response(true, 201, { run: { id: "run-1" } }));

    await expect(createPayrollRun("company-1", 2026, 10, "retry-key-1")).resolves.toEqual({
      run: { id: "run-1" },
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/payroll/runs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        headers: expect.any(Headers),
      }),
    );
    expect(fetch.mock.calls[0][1].headers.get("Idempotency-Key")).toBe("retry-key-1");
  });

  it("propagates payroll run creation errors without inventing headers", async () => {
    fetch.mockResolvedValue(response(false, 409, { message: "Run exists" }));

    await expect(createPayrollRun("company-1", 2026, 10)).rejects.toMatchObject({
      status: 409,
      message: "Run exists",
    });
    expect(fetch.mock.calls[0][1].headers.get("Idempotency-Key")).toBeNull();
  });

  it("reuses an operation key until success clears it", () => {
    const values = new Map();
    const storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
    const createKey = vi.fn(() => "operation-key-1");

    const first = getPayrollRunIdempotencyKey("company-1", 2026, 10, storage, createKey);
    const retry = getPayrollRunIdempotencyKey("company-1", 2026, 10, storage, createKey);
    expect(retry).toBe(first);
    expect(createKey).toHaveBeenCalledTimes(1);

    clearPayrollRunIdempotencyKey("company-1", 2026, 10, storage);
    const nextOperation = getPayrollRunIdempotencyKey(
      "company-1",
      2026,
      10,
      storage,
      () => "operation-key-2",
    );
    expect(nextOperation).not.toBe(first);
  });
});