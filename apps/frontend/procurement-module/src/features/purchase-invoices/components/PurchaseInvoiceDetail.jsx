import { useState } from "react";
import { IndianRupee, Paperclip } from "lucide-react";
import { ResourceBoundary } from "../../../components/ui/AsyncState.jsx";
import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { ActionButton, BackButton, DetailHeader, DetailSection, FieldGrid, TotalsList } from "../../../components/ui/DetailParts.jsx";
import { useAsyncResource } from "../../../hooks/useAsyncResource.js";
import { displayText, formatDate, formatDateTime, formatInr } from "../../../lib/formatters.js";
import { getPurchaseInvoice } from "../purchaseInvoiceService.js";
import { PURCHASE_INVOICE_STATUS_BADGES } from "../purchaseInvoiceStatus.js";
import RecordPaymentModal from "./RecordPaymentModal.jsx";

const money = (amount) => formatInr(amount, { fractionDigits: 2 });

const ITEM_COLUMNS = [
  { key: "description", header: "Description", cellClass: "font-semibold text-ink", render: (i) => displayText(i.description) },
  { key: "quantity", header: "Quantity", width: "100px", align: "right", cellClass: "text-ink", render: (i) => displayText(i.quantity) },
  { key: "rate", header: "Rate", width: "130px", align: "right", render: (i) => money(i.rate) },
  { key: "amount", header: "Amount", width: "140px", align: "right", cellClass: "font-bold text-ink", render: (i) => money(i.amount) },
];

const PAYMENT_COLUMNS = [
  { key: "date", header: "Payment Date", width: "130px", render: (p) => formatDate(p.paymentDate) },
  { key: "amount", header: "Amount", width: "140px", align: "right", headerClass: "pr-8", cellClass: "pr-8 font-bold text-ink", render: (p) => money(p.amount) },
  { key: "transaction", header: "Transaction ID", cellClass: "font-semibold text-ink", render: (p) => displayText(p.transactionId) },
  { key: "by", header: "Recorded By", width: "240px", render: (p) => `${displayText(p.recordedBy?.displayName)} · ${formatDateTime(p.recordedAt)}` },
];

function PurchaseInvoiceDetail({ id, onNotify }) {
  const resource = useAsyncResource((signal) => getPurchaseInvoice(id, signal), `purchase-invoice:${id}`);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const invoice = resource.data;

  function handleRecorded(updated) {
    setIsPaymentOpen(false);
    resource.reload();
    onNotify(
      updated?.status === "paid"
        ? `Payment recorded. Invoice ${invoice.invoiceNumber} is fully paid.`
        : `Payment recorded for invoice ${invoice.invoiceNumber}.`,
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <BackButton />
        </div>
        <ResourceBoundary resource={resource} />
      </div>
    );
  }

  const canPay = (invoice.allowedActions ?? []).includes("recordPayment");
  const taxLabel = invoice.taxRatePercent ? `GST (${invoice.taxRatePercent}%)` : "GST";
  const tdsLabel = invoice.tdsRatePercent ? `Less TDS (${invoice.tdsRatePercent}%)` : "Less TDS";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DetailHeader
        title={`Purchase Invoice ${displayText(invoice.invoiceNumber)}`}
        subtitle={invoice.supplier?.name}
        badge={<StatusBadge status={invoice.status} statusMap={PURCHASE_INVOICE_STATUS_BADGES} />}
        actions={
          canPay && (
            <ActionButton tone="brand" icon={IndianRupee} onClick={() => setIsPaymentOpen(true)}>
              Record Partial Payment
            </ActionButton>
          )
        }
      />

      <DetailSection title="Invoice Details">
        <FieldGrid
          fields={[
            { label: "Invoice No", value: displayText(invoice.invoiceNumber) },
            { label: "Invoice Date", value: formatDate(invoice.invoiceDate) },
            { label: "Due Date", value: formatDate(invoice.dueDate) },
            { label: "Status", value: <StatusBadge status={invoice.status} statusMap={PURCHASE_INVOICE_STATUS_BADGES} /> },
            { label: "Supplier", value: displayText(invoice.supplier?.name) },
            { label: "PO Reference", value: displayText(invoice.purchaseOrder?.orderNumber) },
            { label: "Invoice Amount", value: money(invoice.invoiceAmount) },
            { label: "TDS", value: money(invoice.tdsAmount) },
            { label: "Net Payable", value: <span className="font-bold text-brand">{money(invoice.netPayable)}</span> },
            { label: "Paid So Far", value: money(invoice.paidAmount) },
            { label: "Balance Due", value: <span className="font-bold">{money(invoice.balanceDue)}</span> },
          ]}
        />
      </DetailSection>

      <DetailSection title="Items">
        <DataTable
          caption="Invoice items"
          columns={ITEM_COLUMNS}
          rows={(invoice.items ?? []).map((item, index) => ({ ...item, rowKey: String(index) }))}
          getRowKey={(row) => row.rowKey}
          minWidth={560}
          emptyTitle="No items"
        />
        <TotalsList
          rows={[
            { label: "Taxable Amount", value: money(invoice.taxableAmount) },
            { label: taxLabel, value: money(invoice.taxAmount) },
            { label: "Invoice Amount", value: money(invoice.invoiceAmount) },
            { label: tdsLabel, value: `− ${money(invoice.tdsAmount)}` },
            { label: "Net Payable", value: money(invoice.netPayable), strong: true },
            { label: "Paid So Far", value: `− ${money(invoice.paidAmount)}` },
            { label: "Balance Due", value: money(invoice.balanceDue), strong: true },
          ]}
        />
      </DetailSection>

      <DetailSection title="Payments">
        <DataTable
          caption="Invoice payments"
          columns={PAYMENT_COLUMNS}
          rows={invoice.payments ?? []}
          getRowKey={(row) => row.id}
          minWidth={640}
          emptyTitle="No payments recorded yet"
        />
      </DetailSection>

      <DetailSection title="Attachments">
        {(invoice.attachments ?? []).length === 0 ? (
          <p className="text-[12px] text-muted">No attachments.</p>
        ) : (
          <ul className="space-y-1.5">
            {invoice.attachments.map((file) => (
              <li key={file.id} className="flex items-center gap-2 text-[13px] text-ink">
                <Paperclip size={14} className="text-muted" aria-hidden="true" />
                {file.fileName}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {isPaymentOpen && <RecordPaymentModal invoice={invoice} onClose={() => setIsPaymentOpen(false)} onRecorded={handleRecorded} />}
    </div>
  );
}

export default PurchaseInvoiceDetail;
