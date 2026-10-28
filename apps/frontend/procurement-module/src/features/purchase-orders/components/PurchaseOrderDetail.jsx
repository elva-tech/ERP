import { useState } from "react";
import { Ban, CircleCheck, PackageCheck, Send } from "lucide-react";
import { ResourceBoundary } from "../../../components/ui/AsyncState.jsx";
import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { ActionButton, BackButton, DetailHeader, DetailSection, FieldGrid, TotalsList } from "../../../components/ui/DetailParts.jsx";
import { useAsyncResource } from "../../../hooks/useAsyncResource.js";
import { displayText, formatDate, formatDateTime, formatInr } from "../../../lib/formatters.js";
import { getPurchaseOrder } from "../purchaseOrderService.js";
import { PURCHASE_ORDER_STATUS_BADGES } from "../purchaseOrderStatus.js";
import PurchaseOrderStatusModal from "./PurchaseOrderStatusModal.jsx";
import RecordReceiptModal from "./RecordReceiptModal.jsx";

const ACTIONS = [
  { action: "send", status: "sent", label: "Mark as Sent", icon: Send, tone: "neutral" },
  { action: "cancel", status: "cancelled", label: "Cancel PO", icon: Ban, tone: "danger" },
  { action: "complete", status: "completed", label: "Mark Completed", icon: CircleCheck, tone: "success" },
  { action: "receive", label: "Record Receipt", icon: PackageCheck, tone: "brand" },
];

const STATUS_MESSAGES = { sent: "marked as sent", completed: "marked completed", cancelled: "cancelled" };

const withUnit = (quantity, unitLabel) => (quantity && unitLabel ? `${quantity} ${unitLabel}` : displayText(quantity));

const ITEM_COLUMNS = [
  { key: "description", header: "Item Description", cellClass: "font-semibold text-ink", render: (i) => displayText(i.description) },
  { key: "ordered", header: "Ordered", width: "100px", align: "right", cellClass: "text-ink", render: (i) => withUnit(i.quantity, i.unitLabel) },
  { key: "received", header: "Received", width: "100px", align: "right", cellClass: "text-success", render: (i) => withUnit(i.receivedQuantity, i.unitLabel) },
  { key: "remaining", header: "Remaining", width: "110px", align: "right", headerClass: "pr-6", cellClass: "pr-6 text-ink", render: (i) => withUnit(i.remainingQuantity, i.unitLabel) },
  { key: "price", header: "Unit Price", width: "110px", align: "right", render: (i) => formatInr(i.unitPrice) },
  { key: "amount", header: "Amount", width: "130px", align: "right", cellClass: "font-bold text-ink", render: (i) => formatInr(i.amount) },
];

const RECEIPT_COLUMNS = [
  { key: "number", header: "Receipt No", width: "140px", cellClass: "font-bold text-navy", render: (r) => displayText(r.receiptNumber) },
  { key: "date", header: "Received Date", width: "120px", render: (r) => formatDate(r.receivedDate) },
  {
    key: "items",
    header: "Items Received",
    cellClass: "text-ink",
    render: (r) => (r.items ?? []).map((item) => `${item.description}: ${withUnit(item.quantity, item.unitLabel)}`).join(", ") || "—",
  },
  { key: "amount", header: "Amount", width: "130px", align: "right", headerClass: "pr-6", cellClass: "pr-6 font-bold text-ink", render: (r) => formatInr(r.amount) },
  { key: "by", header: "Recorded By", width: "190px", render: (r) => `${displayText(r.recordedBy?.displayName)} · ${formatDateTime(r.recordedAt)}` },
];

function PurchaseOrderDetail({ id, onNotify }) {
  const resource = useAsyncResource((signal) => getPurchaseOrder(id, signal), `purchase-order:${id}`);
  const [dialog, setDialog] = useState(null);
  const po = resource.data;

  function handleSaved(message) {
    setDialog(null);
    resource.reload();
    onNotify(message);
  }

  if (!po) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <BackButton />
        </div>
        <ResourceBoundary resource={resource} />
      </div>
    );
  }

  const allowed = po.allowedActions ?? [];
  const actions = ACTIONS.filter((entry) => allowed.includes(entry.action));
  const taxLabel = po.taxRatePercent ? `GST (${po.taxRatePercent}%)` : "GST";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DetailHeader
        title={`Purchase Order ${displayText(po.orderNumber)}`}
        subtitle={po.supplier?.name}
        badge={<StatusBadge status={po.status} statusMap={PURCHASE_ORDER_STATUS_BADGES} />}
        actions={
          actions.length > 0 &&
          actions.map((entry) => (
            <ActionButton key={entry.action} tone={entry.tone} icon={entry.icon} onClick={() => setDialog(entry)}>
              {entry.label}
            </ActionButton>
          ))
        }
      />

      <DetailSection title="Order Details">
        <FieldGrid
          fields={[
            { label: "PO Number", value: displayText(po.orderNumber) },
            { label: "Order Date", value: formatDate(po.orderDate) },
            { label: "Delivery Date", value: formatDate(po.deliveryDate) },
            { label: "Status", value: <StatusBadge status={po.status} statusMap={PURCHASE_ORDER_STATUS_BADGES} /> },
            { label: "Supplier", value: displayText(po.supplier?.name) },
            { label: "Requisition", value: displayText(po.requisition?.requisitionNumber) },
            { label: "Payment Terms", value: displayText(po.paymentTermsLabel) },
            { label: "Created By", value: displayText(po.createdBy?.displayName) },
            { label: "Total Amount", value: <span className="font-bold">{formatInr(po.totalAmount)}</span> },
            { label: "Received Value", value: formatInr(po.receivedAmount) },
            { label: "Items Summary", value: displayText(po.itemsSummary), wide: true },
            { label: "Shipping Address", value: displayText(po.shippingAddress), wide: true },
            { label: "Notes", value: displayText(po.notes), wide: true },
          ]}
        />
      </DetailSection>

      <DetailSection title="Items">
        <DataTable caption="Purchase order items" columns={ITEM_COLUMNS} rows={po.items ?? []} getRowKey={(row) => row.lineId} minWidth={760} emptyTitle="No items" />
        <TotalsList
          rows={[
            { label: "Subtotal", value: formatInr(po.subtotal) },
            { label: taxLabel, value: formatInr(po.taxAmount) },
            { label: "Total Amount", value: formatInr(po.totalAmount), strong: true },
          ]}
        />
      </DetailSection>

      <DetailSection title="Receipts">
        <DataTable
          caption="Goods receipts"
          columns={RECEIPT_COLUMNS}
          rows={po.receipts ?? []}
          getRowKey={(row) => row.id}
          minWidth={760}
          bodyCellClass="min-h-[45px] py-2 text-[12px] leading-4"
          emptyTitle="No goods received yet"
        />
      </DetailSection>

      {dialog?.action === "receive" && (
        <RecordReceiptModal
          purchaseOrder={po}
          onClose={() => setDialog(null)}
          onRecorded={(updated) =>
            handleSaved(
              updated?.status === "completed"
                ? `Receipt recorded. ${po.orderNumber} is fully received and marked completed.`
                : `Receipt recorded for ${po.orderNumber}.`,
            )
          }
        />
      )}
      {dialog?.status && (
        <PurchaseOrderStatusModal
          purchaseOrder={po}
          status={dialog.status}
          onClose={() => setDialog(null)}
          onChanged={() => handleSaved(`${po.orderNumber} ${STATUS_MESSAGES[dialog.status]}.`)}
        />
      )}
    </div>
  );
}

export default PurchaseOrderDetail;
