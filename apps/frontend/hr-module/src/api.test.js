
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiRequest,
  apiBlob,
  sendJson,
  withQuery,
  UNAUTHORIZED_EVENT,
} from "./api";

function mockResponse(ok, status, data) {
  return {
    ok,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    text: vi.fn().mockResolvedValue(data === null ? "" : JSON.stringify(data)),
    json: vi.fn().mockResolvedValue(data),
  };
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("includes cookies in API requests", async () => {
    fetch.mockResolvedValue(
      mockResponse(true, 200, { success: true }),
    );

    await apiRequest("/api/employees");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/employees",
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });

  it("dispatches the unauthorized event for protected 401 responses", async () => {
    const handler = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, handler);

    try {
      fetch.mockResolvedValue(
        mockResponse(false, 401, {
          message: "Unauthorized",
        }),
      );

      await expect(
        apiRequest("/api/payroll"),
      ).rejects.toMatchObject({
        status: 401,
        message: "Unauthorized",
      });

      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, handler);
    }
  });

  it.each([
    "/api/auth/me",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/invitations/lookup",
    "/api/invitations/accept",
  ])(
    "does not dispatch the unauthorized event for %s",
    async (path) => {
      const handler = vi.fn();
      window.addEventListener(UNAUTHORIZED_EVENT, handler);

      try {
        fetch.mockResolvedValue(
          mockResponse(false, 401, {
            message: "Unauthorized",
          }),
        );

        await expect(
          apiRequest(path),
        ).rejects.toMatchObject({
          status: 401,
        });

        expect(handler).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener(UNAUTHORIZED_EVENT, handler);
      }
    },
  );

  it("returns a structured error for validation failures", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({
        "x-request-id": "req-test-1",
      }),
      json: vi.fn().mockResolvedValue({
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: {
          email: "Invalid email",
        },
      }),
    });

    await expect(
      apiRequest("/api/employees"),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      requestId: "req-test-1",
      fieldErrors: {
        email: "Invalid email",
      },
    });
  });

  it("uses the configured timeout", async () => {
    fetch.mockImplementation((_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          "abort",
          () => {
            reject(
              new DOMException("Aborted", "AbortError"),
            );
          },
          { once: true },
        );
      }),
    );

    await expect(
      apiRequest("/api/employees", {
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      code: "REQUEST_TIMEOUT",
      status: 0,
    });
  });

  it("keeps the timeout active while reading the response body", async () => {
    fetch.mockImplementation((_url, { signal }) => Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: () => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
    }));

    await expect(
      apiRequest("/api/employees", { timeoutMs: 10 }),
    ).rejects.toMatchObject({ code: "REQUEST_TIMEOUT", status: 0 });
  });

  it("distinguishes caller cancellation from timeout and network failure", async () => {
    const cancellation = new AbortController();
    fetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }));

    const request = apiRequest("/api/employees", { signal: cancellation.signal });
    cancellation.abort();

    await expect(request).rejects.toMatchObject({
      name: "ApiError",
      code: "REQUEST_ABORTED",
    });
  });

  it("returns parsed JSON and safely handles malformed JSON", async () => {
    fetch.mockResolvedValue(mockResponse(true, 200, { employees: [] }));
    await expect(apiRequest("/api/employees")).resolves.toEqual({ employees: [] });

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue("true"),
    });
    await expect(apiRequest("/api/health")).resolves.toBe(true);

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: vi.fn().mockResolvedValue("{invalid json"),
    });
    await expect(apiRequest("/api/employees")).resolves.toBeNull();
  });

  it("returns non-JSON text and handles empty and 204 responses", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
      text: vi.fn().mockResolvedValue("ready"),
    });
    await expect(apiRequest("/api/health")).resolves.toBe("ready");

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(""),
    });
    await expect(apiRequest("/api/empty")).resolves.toBeNull();

    const text = vi.fn();
    fetch.mockResolvedValue({ ok: true, status: 204, headers: new Headers(), text });
    await expect(apiRequest("/api/empty")).resolves.toBeNull();
    expect(text).not.toHaveBeenCalled();
  });

  it("preserves structured HTTP errors after consuming the response body", async () => {
    fetch.mockResolvedValue(mockResponse(false, 422, {
      message: "Validation failed",
      fieldErrors: { name: ["Required"] },
    }));

    await expect(apiRequest("/api/employees")).rejects.toMatchObject({
      status: 422,
      message: "Validation failed",
      fieldErrors: { name: ["Required"] },
    });
  });
});

describe("withQuery", () => {
  it("skips empty query parameters", () => {
    expect(
      withQuery("/api/employees", {
        companyId: 1,
        search: "Tarun",
        empty: "",
        missing: undefined,
        nullable: null,
      }),
    ).toBe("/api/employees?companyId=1&search=Tarun");
  });
});


describe("additional API handling", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends an idempotency key for supported JSON requests", async () => {
    fetch.mockResolvedValue(
      mockResponse(true, 200, { success: true }),
    );

    await sendJson(
      "POST",
      "/api/payroll",
      { month: "2026-10" },
      { idempotencyKey: "payroll-request-123" },
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/payroll",
      expect.objectContaining({
        method: "POST",
        headers: expect.any(Headers),
        body: JSON.stringify({ month: "2026-10" }),
      }),
    );

    const requestOptions = fetch.mock.calls[0][1];

    expect(
      requestOptions.headers.get("Idempotency-Key"),
    ).toBe("payroll-request-123");
  });

  it("returns a Blob for successful file requests", async () => {
    const file = new Blob(["report content"], {
      type: "application/pdf",
    });

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      blob: vi.fn().mockResolvedValue(file),
    });

    const result = await apiBlob("/api/reports/payroll");

    expect(result).toBe(file);
  });

  it("returns a structured error for failed file requests", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({
        "x-request-id": "req-file-403",
      }),
      json: vi.fn().mockResolvedValue({
        message: "Access denied",
        code: "FORBIDDEN",
      }),
    });

    await expect(
      apiBlob("/api/reports/payroll"),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      message: "Access denied",
      code: "FORBIDDEN",
      requestId: "req-file-403",
    });
  });

  it("converts network failures into structured API errors", async () => {
    fetch.mockRejectedValue(new TypeError("Network unavailable"));

    await expect(
      apiRequest("/api/employees"),
    ).rejects.toMatchObject({
      name: "ApiError",
      code: "NETWORK_ERROR",
    });
  });
});
