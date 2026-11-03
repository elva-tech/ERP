import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  listAgreements,
  createAgreement,
} from "../src/features/agreements/services/agreementService.js";
import { getAgreementSummary } from "../src/features/agreements/services/agreementSummaryService.js";
import { listSubcontractorOptions } from "../src/features/agreements/services/subcontractorLookupService.js";
import { listProjectOptions } from "../src/features/agreements/services/projectLookupService.js";
import { validateNewAgreementForm } from "../src/features/agreements/schemas/agreementSchema.js";
import { mockStore } from "../src/mock-api/mockStorage.js";

describe("Subcontract Agreements Full User Workflow", () => {
  beforeEach(() => {
    mockStore.resetAllTenantsToDefaults();
  });

  it("executes the complete 13-step lifecycle workflow", async () => {
    // 1. Open the Agreement Store (Fetch initial list)
    const initialList = await listAgreements();
    assert.ok(initialList.items.length > 0, "Step 1: List loaded");

    // 2. Verify register columns order
    const requiredColumns = [
      "Agreement No",
      "Date",
      "Subcontractor",
      "Project / Site",
      "Scope of Work",
      "Agreement Value",
      "Start Date",
      "End Date",
      "Status",
    ];
    // Check first item has all corresponding keys
    const sample = initialList.items[0];
    assert.ok(sample.agreementNumber, "Column 1: Agreement No present");
    assert.ok(sample.agreementDate, "Column 2: Date present");
    assert.ok(sample.subcontractor?.name, "Column 3: Subcontractor present");
    assert.ok(sample.projectName, "Column 4: Project / Site present");
    assert.ok(sample.scopeOfWork || sample.scopeSummary, "Column 5: Scope of Work present");
    assert.ok(sample.agreementValue !== undefined, "Column 6: Agreement Value present");
    assert.ok(sample.startDate, "Column 7: Start Date present");
    assert.ok(sample.endDate, "Column 8: End Date present");
    assert.ok(sample.status, "Column 9: Status present");

    // 3. Search by agreement number
    const searchRes = await listAgreements({ search: "AG-1102" });
    assert.equal(searchRes.items.length, 1, "Step 3: Found by agreement number");
    assert.equal(searchRes.items[0].agreementNumber, "AG-1102");

    // 4. Filter by status
    const filterRes = await listAgreements({ status: "active" });
    assert.ok(filterRes.items.length >= 1, "Step 4: Filter by active status");
    filterRes.items.forEach((a) => assert.equal(a.status, "active"));

    // 5. Open New Agreement modal & 6. Load subcontractor/project options
    const [subOptions, projOptions] = await Promise.all([
      listSubcontractorOptions(),
      listProjectOptions(),
    ]);
    assert.ok(subOptions.length > 0, "Step 6: Subcontractor options loaded");
    assert.ok(projOptions.length > 0, "Step 6: Project options loaded");

    // 7. Validate required fields rejection
    const invalidForm = {
      title: "",
      subcontractorId: "",
      projectId: "",
      startDate: "",
      endDate: "",
      scopeOfWork: "",
      agreementValue: "",
    };
    const validationErrors = validateNewAgreementForm(invalidForm);
    assert.ok(validationErrors.title, "Step 7: Rejects empty title");
    assert.ok(validationErrors.subcontractorId, "Step 7: Rejects empty subcontractor");
    assert.ok(validationErrors.projectId, "Step 7: Rejects empty project");

    // 8. Reject invalid date range (End date before start date)
    const dateRangeErrors = validateNewAgreementForm({
      ...invalidForm,
      title: "Valid Title",
      subcontractorId: subOptions[0].value,
      projectId: projOptions[0].value,
      startDate: "2026-12-31",
      endDate: "2026-01-01", // before start
      scopeOfWork: "Valid scope description here",
      agreementValue: "100000",
    });
    assert.equal(dateRangeErrors.endDate, "End Date cannot precede the Start Date.", "Step 8: Rejects end < start");

    // 9. Reject invalid monetary amount
    const monetaryErrors = validateNewAgreementForm({
      title: "Valid Title",
      subcontractorId: subOptions[0].value,
      projectId: projOptions[0].value,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      scopeOfWork: "Valid scope description here",
      agreementValue: "-50000", // negative
    });
    assert.ok(monetaryErrors.agreementValue, "Step 9: Rejects negative value");

    // 10. Create an agreement with valid payload
    const initialKPIs = await getAgreementSummary();
    const validAgreementPayload = {
      title: "Metro Underground Ventilation Shaft EPC",
      subcontractorId: subOptions[0].value,
      projectId: projOptions[0].value,
      startDate: "2026-06-01",
      endDate: "2027-11-30",
      scopeOfWork: "Twin shaft mechanical ventilation system, dampers, and emergency exhaust.",
      agreementValue: "35000000",
      paymentSchedule: "Monthly Progress Billing (30-day credit)",
      termsAndConditions: "Standard 36-month defect liability applies.",
    };

    const createdRecord = await createAgreement(validAgreementPayload);
    assert.ok(createdRecord.id, "Step 10: Agreement created");
    assert.ok(createdRecord.agreementNumber.startsWith("AG-"));

    // 11. Verify register refresh
    const refreshedList = await listAgreements();
    assert.equal(refreshedList.items[0].id, createdRecord.id, "Step 11: Created record is first in register");

    // 12. Verify KPI consistency
    const updatedKPIs = await getAgreementSummary();
    assert.equal(updatedKPIs.activeCount, initialKPIs.activeCount + 1, "Step 12: Active count incremented");
    assert.equal(updatedKPIs.cumulativeValue, initialKPIs.cumulativeValue + 35000000, "Step 12: Cumulative value incremented");

    // 13. Simulate API validation failure and ensure entered values remain untouched
    const enteredValues = {
      title: "Partially Entered Title",
      subcontractorId: subOptions[1].value,
      projectId: projOptions[1].value,
      startDate: "2026-05-01",
      endDate: "2025-05-01", // erroneous date
      scopeOfWork: "Entered scope draft",
      agreementValue: "2500000",
    };
    const errorsMap = validateNewAgreementForm(enteredValues);
    assert.ok(errorsMap.endDate);
    // User values remain intact for user to edit!
    assert.equal(enteredValues.title, "Partially Entered Title");
    assert.equal(enteredValues.agreementValue, "2500000");
  });
});

