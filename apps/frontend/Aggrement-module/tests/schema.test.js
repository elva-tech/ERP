import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateNewAgreementForm,
  validateAgreementListItem,
  validateSummaryResponse,
} from "../src/features/agreements/schemas/agreementSchema.js";
import {
  isMoneyAmount,
  isValidDateRange,
  toPaise,
  fromPaise,
} from "../src/features/agreements/schemas/validation.js";

describe("Agreement Schema Validation Tests", () => {
  const validPayload = {
    title: "Pune Metro Overhead Traction Package",
    subcontractorId: "sub-002",
    projectId: "proj-001",
    startDate: "2026-01-01",
    endDate: "2027-12-31",
    scopeOfWork: "Complete 25 kV AC overhead traction electrification and SCADA.",
    agreementValue: "48500000.00",
    paymentSchedule: "Milestone-Linked",
    termsAndConditions: "Defect liability 24 months.",
  };

  it("passes validation with complete valid agreement data", () => {
    const errors = validateNewAgreementForm(validPayload);
    assert.deepEqual(errors, {});
  });

  it("fails when required fields are missing", () => {
    const emptyPayload = {
      title: "",
      subcontractorId: "",
      projectId: "",
      startDate: "",
      endDate: "",
      scopeOfWork: "",
      agreementValue: "",
    };
    const errors = validateNewAgreementForm(emptyPayload);
    assert.ok(errors.title, "Expected title error");
    assert.ok(errors.subcontractorId, "Expected subcontractor error");
    assert.ok(errors.projectId, "Expected project error");
    assert.ok(errors.startDate, "Expected startDate error");
    assert.ok(errors.endDate, "Expected endDate error");
    assert.ok(errors.scopeOfWork, "Expected scopeOfWork error");
    assert.ok(errors.agreementValue, "Expected agreementValue error");
  });

  it("rejects title shorter than 3 characters", () => {
    const errors = validateNewAgreementForm({ ...validPayload, title: "AB" });
    assert.equal(errors.title, "Title must be at least 3 characters long.");
  });

  it("rejects invalid date format", () => {
    const errors = validateNewAgreementForm({ ...validPayload, startDate: "01/01/2026" });
    assert.equal(errors.startDate, "Start Date must be a valid date (YYYY-MM-DD).");
  });

  it("rejects end date before start date", () => {
    const errors = validateNewAgreementForm({
      ...validPayload,
      startDate: "2027-01-01",
      endDate: "2026-01-01",
    });
    assert.equal(errors.endDate, "End Date cannot precede the Start Date.");
  });

  it("rejects invalid or negative monetary values", () => {
    assert.equal(isMoneyAmount("abc"), false);
    assert.equal(isMoneyAmount("-100"), false);
    assert.equal(isMoneyAmount("100.999"), false); // more than 2 decimals
    assert.equal(isMoneyAmount("100.50"), true);
    assert.equal(isMoneyAmount("100"), true);

    const errors = validateNewAgreementForm({ ...validPayload, agreementValue: "-500" });
    assert.ok(errors.agreementValue);
  });

  it("converts monetary values to integer paise without floating point error", () => {
    const paise = toPaise("12345.67");
    assert.equal(paise, 1234567n);
    assert.equal(fromPaise(paise), "12345.67");

    // Test addition of cents
    const p1 = toPaise("0.10");
    const p2 = toPaise("0.20");
    assert.equal(fromPaise(p1 + p2), "0.30"); // Standard floating point 0.1+0.2 is 0.30000000000000004
  });

  it("validates list item schema integrity", () => {
    assert.equal(
      validateAgreementListItem({
        id: "agr-1",
        agreementNumber: "AG-100",
        agreementDate: "2026-01-01",
        subcontractor: { id: "sub-1", name: "L&T" },
      }),
      true
    );

    assert.equal(validateAgreementListItem({ id: "agr-1" }), false);
    assert.equal(validateAgreementListItem(null), false);
  });

  it("validates summary response schema integrity", () => {
    assert.equal(
      validateSummaryResponse({
        activeCount: 10,
        cumulativeValue: 5000000,
        completedCount: 5,
        expiredOrPendingRenewalCount: 2,
      }),
      true
    );

    assert.equal(validateSummaryResponse({ activeCount: "10" }), false);
    assert.equal(validateSummaryResponse(null), false);
  });
});

