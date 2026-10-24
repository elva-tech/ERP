import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { viewColumn } from "../../../components/ui/viewColumn.js";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { PURCHASE_ORDER_STATUS_BADGES } from "../purchaseOrderStatus.js";

const COLUMNS = [
  { key: "number", header: "PO Number", width: "120px", cellClass: "font-bold text-navy", render: (o) => displayText(o.orderNumber) },
  { key: "date", header: "Date", width: "100px", render: (o) => formatDate(o.orderDate) },
  { key: "supplier", header: "Supplier", width: "180px", cellClass: "font-semibold text-ink", render: (o) => displayText(o.supplier?.name) },
  { key: "items", header: "Items Summary", cellClass: "text-ink", render: (o) => displayText(o.itemsSummary) },
  { key: "amount", header: "Total Amount (₹)", width: "140px", align: "right", cellClass: "font-bold text-ink", render: (o) => formatInr(o.totalAmount) },
  { key: "delivery", header: "Delivery Date", width: "130px", render: (o) => formatDate(o.deliveryDate) },
  { key: "status", header: "Status", width: "100px", align: "right", cellClass: "", render: (o) => <StatusBadge status={o.status} statusMap={PURCHASE_ORDER_STATUS_BADGES} /> },
  viewColumn("purchaseOrder", (o) => o.id, (o) => o.orderNumber),
];

function PurchaseOrderTable({ orders, resource }) {
  return (
    <DataTable
      caption="Purchase orders"
      columns={COLUMNS}
      rows={orders}
      getRowKey={(order) => order.id}
      resource={resource}
      emptyTitle="No purchase orders in this view"
    />
  );
}

export default PurchaseOrderTable;
