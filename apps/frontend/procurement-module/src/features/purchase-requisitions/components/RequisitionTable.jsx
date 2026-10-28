import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { viewColumn } from "../../../components/ui/viewColumn.js";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { REQUISITION_PRIORITY_BADGES, REQUISITION_STATUS_BADGES } from "../requisitionStatus.js";

const COLUMNS = [
  { key: "number", header: "PR Number", width: "120px", cellClass: "font-bold text-navy", render: (r) => displayText(r.requisitionNumber) },
  { key: "date", header: "Date", width: "100px", render: (r) => formatDate(r.requestDate) },
  { key: "requestedBy", header: "Requested By", width: "140px", cellClass: "font-semibold text-ink", render: (r) => displayText(r.requestedBy?.displayName) },
  { key: "department", header: "Department", width: "120px", render: (r) => displayText(r.departmentName) },
  { key: "items", header: "Items Summary", cellClass: "text-ink", render: (r) => displayText(r.itemsSummary) },
  { key: "amount", header: "Est. Amount", width: "136px", align: "right", headerClass: "pr-8", cellClass: "pr-8 font-bold text-ink", render: (r) => formatInr(r.estimatedAmount) },
  { key: "priority", header: "Priority", width: "100px", cellClass: "", render: (r) => <StatusBadge status={r.priority} statusMap={REQUISITION_PRIORITY_BADGES} /> },
  { key: "status", header: "Status", width: "136px", cellClass: "", render: (r) => <StatusBadge status={r.status} statusMap={REQUISITION_STATUS_BADGES} /> },
  viewColumn("purchaseRequisition", (r) => r.id, (r) => r.requisitionNumber),
];

function RequisitionTable({ requisitions, resource }) {
  return (
    <DataTable
      caption="Purchase requisitions"
      columns={COLUMNS}
      rows={requisitions}
      getRowKey={(row) => row.id}
      resource={resource}
      emptyTitle="No requisitions in this view"
    />
  );
}

export default RequisitionTable;
