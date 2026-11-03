import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  listAgreements,
  getAgreement,
  createAgreement,
  listPaymentSchedules,
} from "../src/features/agreements/services/agreementService.js";
import { getAgreementSummary } from "../src/features/agreements/services/agreementSummaryService.js";
import { listSubcontractorOptions } from "../src/features/agreements/services/subcontractorLookupService.js";
import { listProjectOptions } from "../src/features/agreements/services/projectLookupService.js";
import { mockStore } from "../src/mock-api/mockStorage.js";

describe("Agreement Service & Mock Adapter Tests", () => {
  beforeEach(() => {
    mockStore.resetAllTenantsToDefaults();
  });

  it("lists agreements with default pagination", async () => {
    const res = await listAgreements({ page: 1, pageSize: 5 });
    assert.ok(res.items);
    assert.equal(res.items.length, 5);
    assert.equal(res.pagination.page, 1);
    assert.equal(res.pagination.pageSize, 5);
    assert.ok(res.pagination.totalItems > 5);
  });

  it("filters agreements by status", async () => {
    const activeRes = await listAgreements({ status: "active" });
    assert.ok(activeRes.items.length > 0);
    activeRes.items.forEach((item) => {
      assert.equal(item.status, "active");
    });

    const expiredRes = await listAgreements({ status: "expired" });
    assert.ok(expiredRes.items.length > 0);
    expiredRes.items.forEach((item) => {
      assert.equal(item.status, "expired");
    });
  });

  it("searches agreements by number, title, subcontractor, and scope", async () => {
    const resNo = await listAgreements({ search: "AG-1102" });
    assert.equal(resNo.items.length, 1);
    assert.equal(resNo.items[0].agreementNumber, "AG-1102");

    const resSub = await listAgreements({ search: "Tata Power" });
    assert.ok(resSub.items.length >= 1);
    assert.ok(resSub.items[0].subcontractor.name.includes("Tata Power"));
  });

  it("retrieves KPI summary calculations", async () => {
    const summary = await getAgreementSummary();
    assert.ok(summary.activeCount > 0);
    assert.ok(summary.cumulativeValue > 0);
    assert.ok(summary.completedCount >= 0);
    assert.ok(summary.expiredOrPendingRenewalCount >= 0);
    assert.equal(summary.completedPeriodLabel, "FY 25");
    assert.equal(summary.currencyCode, "INR");
  });

  it("fetches single agreement detail by id", async () => {
    const agr = await getAgreement("AG-1498");
    assert.equal(agr.agreementNumber, "AG-1498");
    assert.equal(agr.status, "active");
  });

  it("throws not_found error for unknown agreement", async () => {
    await assert.rejects(
      async () => {
        await getAgreement("AG-NONEXISTENT");
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.kind, "not_found");
        return true;
      }
    );
  });

  it("creates a new agreement and updates the register", async () => {
    const initialSummary = await getAgreementSummary();
    const subs = await listSubcontractorOptions();
    const projs = await listProjectOptions();

    const lAndT = subs.find((s) => s.label.includes("Larsen & Toubro")) || subs[0];
    const metro = projs.find((p) => p.label.includes("Pune Metro")) || projs[0];

    const newAgreementPayload = {
      title: "Test Viaduct Civil Construction Package",
      subcontractorId: lAndT.value,
      projectId: metro.value,
      startDate: "2026-04-01",
      endDate: "2028-03-31",
      scopeOfWork: "Piling and pier foundation execution for elevated section.",
      agreementValue: "50000000",
      paymentSchedule: "Monthly Progress Billing (30-day credit)",
      termsAndConditions: "Standard construction terms.",
    };

    const created = await createAgreement(newAgreementPayload);
    assert.ok(created.id);
    assert.ok(created.agreementNumber.startsWith("AG-"));
    assert.ok(created.subcontractor.name.includes("Larsen & Toubro"));
    assert.equal(created.status, "active");

    // Verify it appears in register
    const listRes = await listAgreements({ search: created.agreementNumber });
    assert.equal(listRes.items.length, 1);
    assert.equal(listRes.items[0].id, created.id);

    // Verify KPI was updated
    const updatedSummary = await getAgreementSummary();
    assert.equal(updatedSummary.activeCount, initialSummary.activeCount + 1);
    assert.equal(updatedSummary.cumulativeValue, initialSummary.cumulativeValue + 50000000);
  });

  it("prevents duplicate submissions with the same idempotency key", async () => {
    const subs = await listSubcontractorOptions();
    const projs = await listProjectOptions();
    const idempotencyKey = "test-key-" + Date.now();
    const payload = {
      title: "Duplicate Test Agreement",
      subcontractorId: subs[0].value,
      projectId: projs[0].value,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      scopeOfWork: "Scope description text here.",
      agreementValue: "1000000",
    };

    // First submission succeeds
    await createAgreement(payload, { idempotencyKey });

    // Second submission with same key is rejected with conflict
    await assert.rejects(
      async () => {
        await createAgreement(payload, { idempotencyKey });
      },
      (err) => {
        assert.equal(err.status, 409);
        assert.equal(err.kind, "conflict");
        return true;
      }
    );
  });

  it("retrieves lookup options for subcontractors, projects, and schedules", async () => {
    const subs = await listSubcontractorOptions();
    assert.ok(subs.length > 0);
    assert.ok(subs[0].value);
    assert.ok(subs[0].label);

    const projs = await listProjectOptions();
    assert.ok(projs.length > 0);
    assert.ok(projs[0].value);
    assert.ok(projs[0].label);

    const schedules = await listPaymentSchedules();
    assert.ok(schedules.length > 0);
    assert.ok(schedules[0].label);
  });
});

