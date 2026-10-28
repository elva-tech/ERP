import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { SUBCONTRACT_BILL_STATUS_BADGES } from "../subcontractBillStatus.js";

function buildColumns(retentionRatePercent) {
  return [
    { key: "number", header: "Bill No", width: "120px", cellClass: "font-bold text-navy", render: (b) => displayText(b.billNumber) },
    { key: "date", header: "Date", width: "90px", render: (b) => formatDate(b.billDate) },
    { key: "subcontractor", header: "Subcontractor", width: "180px", cellClass: "font-semibold text-ink", render: (b) => displayText(b.subcontractor?.name) },
    { key: "order", header: "Order Ref", width: "120px", render: (b) => displayText(b.order?.orderNumber) },
    { key: "amount", header: "Bill Amount", width: "110px", align: "right", cellClass: "font-bold text-ink", render: (b) => formatInr(b.billAmount) },
    {
      key: "retention",
      header: retentionRatePercent ? `Retention (${retentionRatePercent}%)` : "Retention",
      width: "100px",
      align: "right",
      render: (b) => formatInr(b.retentionAmount),
    },
    { key: "net", header: "Net Payable", width: "110px", align: "right", cellClass: "font-bold text-brand", render: (b) => formatInr(b.netPayable) },
    { key: "paid", header: "Cumulative Paid", width: "130px", align: "right", render: (b) => formatInr(b.cumulativePaid) },
    { key: "status", header: "Status", align: "right", cellClass: "", render: (b) => <StatusBadge status={b.status} statusMap={SUBCONTRACT_BILL_STATUS_BADGES} /> },
  ];
}

function SubcontractBillTable({ bills, retentionRatePercent, resource }) {
  return (
    <DataTable
      caption="Subcontract bills"
      columns={buildColumns(retentionRatePercent)}
      rows={bills}
      getRowKey={(row) => row.id}
      resource={resource}
      emptyTitle="No bills in this view"
    />
  );
}

export default SubcontractBillTable;
