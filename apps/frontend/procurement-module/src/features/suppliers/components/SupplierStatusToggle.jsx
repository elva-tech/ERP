import { BADGE_BASE_CLASS, badgeToneClass } from "../../../components/ui/badgeStyles.js";
import { SUPPLIER_STATUS_BADGES, nextSupplierStatus } from "../supplierStatus.js";

function SupplierStatusToggle({ supplier, onRequestChange }) {
  const current = SUPPLIER_STATUS_BADGES[supplier.status] ?? { label: supplier.status, tone: "neutral" };
  const next = SUPPLIER_STATUS_BADGES[nextSupplierStatus(supplier.status)];

  return (
    <button
      type="button"
      onClick={onRequestChange}
      aria-label={`${supplier.name} status: ${current.label}. Change to ${next.label}`}
      title={`Change to ${next.label}`}
      className={`${BADGE_BASE_CLASS} ${badgeToneClass(current.tone)} cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy`}
    >
      {current.label}
    </button>
  );
}

export default SupplierStatusToggle;
