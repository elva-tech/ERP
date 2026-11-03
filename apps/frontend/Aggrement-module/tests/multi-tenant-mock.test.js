import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mockStore, MOCK_TENANT_CHANGED_EVENT } from "../src/mock-api/mockStorage.js";
import { DEMO_TENANTS, DEFAULT_MOCK_TENANT_ID } from "../src/mock-api/mockTenants.js";
import {
  listAgreements,
  createAgreement,
} from "../src/features/agreements/services/agreementService.js";
import { getAgreementSummary } from "../src/features/agreements/services/agreementSummaryService.js";
import { listSubcontractorOptions } from "../src/features/agreements/services/subcontractorLookupService.js";
import { listProjectOptions } from "../src/features/agreements/services/projectLookupService.js";
import { getSession } from "../src/features/auth/authService.js";

describe("Multi-Tenant Mock Environment & Data Isolation Tests", () => {
  beforeEach(() => {
    mockStore.resetAllTenantsToDefaults();
  });

  it("loads Tenant A (SB Patil Group) defaults on startup", async () => {
    mockStore.setActiveTenant("tenant-sbp-demo");
    const active = mockStore.getActiveTenant();
    assert.equal(active.id, "tenant-sbp-demo");
    assert.equal(active.name, "SB Patil Group");
    assert.equal(active.logoType, "sbp");
    assert.equal(active.financialYear, "FY 25");
    assert.equal(active.user.displayName, "Mr. Sandeep Patil");

    const session = await getSession();
    assert.equal(session.tenant.name, "SB Patil Group");
    assert.equal(session.user.displayName, "Mr. Sandeep Patil");

    const subs = await listSubcontractorOptions();
    assert.ok(subs.some((s) => s.label === "ABC Constructions Ltd."));
    assert.ok(subs.some((s) => s.label === "XYZ Electricals & Substation Co."));
  });

  it("switches to Tenant B (ELVA Demo Construction) with complete metadata changes", async () => {
    mockStore.setActiveTenant("tenant-elva-demo");
    const active = mockStore.getActiveTenant();
    assert.equal(active.id, "tenant-elva-demo");
    assert.equal(active.name, "ELVA Demo Construction");
    assert.equal(active.logoType, "elva");
    assert.equal(active.financialYear, "FY 2026-27");
    assert.equal(active.user.displayName, "Ms. Priya Sharma");
    assert.equal(active.user.roleLabel, "VP, Commercial & Contracts");

    const session = await getSession();
    assert.equal(session.tenant.name, "ELVA Demo Construction");
    assert.equal(session.user.displayName, "Ms. Priya Sharma");
  });

  it("switches master lookup records when tenant changes", async () => {
    // Tenant A Lookups
    mockStore.setActiveTenant("tenant-sbp-demo");
    const subsA = await listSubcontractorOptions();
    const projsA = await listProjectOptions();
    assert.ok(subsA.some((s) => s.label.includes("Larsen & Toubro")));
    assert.ok(projsA.some((p) => p.label.includes("Pune Metro")));
    assert.ok(!subsA.some((s) => s.label.includes("Kumar Constructions")));

    // Tenant B Lookups
    mockStore.setActiveTenant("tenant-elva-demo");
    const subsB = await listSubcontractorOptions();
    const projsB = await listProjectOptions();
    assert.ok(subsB.some((s) => s.label.includes("Kumar Constructions")));
    assert.ok(subsB.some((s) => s.label.includes("Prime Electricals")));
    assert.ok(projsB.some((p) => p.label.includes("Chennai Highway")));
    assert.ok(!subsB.some((s) => s.label.includes("Larsen & Toubro")));
    assert.ok(!projsB.some((p) => p.label.includes("Pune Metro")));
  });

  it("switches agreement register and recalculates KPI metrics independently", async () => {
    // Tenant A KPIs
    mockStore.setActiveTenant("tenant-sbp-demo");
    const listA = await listAgreements();
    const summaryA = await getAgreementSummary();
    assert.ok(listA.items.some((a) => a.agreementNumber === "AG-1001"));
    assert.ok(!listA.items.some((a) => a.agreementNumber === "AG-2001"));
    assert.equal(summaryA.completedPeriodLabel, "FY 25");

    // Tenant B KPIs
    mockStore.setActiveTenant("tenant-elva-demo");
    const listB = await listAgreements();
    const summaryB = await getAgreementSummary();
    assert.ok(listB.items.some((a) => a.agreementNumber === "AG-2001"));
    assert.ok(!listB.items.some((a) => a.agreementNumber === "AG-1001"));
    assert.equal(summaryB.completedPeriodLabel, "FY 2026-27");
  });

  it("guarantees complete mock data isolation: creating in Tenant A does not appear in Tenant B", async () => {
    // 1. Create in Tenant A
    mockStore.setActiveTenant("tenant-sbp-demo");
    const initialListA = await listAgreements();
    const initialCountA = initialListA.items.length;

    const newAgreementA = await createAgreement({
      title: "Isolated Agreement for Tenant A Only",
      subcontractorId: "sub-sbp-001", // ABC Constructions
      projectId: "proj-sbp-001", // Bangalore Residential
      startDate: "2026-06-01",
      endDate: "2027-05-31",
      scopeOfWork: "Unique civil package for tenant SBP.",
      agreementValue: "25000000",
    });

    assert.ok(newAgreementA.id);
    assert.ok(newAgreementA.agreementNumber.startsWith("AG-"));

    const afterCreateA = await listAgreements();
    assert.equal(afterCreateA.items.length, initialCountA + 1);
    assert.equal(afterCreateA.items[0].id, newAgreementA.id);

    // 2. Switch to Tenant B and verify new agreement is NOT visible
    mockStore.setActiveTenant("tenant-elva-demo");
    const listB = await listAgreements();
    assert.ok(!listB.items.some((a) => a.id === newAgreementA.id));
    assert.ok(!listB.items.some((a) => a.agreementNumber === newAgreementA.agreementNumber));
    assert.ok(!listB.items.some((a) => a.title === "Isolated Agreement for Tenant A Only"));

    // 3. Switch back to Tenant A and verify persistence
    mockStore.setActiveTenant("tenant-sbp-demo");
    const restoreA = await listAgreements();
    assert.equal(restoreA.items.length, initialCountA + 1);
    assert.equal(restoreA.items[0].id, newAgreementA.id);
  });

  it("rejects cross-tenant subcontractor and project references", async () => {
    // Active: Tenant A
    mockStore.setActiveTenant("tenant-sbp-demo");

    // Attempt to create agreement using Tenant B's subcontractor
    await assert.rejects(
      async () => {
        await createAgreement({
          title: "Cross Tenant Violation Attempt",
          subcontractorId: "sub-elva-001", // Belongs to Tenant B!
          projectId: "proj-sbp-001",
          startDate: "2026-06-01",
          endDate: "2027-05-31",
          scopeOfWork: "Valid scope description.",
          agreementValue: "10000000",
        });
      },
      (err) => {
        assert.equal(err.status, 422);
        assert.ok(err.fieldErrors?.subcontractorId);
        return true;
      }
    );

    // Attempt to create agreement using Tenant B's project
    await assert.rejects(
      async () => {
        await createAgreement({
          title: "Cross Tenant Project Violation Attempt",
          subcontractorId: "sub-sbp-001",
          projectId: "proj-elva-001", // Belongs to Tenant B!
          startDate: "2026-06-01",
          endDate: "2027-05-31",
          scopeOfWork: "Valid scope description.",
          agreementValue: "10000000",
        });
      },
      (err) => {
        assert.equal(err.status, 422);
        assert.ok(err.fieldErrors?.projectId);
        return true;
      }
    );
  });

  it("scopes search and filters strictly to the active tenant", async () => {
    // Tenant A search
    mockStore.setActiveTenant("tenant-sbp-demo");
    const searchA = await listAgreements({ search: "Bangalore" });
    assert.ok(searchA.items.length > 0);
    searchA.items.forEach((a) => assert.ok(a.projectName.includes("Bangalore")));

    // Tenant B search for same query returns 0
    mockStore.setActiveTenant("tenant-elva-demo");
    const searchB = await listAgreements({ search: "Bangalore" });
    assert.equal(searchB.items.length, 0);

    // Tenant B search for Chennai returns records
    const searchChennai = await listAgreements({ search: "Chennai" });
    assert.ok(searchChennai.items.length > 0);
  });
});

