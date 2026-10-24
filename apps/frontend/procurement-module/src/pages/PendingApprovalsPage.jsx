import { useEffect, useState } from "react";
import { ResourceBoundary } from "../components/ui/AsyncState.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import StatusTabs from "../components/ui/StatusTabs.jsx";
import { useServerList } from "../hooks/useServerList.js";
import ApprovalCard from "../features/approvals/components/ApprovalCard.jsx";
import ApprovalDecisionModal from "../features/approvals/components/ApprovalDecisionModal.jsx";
import { listPendingApprovals } from "../features/approvals/approvalService.js";
import { APPROVAL_TYPE_TABS } from "../features/approvals/approvalOptions.js";

function PendingApprovalsPage({ onNotify, onHeaderAdornmentChange }) {
  const list = useServerList(listPendingApprovals, { documentType: "" });
  const [decision, setDecision] = useState(null);
  const totalPending = list.resource.status === "success" ? (list.resource.data?.totalPending ?? null) : null;

  useEffect(() => {
    onHeaderAdornmentChange(totalPending);
  }, [totalPending, onHeaderAdornmentChange]);

  function handleDecided() {
    const { approval, decision: outcome } = decision;
    setDecision(null);
    list.resource.reload();
    onNotify(`${approval.document?.number ?? "Request"} ${outcome === "approved" ? "approved" : "rejected"}.`);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusTabs
          ariaLabel="Filter approvals by document type"
          tabs={APPROVAL_TYPE_TABS}
          value={list.filters.documentType}
          onChange={(value) => list.setFilter("documentType", value)}
        />
        <label
          title="Bulk approval rules have not been confirmed yet."
          className="inline-flex h-[31px] cursor-not-allowed items-center gap-2 rounded-md border border-line bg-surface px-3 text-[12px] font-semibold text-ink opacity-80"
        >
          <input type="checkbox" disabled className="size-[14px] rounded border-line" />
          Select All for Bulk Approval
        </label>
      </div>

      {list.resource.status === "success" && list.items.length > 0 ? (
        <div>
          <ul className="space-y-3">
            {list.items.map((approval) => (
              <li key={approval.id}>
                <ApprovalCard
                  approval={approval}
                  onApprove={(item) => setDecision({ approval: item, decision: "approved" })}
                  onReject={(item) => setDecision({ approval: item, decision: "rejected" })}
                />
              </li>
            ))}
          </ul>
          <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="requests" onPageChange={list.setPage} />
        </div>
      ) : (
        <Panel>
          <ResourceBoundary
            resource={list.resource}
            isEmpty={list.items.length === 0}
            emptyTitle="No pending approvals"
            emptyMessage="Requests routed to you will appear here."
          />
        </Panel>
      )}

      {decision && (
        <ApprovalDecisionModal
          approval={decision.approval}
          decision={decision.decision}
          onClose={() => setDecision(null)}
          onDecided={handleDecided}
        />
      )}
    </div>
  );
}

export default PendingApprovalsPage;
