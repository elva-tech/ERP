import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { viewColumn } from "../../../components/ui/viewColumn.js";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { AGREEMENT_STATUS_BADGES } from "../subcontractAgreementStatus.js";

const COLUMNS = [
  { key: "number", header: "Agreement No", width: "120px", cellClass: "font-bold text-navy", render: (a) => displayText(a.agreementNumber) },
  { key: "date", header: "Date", width: "90px", render: (a) => formatDate(a.agreementDate) },
  { key: "subcontractor", header: "Subcontractor", width: "160px", cellClass: "font-semibold text-ink", render: (a) => displayText(a.subcontractor?.name) },
  { key: "project", header: "Project / Site", width: "150px", render: (a) => displayText(a.projectName) },
  { key: "scope", header: "Scope of Work", cellClass: "text-ink", render: (a) => displayText(a.scopeSummary) },
  { key: "value", header: "Agreement Value", width: "140px", align: "right", cellClass: "font-bold text-ink", render: (a) => formatInr(a.agreementValue) },
  { key: "start", header: "Start Date", width: "89px", render: (a) => formatDate(a.startDate) },
  { key: "end", header: "End Date", width: "100px", render: (a) => formatDate(a.endDate) },
  { key: "status", header: "Status", width: "90px", cellClass: "", render: (a) => <StatusBadge status={a.status} statusMap={AGREEMENT_STATUS_BADGES} /> },
  viewColumn("subcontractAgreement", (a) => a.id, (a) => a.agreementNumber),
];

function AgreementTable({ agreements, resource }) {
  return (
    <DataTable
      caption="Subcontract agreements"
      columns={COLUMNS}
      rows={agreements}
      getRowKey={(row) => row.id}
      resource={resource}
      emptyTitle="No agreements in this view"
    />
  );
}

export default AgreementTable;
