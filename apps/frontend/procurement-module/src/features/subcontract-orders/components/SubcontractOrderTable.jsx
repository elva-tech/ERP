import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import ProgressBar from "../../../components/ui/ProgressBar.jsx";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { SUBCONTRACT_ORDER_STATUS_BADGES } from "../subcontractOrderStatus.js";

const COLUMNS = [
  { key: "number", header: "Order No", width: "120px", cellClass: "font-bold text-navy", render: (o) => displayText(o.orderNumber) },
  { key: "date", header: "Date", width: "90px", render: (o) => formatDate(o.orderDate) },
  { key: "subcontractor", header: "Subcontractor", width: "160px", cellClass: "font-semibold text-ink", render: (o) => displayText(o.subcontractor?.name) },
  { key: "agreement", header: "Agreement Ref", width: "120px", render: (o) => displayText(o.agreement?.agreementNumber) },
  { key: "description", header: "Description", cellClass: "pr-2 text-ink", render: (o) => displayText(o.description) },
  { key: "value", header: "Order Value (₹)", width: "140px", align: "right", cellClass: "font-bold text-ink", render: (o) => formatInr(o.orderValue) },
  { key: "delivery", header: "Delivery Date", width: "96px", render: (o) => formatDate(o.deliveryDate) },
  {
    key: "progress",
    header: "Progress",
    width: "120px",
    cellClass: "",
    render: (o) => <ProgressBar percent={o.progressPercent} label={`Progress of ${o.orderNumber}`} />,
  },
  { key: "status", header: "Status", width: "90px", align: "right", cellClass: "", render: (o) => <StatusBadge status={o.status} statusMap={SUBCONTRACT_ORDER_STATUS_BADGES} /> },
];

function SubcontractOrderTable({ orders, resource }) {
  return (
    <DataTable
      caption="Subcontract orders"
      columns={COLUMNS}
      rows={orders}
      getRowKey={(row) => row.id}
      resource={resource}
      bodyCellClass="h-[47px] text-[12px] leading-4"
      emptyTitle="No subcontract orders in this view"
    />
  );
}

export default SubcontractOrderTable;
