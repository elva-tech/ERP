export const APPROVAL_TYPE_TABS = [
  { value: "", label: "All" },
  { value: "purchaseRequisition", label: "Purchase Requisitions" },
  { value: "purchaseOrder", label: "Purchase Orders" },
  { value: "subcontractBill", label: "Subcontract Bills" },
  { value: "purchaseInvoice", label: "Invoices" },
];

export const APPROVAL_TYPE_FILTER_OPTIONS = [
  { value: "", label: "All Documents" },
  ...APPROVAL_TYPE_TABS.slice(1).map((tab) => ({ value: tab.value, label: tab.label })),
];

export const APPROVAL_DECISION_FILTER_OPTIONS = [
  { value: "", label: "All Decisions" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

/** Date presets are resolved to concrete ranges by the backend (timezone and fiscal calendar are server concerns). */
export const APPROVAL_DATE_RANGE_OPTIONS = [
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "current_financial_year", label: "Current Financial Year" },
];

export const APPROVAL_PRIORITY_BADGES = {
  high: { label: "HIGH", tone: "danger" },
  medium: { label: "MED", tone: "warning" },
  low: { label: "LOW", tone: "success" },
};

export const APPROVAL_DECISION_BADGES = {
  approved: { label: "APPROVED", tone: "success" },
  rejected: { label: "REJECTED", tone: "danger" },
};
