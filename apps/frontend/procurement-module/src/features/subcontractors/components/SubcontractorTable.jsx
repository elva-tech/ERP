import { Star } from "lucide-react";
import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { displayText } from "../../../lib/formatters.js";
import { SUBCONTRACTOR_STATUS_BADGES } from "../subcontractorStatus.js";

function Rating({ value }) {
  if (!value) return <span className="text-placeholder">—</span>;
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-warning-strong">
      {value}
      <Star size={11} fill="currentColor" strokeWidth={0} aria-hidden="true" />
      <span className="sr-only">out of 5</span>
    </span>
  );
}

const COLUMNS = [
  { key: "code", header: "Contractor Code", width: "110px", cellClass: "font-bold text-navy", render: (s) => displayText(s.code) },
  { key: "name", header: "Contractor Name", width: "180px", cellClass: "font-semibold text-ink", render: (s) => displayText(s.name) },
  { key: "trade", header: "Trade / Specialty", width: "180px", cellClass: "pr-2 text-muted", render: (s) => displayText(s.tradeSpecialtyLabel) },
  { key: "gstin", header: "GST Number", width: "130px", render: (s) => displayText(s.gstin) },
  { key: "contact", header: "Contact Person", width: "130px", cellClass: "text-ink", render: (s) => displayText(s.contactPerson) },
  { key: "phone", header: "Phone", width: "110px", render: (s) => displayText(s.phone) },
  {
    key: "agreements",
    header: "Agreements",
    width: "100px",
    cellClass: "text-ink",
    render: (s) => (s.activeAgreementCount === null || s.activeAgreementCount === undefined ? "—" : `${s.activeAgreementCount} Active`),
  },
  { key: "rating", header: "Rating", width: "80px", align: "right", cellClass: "", render: (s) => <Rating value={s.rating} /> },
  { key: "status", header: "Status", align: "right", cellClass: "", render: (s) => <StatusBadge status={s.status} statusMap={SUBCONTRACTOR_STATUS_BADGES} /> },
];

function SubcontractorTable({ subcontractors, resource }) {
  return (
    <DataTable
      caption="Subcontractors"
      columns={COLUMNS}
      rows={subcontractors}
      getRowKey={(row) => row.id}
      resource={resource}
      emptyTitle="No subcontractors found"
    />
  );
}

export default SubcontractorTable;
