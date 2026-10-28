import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { PURCHASE_RETURN_STATUS_BADGES } from "../purchaseReturnStatus.js";

const COLUMNS = [
  { key: "number", header: "Return No", width: "120px", cellClass: "font-bold text-navy", render: (r) => displayText(r.returnNumber) },
  { key: "date", header: "Date", width: "100px", render: (r) => formatDate(r.returnDate) },
  { key: "supplier", header: "Supplier", width: "180px", cellClass: "font-semibold text-ink", render: (r) => displayText(r.supplier?.name) },
  { key: "reference", header: "PO/Invoice Ref", width: "140px", render: (r) => displayText(r.sourceDocument?.number) },
  {
    key: "reason",
    header: "Return Reason",
    width: "180px",
    truncate: false,
    cellClass: "py-1.5 pr-4 leading-[15px] text-brand",
    render: (r) => displayText(r.reasonLabel),
  },
  { key: "items", header: "Items Summary", width: "150px", cellClass: "pr-3 text-ink", render: (r) => displayText(r.itemsSummary) },
  { key: "amount", header: "Amount (₹)", width: "100px", align: "right", cellClass: "font-bold text-ink", render: (r) => formatInr(r.amount) },
  { key: "status", header: "Status", align: "right", cellClass: "", render: (r) => <StatusBadge status={r.status} statusMap={PURCHASE_RETURN_STATUS_BADGES} /> },
];

function PurchaseReturnTable({ returns, resource }) {
  return (
    <DataTable
      caption="Purchase returns"
      columns={COLUMNS}
      rows={returns}
      getRowKey={(row) => row.id}
      resource={resource}
      emptyTitle="No returns in this view"
    />
  );
}

export default PurchaseReturnTable;
