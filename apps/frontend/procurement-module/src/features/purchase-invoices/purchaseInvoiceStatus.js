export const PURCHASE_INVOICE_STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  // Verification workflow is disabled for now.
  // { value: "pending_verification", label: "Pending Verification" },
  // { value: "verified", label: "Verified" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Paid" },
];

export const PURCHASE_INVOICE_STATUS_BADGES = {
  draft: { label: "Draft", tone: "info" },
  // Verification workflow is disabled for now.
  // pending_verification: { label: "Pending Verification", tone: "warningStrong" },
  // verified: { label: "Verified", tone: "successMuted" },
  paid: { label: "Paid", tone: "successMuted" },
  partially_paid: { label: "Partially Paid", tone: "successMuted" },
  overdue: { label: "Overdue", tone: "warningStrong" },
};
