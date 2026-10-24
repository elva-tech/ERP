import { useState } from "react";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import SummaryCards from "../components/ui/SummaryCards.jsx";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { useServerList } from "../hooks/useServerList.js";
import { formatInrCompact } from "../lib/formatters.js";
import NewReturnModal from "../features/purchase-returns/components/NewReturnModal.jsx";
import PurchaseReturnTable from "../features/purchase-returns/components/PurchaseReturnTable.jsx";
import { getPurchaseReturnSummary, listPurchaseReturns } from "../features/purchase-returns/purchaseReturnService.js";
import { PURCHASE_RETURN_STATUS_FILTER_OPTIONS } from "../features/purchase-returns/purchaseReturnStatus.js";

const SUMMARY_CARDS = [
  { key: "processed", label: "Active Returns Processed", format: (s) => String(s.processedCount ?? "—") },
  { key: "value", label: "Total Returns Value", format: (s) => formatInrCompact(s.totalValue, { fractionDigits: 2 }) },
  { key: "pendingCredit", label: "Pending Credit Notes", tone: "warning", format: (s) => String(s.pendingCreditNoteCount ?? "—") },
  { key: "rejected", label: "Rejected Claims", tone: "brand", format: (s) => String(s.rejectedCount ?? "—") },
];

function PurchaseReturnsPage({ onNotify }) {
  const list = useServerList(listPurchaseReturns, { status: "" });
  const summary = useAsyncResource(getPurchaseReturnSummary, "purchase-return-summary");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  function handleCreated(created) {
    setIsCreateOpen(false);
    list.resource.reload();
    summary.reload();
    onNotify(created?.returnNumber ? `Return ${created.returnNumber} created.` : "Return created.");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterSelect
          label="Status"
          value={list.filters.status}
          options={PURCHASE_RETURN_STATUS_FILTER_OPTIONS}
          onChange={(value) => list.setFilter("status", value)}
        />
        <PrimaryActionButton onClick={() => setIsCreateOpen(true)}>New Return</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <PurchaseReturnTable returns={list.items} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="returns" onPageChange={list.setPage} />
      </Panel>

      <SummaryCards resource={summary} cards={SUMMARY_CARDS} />

      {isCreateOpen && <NewReturnModal onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default PurchaseReturnsPage;
