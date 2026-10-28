export const SUBCONTRACT_BILL_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Bills" },
  { value: "submitted", label: "Submitted" },
  { value: "verified", label: "Verified" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
];

export const SUBCONTRACT_BILL_STATUS_BADGES = {
  submitted: { label: "Submitted", tone: "warningStrong" },
  verified: { label: "Verified", tone: "success" },
  approved: { label: "Approved", tone: "success" },
  paid: { label: "Paid", tone: "success" },
};
