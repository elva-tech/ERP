import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest, ApiError, createIdempotencyKey } from "../src/lib/apiClient.js";
import { apiConfig } from "../src/lib/apiConfig.js";

describe("Centralized API Client Architecture", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Idempotency and Request Keys", () => {
    it("should generate a valid non-empty idempotency key", () => {
      const key1 = createIdempotencyKey();
      const key2 = createIdempotencyKey();
      expect(key1).toBeTruthy();
      expect(typeof key1).toBe("string");
      expect(key1.length).toBeGreaterThan(8);
      expect(key1).not.toBe(key2);
    });
  });

  describe("Mock Mode Interception", () => {
    it("should successfully retrieve items from mock adapter in mock mode", async () => {
      expect(apiConfig.isMockMode).toBe(true);

      const response = await apiRequest("/items");
      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    it("should return warehouses from mock adapter", async () => {
      const response = await apiRequest("/warehouses");
      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.some((w) => w.code === "PUN-MAIN-01")).toBe(true);
    });
  });

  describe("Real Production API Mode Separation & Safeguards", () => {
    it("should fail explicitly and NEVER fall back to mock data when real mode is configured", async () => {
      const originalMode = apiConfig.mode;

      try {
        apiConfig.mode = "real";
        apiConfig.baseUrl = "https://api.erp.sbpatil.com/api/v1/inventory";

        // Mock global fetch to simulate a backend 404 or network failure
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            code: "ENDPOINT_NOT_FOUND",
            message: "The requested inventory endpoint does not exist on real backend.",
          }),
        });

        // The request must fail with ApiError, not return mock data
        await expect(apiRequest("/non-existent-endpoint")).rejects.toThrow(ApiError);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      } finally {
        apiConfig.mode = originalMode;
      }
    });

    it("should classify 401 Unauthorized errors correctly in real mode", async () => {
      const originalMode = apiConfig.mode;

      try {
        apiConfig.mode = "real";

        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            code: "UNAUTHORIZED",
            message: "Session token expired.",
          }),
        });

        await expect(apiRequest("/dashboard")).rejects.toSatisfy((err) => {
          return err instanceof ApiError && err.status === 401 && err.code === "UNAUTHORIZED";
        });
      } finally {
        apiConfig.mode = originalMode;
      }
    });

    it("should handle request cancellation via AbortSignal", async () => {
      const controller = new AbortController();
      controller.abort();

      const originalMode = apiConfig.mode;

      try {
        apiConfig.mode = "real";

        global.fetch = vi.fn().mockImplementation((_, opts) => {
          if (opts?.signal?.aborted) {
            const err = new Error("The operation was aborted.");
            err.name = "AbortError";
            return Promise.reject(err);
          }
          return Promise.resolve(new Response());
        });

        await expect(apiRequest("/items", { signal: controller.signal })).rejects.toSatisfy(
          (err) => err instanceof ApiError && err.name === "ApiError"
        );
      } finally {
        apiConfig.mode = originalMode;
      }
    });
  });
});
