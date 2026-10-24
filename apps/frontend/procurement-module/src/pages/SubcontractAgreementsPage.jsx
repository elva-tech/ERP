import { useState } from "react";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import SummaryCards from "../components/ui/SummaryCards.jsx";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { useServerList } from "../hooks/useServerList.js";
import { formatInrCompact } from "../lib/formatters.js";
import AgreementTable from "../features/subcontract-agreements/components/AgreementTable.jsx";
import NewAgreementModal from "../features/subcontract-agreements/components/NewAgreementModal.jsx";
import { getSubcontractAgreementSummary, listSubcontractAgreements } from "../features/subcontract-agreements/subcontractAgreementService.js";
import { AGREEMENT_STATUS_FILTER_OPTIONS } from "../features/subcontract-agreements/subcontractAgreementStatus.js";

const SUMMARY_CARDS = [
  { key: "active", label: "Total Active Agreements", format: (s) => String(s.activeCount ?? "—") },
  { key: "value", label: "Cumulative Contract Value", format: (s) => formatInrCompact(s.cumulativeValue, { fractionDigits: 2 }) },
  {
    key: "completed",
    label: (s) => (s?.completedPeriodLabel ? `Completed (${s.completedPeriodLabel})` : "Completed"),
    tone: "success",
    format: (s) => String(s.completedCount ?? "—"),
  },
  { key: "expired", label: "Expired / Pending Renewal", tone: "warning", format: (s) => String(s.expiredOrPendingRenewalCount ?? "—") },
];

function SubcontractAgreementsPage({ onNotify }) {
  const list = useServerList(listSubcontractAgreements, { status: "" });
  const summary = useAsyncResource(getSubcontractAgreementSummary, "agreement-summary");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  function handleCreated(created) {
    setIsCreateOpen(false);
    list.resource.reload();
    summary.reload();
    onNotify(created?.agreementNumber ? `Agreement ${created.agreementNumber} created.` : "Agreement created.");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterSelect
          label="Status"
          value={list.filters.status}
          options={AGREEMENT_STATUS_FILTER_OPTIONS}
          onChange={(value) => list.setFilter("status", value)}
        />
        <PrimaryActionButton onClick={() => setIsCreateOpen(true)}>New Agreement</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <AgreementTable agreements={list.items} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="agreements" onPageChange={list.setPage} />
      </Panel>

      <SummaryCards resource={summary} cards={SUMMARY_CARDS} />

      {isCreateOpen && <NewAgreementModal onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default SubcontractAgreementsPage;
