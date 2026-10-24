import { ROUTES } from "../../config/navigation.js";
import { buildHref } from "../../hooks/useHashRoute.js";

/** Opens the record detail route for a document. Hidden when the API supplies no identifier. */
function ViewLink({ recordType, recordId, documentNumber, label = "View" }) {
  if (!recordId) return <span className="text-placeholder">—</span>;
  return (
    <a
      href={buildHref(ROUTES.recordDetail, { type: recordType, id: recordId, number: documentNumber ?? "" })}
      aria-label={`${label} ${documentNumber ?? recordType}`}
      className="font-medium text-link underline underline-offset-2 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      {label}
    </a>
  );
}

export default ViewLink;
