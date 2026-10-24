import { useState } from "react";
import { Calendar, Download } from "lucide-react";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import OutlineButton from "../components/ui/OutlineButton.jsx";
import Panel from "../components/ui/Panel.jsx";
import { useServerList } from "../hooks/useServerList.js";
import { downloadFile } from "../lib/downloadFile.js";
import ApprovalHistoryTable from "../features/approvals/components/ApprovalHistoryTable.jsx";
import { exportApprovalHistory, listApprovalHistory } from "../features/approvals/approvalService.js";
import {
  APPROVAL_DATE_RANGE_OPTIONS,
  APPROVAL_DECISION_FILTER_OPTIONS,
  APPROVAL_TYPE_FILTER_OPTIONS,
} from "../features/approvals/approvalOptions.js";

function ApprovalHistoryPage({ onNotify }) {
  const list = useServerList(listApprovalHistory, { documentType: "", decision: "", dateRange: "last_30_days" });
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const { documentType, decision, dateRange } = list.filters;
      downloadFile(await exportApprovalHistory({ documentType, decision, dateRange }), "approval-history.xlsx");
      onNotify("Approval history exported.");
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Type"
            value={list.filters.documentType}
            options={APPROVAL_TYPE_FILTER_OPTIONS}
            onChange={(value) => list.setFilter("documentType", value)}
          />
          <FilterSelect
            label="Status"
            value={list.filters.decision}
            options={APPROVAL_DECISION_FILTER_OPTIONS}
            onChange={(value) => list.setFilter("decision", value)}
          />
          <FilterSelect
            label="Date"
            icon={Calendar}
            value={list.filters.dateRange}
            options={APPROVAL_DATE_RANGE_OPTIONS}
            onChange={(value) => list.setFilter("dateRange", value)}
          />
        </div>
        <OutlineButton icon={Download} onClick={handleExport} disabled={isExporting}>
          {isExporting ? "Exporting…" : "Export History"}
        </OutlineButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <ApprovalHistoryTable entries={list.items} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="decisions" onPageChange={list.setPage} />
      </Panel>
    </div>
  );
}

export default ApprovalHistoryPage;
