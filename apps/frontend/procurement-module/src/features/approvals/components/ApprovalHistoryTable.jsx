import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { APPROVAL_DECISION_BADGES } from "../approvalOptions.js";

const COLUMNS = [
  { key: "type", header: "Document Type", width: "140px", render: (h) => displayText(h.documentTypeLabel) },
  { key: "number", header: "Document No", width: "110px", cellClass: "font-bold text-navy", render: (h) => displayText(h.document?.number) },
  { key: "requestedBy", header: "Requested By", width: "130px", cellClass: "font-semibold text-ink", render: (h) => displayText(h.requestedBy?.displayName) },
  { key: "amount", header: "Amount (₹)", width: "100px", align: "right", cellClass: "font-bold text-ink", render: (h) => formatInr(h.amount) },
  { key: "submitted", header: "Submitted", width: "100px", render: (h) => formatDate(h.submittedAt) },
  { key: "decided", header: "Decision Date", width: "100px", render: (h) => formatDate(h.decidedAt) },
  { key: "decidedBy", header: "Processed By", width: "120px", cellClass: "text-ink", render: (h) => displayText(h.decidedBy?.displayName) },
  { key: "decision", header: "Status", width: "90px", cellClass: "", render: (h) => <StatusBadge status={h.decision} statusMap={APPROVAL_DECISION_BADGES} /> },
  { key: "comment", header: "Comments", cellClass: "text-muted", render: (h) => <span title={h.comment ?? undefined}>{displayText(h.comment)}</span> },
];

function ApprovalHistoryTable({ entries, resource }) {
  return (
    <DataTable
      caption="Approval history"
      columns={COLUMNS}
      rows={entries}
      getRowKey={(row) => row.id}
      resource={resource}
      bodyCellClass="h-[41px] text-[12px] leading-4"
      emptyTitle="No decisions match these filters"
    />
  );
}

export default ApprovalHistoryTable;
