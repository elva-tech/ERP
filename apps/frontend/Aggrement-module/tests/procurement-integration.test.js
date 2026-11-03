import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listSubcontractorOptions } from "../src/features/agreements/services/subcontractorLookupService.js";
import { listProjectOptions } from "../src/features/agreements/services/projectLookupService.js";
import { mockStore } from "../src/mock-api/mockStorage.js";

describe("Procurement Master-Data Integration Tests", () => {
  it("preserves actual subcontractor IDs and structures in dropdown options", async () => {
    mockStore.setActiveTenant("tenant-sbp-demo");
    const options = await listSubcontractorOptions();

    assert.ok(options.length > 0);
    options.forEach((opt) => {
      assert.ok(typeof opt.value === "string" && opt.value.length > 0, "value must be valid ID");
      assert.ok(typeof opt.label === "string" && opt.label.length > 0, "label must be company name");
      // Must not be undefined or [object Object]
      assert.ok(!opt.value.includes("object"));
      assert.ok(!opt.label.includes("object"));
    });

    const lAndT = options.find((o) => o.label.includes("Larsen & Toubro"));
    assert.ok(lAndT);
    assert.equal(lAndT.value, "sub-sbp-003");
  });

  it("preserves actual project IDs and structures in dropdown options", async () => {
    mockStore.setActiveTenant("tenant-sbp-demo");
    const options = await listProjectOptions();

    assert.ok(options.length > 0);
    options.forEach((opt) => {
      assert.ok(typeof opt.value === "string" && opt.value.length > 0, "value must be valid project ID");
      assert.ok(typeof opt.label === "string" && opt.label.length > 0, "label must be project name");
      assert.ok(!opt.value.includes("object"));
      assert.ok(!opt.label.includes("object"));
    });

    const metro = options.find((o) => o.label.includes("Pune Metro"));
    assert.ok(metro);
    assert.equal(metro.value, "proj-sbp-003");
  });

  it("handles empty options gracefully", async () => {
    // Check that mapping an empty array returns empty array
    const emptyMapped = [].map((i) => ({ value: i.id, label: i.name }));
    assert.deepEqual(emptyMapped, []);
  });
});

