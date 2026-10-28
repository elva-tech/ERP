import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import SummaryCards from "../components/ui/SummaryCards.jsx";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { useServerList } from "../hooks/useServerList.js";
import { formatInrCompact } from "../lib/formatters.js";
import SubcontractBillTable from "../features/subcontract-bills/components/SubcontractBillTable.jsx";
import { getSubcontractBillSummary, listSubcontractBills } from "../features/subcontract-bills/subcontractBillService.js";
import { SUBCONTRACT_BILL_STATUS_FILTER_OPTIONS } from "../features/subcontract-bills/subcontractBillStatus.js";

const lakhs = (amount) => formatInrCompact(amount, { unit: "lakh", fractionDigits: 2 });

const SUMMARY_CARDS = [
  { key: "month", label: "Total Bills This Month", format: (s) => lakhs(s.billedThisMonth) },
  { key: "pending", label: "Pending Verification", tone: "warning", format: (s) => String(s.pendingVerificationCount ?? "—") },
  { key: "approved", label: "Approved for Payment", tone: "success", format: (s) => lakhs(s.approvedForPayment) },
  { key: "retention", label: "Total Retention Held", format: (s) => lakhs(s.retentionHeld) },
];

function SubcontractBillsPage() {
  const list = useServerList(listSubcontractBills, { status: "" });
  const summary = useAsyncResource(getSubcontractBillSummary, "subcontract-bill-summary");
  const retentionRatePercent = list.resource.status === "success" ? list.resource.data?.retentionRatePercent : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <SummaryCards resource={summary} cards={SUMMARY_CARDS} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterSelect
          label="Status"
          value={list.filters.status}
          options={SUBCONTRACT_BILL_STATUS_FILTER_OPTIONS}
          onChange={(value) => list.setFilter("status", value)}
        />
        <PrimaryActionButton disabled title="The Record Bill form has not been designed yet.">
          Record Bill
        </PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <SubcontractBillTable bills={list.items} retentionRatePercent={retentionRatePercent} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="bills" onPageChange={list.setPage} />
      </Panel>
    </div>
  );
}

export default SubcontractBillsPage;
