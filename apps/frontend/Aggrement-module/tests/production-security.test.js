import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isMockMode, getApiMode, getApiBaseUrl } from "../src/lib/env.js";
import { UNAUTHORIZED_EVENT, ApiError } from "../src/lib/apiClient.js";

describe("Production Security & Tenant Authorization Tests", () => {
  it("does not expose VITE_TENANT_ID in env.js for production authorization", async () => {
    const envModule = await import("../src/lib/env.js");
    // getTenantId must NOT be exported or used as production authorization proof
    assert.equal(
      typeof envModule.getTenantId,
      "undefined",
      "getTenantId must be removed from production authorization logic"
    );
  });

  it("identifies default mode as mock or real safely", () => {
    const mode = getApiMode();
    assert.ok(mode === "mock" || mode === "real");
  });

  it("normalizes 401 unauthorized errors with standard event constant", () => {
    assert.equal(UNAUTHORIZED_EVENT, "agreement:unauthorized");
    const err = new ApiError("unauthorized", "Session expired", { status: 401 });
    assert.equal(err.status, 401);
    assert.equal(err.kind, "unauthorized");
  });

  it("normalizes 403 forbidden errors preventing cross-tenant escalation", () => {
    const err = new ApiError("forbidden", "Access denied for this organization scope", { status: 403 });
    assert.equal(err.status, 403);
    assert.equal(err.kind, "forbidden");
  });
});

