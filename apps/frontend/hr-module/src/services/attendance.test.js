import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAttendanceRecords } from "./attendance";

function response(ok, status, data) {
  return {
    ok,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

describe("attendance API service", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads attendance using the selected date range and filters", async () => {
    fetch.mockResolvedValue(response(true, 200, { records: [] }));

    await expect(getAttendanceRecords({
      companyId: "company-1",
      from: "2026-10-01",
      to: "2026-10-31",
      limit: 1000,
    })).resolves.toEqual({ records: [] });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/attendance/records?companyId=company-1&from=2026-10-01&to=2026-10-31&limit=1000",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetch.mock.calls[0][1].method).toBeUndefined();
  });

  it("propagates failed attendance requests", async () => {
    fetch.mockResolvedValue(response(false, 403, { message: "Forbidden" }));

    await expect(getAttendanceRecords({ companyId: "company-1" })).rejects.toMatchObject({
      status: 403,
      message: "Forbidden",
    });
  });
});