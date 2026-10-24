export const PURCHASE_RETURN_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Returns" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "credit_note_issued", label: "Credit Note Issued" },
  { value: "rejected", label: "Rejected" },
];

export const PURCHASE_RETURN_STATUS_BADGES = {
  pending_approval: { label: "Pending Approval", tone: "warningStrong" },
  credit_note_issued: { label: "Credit Note Issued", tone: "warningStrong" },
  rejected: { label: "Rejected", tone: "danger" },
};
