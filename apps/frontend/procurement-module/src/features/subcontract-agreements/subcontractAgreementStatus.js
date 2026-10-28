export const AGREEMENT_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Agreements" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "expired", label: "Expired" },
];

export const AGREEMENT_STATUS_BADGES = {
  active: { label: "Active", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  expired: { label: "Expired", tone: "danger" },
};
