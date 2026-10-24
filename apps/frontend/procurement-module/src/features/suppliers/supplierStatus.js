export const SUPPLIER_STATUS = {
  active: "active",
  inactive: "inactive",
};

export const SUPPLIER_STATUS_BADGES = {
  [SUPPLIER_STATUS.active]: { label: "Active", tone: "success" },
  [SUPPLIER_STATUS.inactive]: { label: "Inactive", tone: "danger" },
};

export const SUPPLIER_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: SUPPLIER_STATUS.active, label: "Active" },
  { value: SUPPLIER_STATUS.inactive, label: "Inactive" },
];

export function nextSupplierStatus(status) {
  return status === SUPPLIER_STATUS.active ? SUPPLIER_STATUS.inactive : SUPPLIER_STATUS.active;
}
