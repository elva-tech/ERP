import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitLeaveRequest } from "./leave";

function response(ok, status, data) {
  return {
    ok,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

describe("leave API service", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("submits leave with the existing endpoint and payload", async () => {
    const payload = {
      companyId: "company-1",
      leaveTypeId: "type-1",
      fromDate: "2026-10-12",
      toDate: "2026-10-13",
      reason: "Personal leave",
    };
    fetch.mockResolvedValue(response(true, 201, { request: { id: "leave-1" } }));

    await expect(submitLeaveRequest(payload)).resolves.toEqual({
      request: { id: "leave-1" },
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/leave/requests",
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }),
    );
  });

  it("propagates leave submission errors", async () => {
    fetch.mockResolvedValue(response(false, 422, { message: "Invalid dates" }));

    await expect(submitLeaveRequest({ companyId: "company-1" })).rejects.toMatchObject({
      status: 422,
      message: "Invalid dates",
    });
  });
});