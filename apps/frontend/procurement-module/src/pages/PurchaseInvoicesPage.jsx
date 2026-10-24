import { useState } from "react";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import StatusTabs from "../components/ui/StatusTabs.jsx";
import SummaryCards from "../components/ui/SummaryCards.jsx";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { useServerList } from "../hooks/useServerList.js";
import { formatInrCompact } from "../lib/formatters.js";
import PurchaseInvoiceTable from "../features/purchase-invoices/components/PurchaseInvoiceTable.jsx";
import RecordInvoiceModal from "../features/purchase-invoices/components/RecordInvoiceModal.jsx";
import { getPurchaseInvoiceSummary, listPurchaseInvoices } from "../features/purchase-invoices/purchaseInvoiceService.js";
import { PURCHASE_INVOICE_STATUS_TABS } from "../features/purchase-invoices/purchaseInvoiceStatus.js";

const compact = (amount) => formatInrCompact(amount, { fractionDigits: 2 });

const SUMMARY_CARDS = [
  { key: "total", label: "Total Recorded Invoices", format: (s) => String(s.totalInvoices ?? "—") },
  { key: "amount", label: "Total Amount Registered", format: (s) => compact(s.totalAmount) },
  // Verification workflow is disabled for now.
  // { key: "pending", label: "Pending Verification", tone: "warning", format: (s) => String(s.pendingVerificationCount ?? "—") },
  { key: "overdue", label: "Total Overdue Amount", tone: "brand", format: (s) => compact(s.overdueAmount) },
];

function PurchaseInvoicesPage({ onNotify }) {
  const list = useServerList(listPurchaseInvoices, { status: "" });
  const summary = useAsyncResource(getPurchaseInvoiceSummary, "purchase-invoice-summary");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  function handleCreated(invoice) {
    setIsCreateOpen(false);
    list.resource.reload();
    summary.reload();
    onNotify(invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber} recorded.` : "Invoice recorded.");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusTabs
          ariaLabel="Filter invoices by status"
          tabs={PURCHASE_INVOICE_STATUS_TABS}
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
        />
        <PrimaryActionButton onClick={() => setIsCreateOpen(true)}>Record Invoice</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <PurchaseInvoiceTable invoices={list.items} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="invoices" onPageChange={list.setPage} />
      </Panel>

      <SummaryCards resource={summary} cards={SUMMARY_CARDS} />

      {isCreateOpen && <RecordInvoiceModal onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default PurchaseInvoicesPage;
