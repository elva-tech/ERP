export const REQUISITION_STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const REQUISITION_STATUS_BADGES = {
  pending_approval: { label: "Pending Approval", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const REQUISITION_PRIORITY_BADGES = {
  high: { label: "High", tone: "danger" },
  medium: { label: "Medium", tone: "warning" },
  low: { label: "Low", tone: "success" },
};
