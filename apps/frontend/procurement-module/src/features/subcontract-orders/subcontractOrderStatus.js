export const SUBCONTRACT_ORDER_STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// "Cancelled" has no badge in the design and stays neutral.
export const SUBCONTRACT_ORDER_STATUS_BADGES = {
  draft: { label: "Draft", tone: "info" },
  active: { label: "Active", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};
