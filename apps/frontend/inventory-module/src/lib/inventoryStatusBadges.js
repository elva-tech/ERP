export const TRANSFER_STATUS_BADGES = {
  Draft: { label: "Draft", tone: "neutral" },
  "In Transit": { label: "In Transit", tone: "info" },
  Received: { label: "Received", tone: "success" },
  Cancelled: { label: "Cancelled", tone: "danger" },
  Pending: { label: "Pending", tone: "warning" },
};

export const DELIVERY_NOTE_STATUS_BADGES = {
  Pending: { label: "Pending", tone: "warning" },
  Dispatched: { label: "Dispatched", tone: "info" },
  Delivered: { label: "Delivered", tone: "success" },
};

export const RECONCILIATION_STATUS_BADGES = {
  Matched: { label: "Matched", tone: "success" },
  Discrepancy: { label: "Discrepancy", tone: "danger" },
  Pending: { label: "Pending", tone: "warning" },
  Adjusted: { label: "Adjusted", tone: "navy" },
};