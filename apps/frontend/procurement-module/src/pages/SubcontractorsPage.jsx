import { useCallback, useState } from "react";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import SearchInput from "../components/ui/SearchInput.jsx";
import SummaryCards from "../components/ui/SummaryCards.jsx";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { useServerList } from "../hooks/useServerList.js";
import AddSubcontractorModal from "../features/subcontractors/components/AddSubcontractorModal.jsx";
import SubcontractorTable from "../features/subcontractors/components/SubcontractorTable.jsx";
import { getSubcontractorSummary, listSubcontractors } from "../features/subcontractors/subcontractorService.js";

const SUMMARY_CARDS = [
  { key: "registered", label: "Total Registered Contractors", format: (s) => String(s.registeredCount ?? "—") },
  { key: "agreements", label: "Active Agreements", format: (s) => String(s.activeAgreementCount ?? "—") },
  {
    key: "topRated",
    label: (s) => (s?.topRatedThreshold ? `Top Rated Contractors (>= ${s.topRatedThreshold})` : "Top Rated Contractors"),
    tone: "success",
    format: (s) => String(s.topRatedCount ?? "—"),
  },
  { key: "suspended", label: "Suspended / Blacklisted", tone: "brand", format: (s) => String(s.suspendedOrBlacklistedCount ?? "—") },
];

function SubcontractorsPage({ onNotify }) {
  const list = useServerList(listSubcontractors, { search: "" });
  const summary = useAsyncResource(getSubcontractorSummary, "subcontractor-summary");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { setFilter } = list;
  const handleSearch = useCallback((term) => setFilter("search", term), [setFilter]);

  function handleCreated(created) {
    setIsCreateOpen(false);
    list.resource.reload();
    summary.reload();
    onNotify(created?.name ? `Subcontractor ${created.name} added.` : "Subcontractor added.");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          label="Search subcontractors"
          value={list.filters.search}
          onSearch={handleSearch}
          placeholder="Search by contractor name or code..."
          className="w-full sm:w-[318px]"
        />
        <PrimaryActionButton onClick={() => setIsCreateOpen(true)}>Add Subcontractor</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <SubcontractorTable subcontractors={list.items} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="subcontractors" onPageChange={list.setPage} />
      </Panel>

      <SummaryCards resource={summary} cards={SUMMARY_CARDS} />

      {isCreateOpen && <AddSubcontractorModal onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default SubcontractorsPage;
