export const PURCHASE_ORDER_STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_received", label: "Partially Received" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Badge colours for "Partially Received" and "Cancelled" are not shown in the design and stay neutral.
export const PURCHASE_ORDER_STATUS_BADGES = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "navy" },
  partially_received: { label: "Partially Received", tone: "neutral" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};
