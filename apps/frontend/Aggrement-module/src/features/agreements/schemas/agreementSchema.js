/**
 * Agreement Domain Schemas and Form Validation Rules
 */

import { isBlank, isMoneyAmount, isValidDateRange } from "./validation.js";

export const AGREEMENT_STATUSES = [
  "draft",
  "pending_approval",
  "active",
  "expiring_soon",
  "expired",
  "completed",
  "terminated",
  "cancelled",
  "pending_renewal",
];

export const STATUS_LABELS = {
  all: "All Agreements",
  draft: "Draft",
  pending_approval: "Pending Approval",
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  completed: "Completed",
  terminated: "Terminated / Cancelled",
  pending_renewal: "Pending Renewal",
};

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Agreements" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "completed", label: "Completed" },
  { value: "terminated", label: "Terminated / Cancelled" },
  { value: "pending_renewal", label: "Pending Renewal" },
];

/**
 * Validates the New Agreement Form payload (Figma 9 fields).
 *
 * @param {Object} values
 * @returns {Record<string, string>} Map of field name to error message
 */
export function validateNewAgreementForm(values) {
  const errors = {};

  // 1. Agreement Title
  if (isBlank(values.title)) {
    errors.title = "Agreement Title is required.";
  } else if (values.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long.";
  } else if (values.title.trim().length > 200) {
    errors.title = "Title cannot exceed 200 characters.";
  }

  // 2. Subcontractor
  if (isBlank(values.subcontractorId)) {
    errors.subcontractorId = "Subcontractor selection is required.";
  }

  // 3. Project
  if (isBlank(values.projectId)) {
    errors.projectId = "Project / Site selection is required.";
  }

  // 4. Start Date
  if (isBlank(values.startDate)) {
    errors.startDate = "Start Date is required.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.startDate)) {
    errors.startDate = "Start Date must be a valid date (YYYY-MM-DD).";
  }

  // 5. End Date
  if (isBlank(values.endDate)) {
    errors.endDate = "End Date is required.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.endDate)) {
    errors.endDate = "End Date must be a valid date (YYYY-MM-DD).";
  } else if (!isValidDateRange(values.startDate, values.endDate)) {
    errors.endDate = "End Date cannot precede the Start Date.";
  }

  // 6. Scope of Work
  if (isBlank(values.scopeOfWork)) {
    errors.scopeOfWork = "Scope of Work description is required.";
  } else if (values.scopeOfWork.trim().length < 5) {
    errors.scopeOfWork = "Scope of Work must be at least 5 characters.";
  }

  // 7. Agreement Value
  if (isBlank(values.agreementValue)) {
    errors.agreementValue = "Agreement Value is required.";
  } else if (!isMoneyAmount(values.agreementValue)) {
    errors.agreementValue = "Enter a valid non-negative amount with up to 2 decimal places.";
  } else if (Number.parseFloat(values.agreementValue.replace(/,/g, "")) <= 0) {
    errors.agreementValue = "Agreement Value must be greater than zero.";
  }

  // 8. Payment Schedule (Optional in initial draft, but if provided, validate)
  if (values.paymentSchedule && values.paymentSchedule.length > 500) {
    errors.paymentSchedule = "Payment Schedule description cannot exceed 500 characters.";
  }

  // 9. Terms & Conditions (Optional in initial draft, but if provided, validate)
  if (values.termsAndConditions && values.termsAndConditions.length > 5000) {
    errors.termsAndConditions = "Terms & Conditions cannot exceed 5000 characters.";
  }

  return errors;
}

/**
 * Validates Agreement Response Schema integrity
 */
export function validateAgreementListItem(item) {
  if (!item || typeof item !== "object") return false;
  if (!item.id || typeof item.id !== "string") return false;
  if (!item.agreementNumber || typeof item.agreementNumber !== "string") return false;
  if (!item.agreementDate) return false;
  if (!item.subcontractor || typeof item.subcontractor.name !== "string") return false;
  return true;
}

/**
 * Validates Agreement Summary / KPI Response Schema integrity
 */
export function validateSummaryResponse(summary) {
  if (!summary || typeof summary !== "object") return false;
  if (typeof summary.activeCount !== "number") return false;
  if (typeof summary.cumulativeValue !== "number") return false;
  if (typeof summary.completedCount !== "number") return false;
  if (typeof summary.expiredOrPendingRenewalCount !== "number") return false;
  return true;
}

