import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { viewColumn } from "../../../components/ui/viewColumn.js";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { PURCHASE_INVOICE_STATUS_BADGES } from "../purchaseInvoiceStatus.js";

const COLUMNS = [
  { key: "number", header: "Invoice No", width: "110px", cellClass: "font-bold text-navy", render: (i) => displayText(i.invoiceNumber) },
  { key: "date", header: "Date", width: "85px", render: (i) => formatDate(i.invoiceDate) },
  { key: "supplier", header: "Supplier", width: "161px", cellClass: "font-semibold text-ink", render: (i) => displayText(i.supplier?.name) },
  { key: "po", header: "PO Reference", width: "110px", render: (i) => displayText(i.purchaseOrder?.orderNumber) },
  { key: "amount", header: "Invoice Amount", width: "110px", align: "right", cellClass: "font-bold text-ink", render: (i) => formatInr(i.invoiceAmount) },
  { key: "tds", header: "TDS", width: "80px", align: "right", render: (i) => formatInr(i.tdsAmount) },
  { key: "net", header: "Net Payable", width: "136px", align: "right", headerClass: "pr-8", cellClass: "pr-8 font-bold text-brand", render: (i) => formatInr(i.netPayable) },
  { key: "due", header: "Due Date", width: "104px", render: (i) => formatDate(i.dueDate) },
  { key: "status", header: "Status", width: "112px", cellClass: "", render: (i) => <StatusBadge status={i.status} statusMap={PURCHASE_INVOICE_STATUS_BADGES} /> },
  { ...viewColumn("purchaseInvoice", (i) => i.id, (i) => i.invoiceNumber), width: undefined },
];

function PurchaseInvoiceTable({ invoices, resource }) {
  return (
    <DataTable
      caption="Purchase invoices"
      columns={COLUMNS}
      rows={invoices}
      getRowKey={(invoice) => invoice.id}
      resource={resource}
      emptyTitle="No invoices in this view"
    />
  );
}

export default PurchaseInvoiceTable;
