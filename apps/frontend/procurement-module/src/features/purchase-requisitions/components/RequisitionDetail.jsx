import { useState } from "react";
import { Check, X } from "lucide-react";
import { ResourceBoundary } from "../../../components/ui/AsyncState.jsx";
import { StatusBadge } from "../../../components/ui/Badge.jsx";
import DataTable from "../../../components/ui/DataTable.jsx";
import { ActionButton, BackButton, DetailHeader, DetailSection, FieldGrid, TotalsList } from "../../../components/ui/DetailParts.jsx";
import { useAsyncResource } from "../../../hooks/useAsyncResource.js";
import { displayText, formatDate, formatDateTime, formatInr } from "../../../lib/formatters.js";
import ApprovalDecisionModal from "../../approvals/components/ApprovalDecisionModal.jsx";
import { getPurchaseRequisition } from "../purchaseRequisitionService.js";
import { REQUISITION_PRIORITY_BADGES, REQUISITION_STATUS_BADGES } from "../requisitionStatus.js";

const DECISION_BADGES = {
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

const ITEM_COLUMNS = [
  { key: "description", header: "Item Description", cellClass: "font-semibold text-ink", render: (i) => displayText(i.description) },
  { key: "quantity", header: "Quantity", width: "110px", align: "right", headerClass: "pr-6", cellClass: "pr-6 text-ink", render: (i) => displayText(i.quantity) },
  { key: "unit", header: "Unit", width: "110px", render: (i) => displayText(i.unitLabel) },
  { key: "cost", header: "Est. Cost", width: "140px", align: "right", cellClass: "font-bold text-ink", render: (i) => formatInr(i.estimatedCost) },
];

const HISTORY_COLUMNS = [
  { key: "decision", header: "Decision", width: "120px", cellClass: "", render: (h) => <StatusBadge status={h.decision} statusMap={DECISION_BADGES} /> },
  { key: "by", header: "Decided By", width: "180px", cellClass: "font-semibold text-ink", render: (h) => displayText(h.decidedBy?.displayName) },
  { key: "at", header: "Date", width: "190px", render: (h) => formatDateTime(h.decidedAt) },
  { key: "comment", header: "Comment", truncate: false, cellClass: "py-2 text-ink", render: (h) => displayText(h.comment) },
];

function RequisitionDetail({ id, onNotify }) {
  const resource = useAsyncResource((signal) => getPurchaseRequisition(id, signal), `purchase-requisition:${id}`);
  const [decision, setDecision] = useState(null);
  const pr = resource.data;

  function handleDecided() {
    const label = decision === "approved" ? "approved" : "rejected";
    setDecision(null);
    resource.reload();
    onNotify(`Requisition ${pr.requisitionNumber} ${label}.`);
  }

  if (!pr) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <BackButton />
        </div>
        <ResourceBoundary resource={resource} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DetailHeader
        title={`Purchase Requisition ${displayText(pr.requisitionNumber)}`}
        subtitle={pr.title}
        badge={<StatusBadge status={pr.status} statusMap={REQUISITION_STATUS_BADGES} />}
        actions={
          pr.pendingApproval && (
            <>
              <ActionButton tone="danger" icon={X} onClick={() => setDecision("rejected")}>
                Reject
              </ActionButton>
              <ActionButton tone="success" icon={Check} onClick={() => setDecision("approved")}>
                Approve
              </ActionButton>
            </>
          )
        }
      />

      <DetailSection title="Requisition Details">
        <FieldGrid
          fields={[
            { label: "PR Number", value: displayText(pr.requisitionNumber) },
            { label: "Request Date", value: formatDate(pr.requestDate) },
            { label: "Required By", value: formatDate(pr.requiredDate) },
            { label: "Status", value: <StatusBadge status={pr.status} statusMap={REQUISITION_STATUS_BADGES} /> },
            { label: "Requested By", value: displayText(pr.requestedBy?.displayName) },
            { label: "Department", value: displayText(pr.departmentName) },
            { label: "Priority", value: <StatusBadge status={pr.priority} statusMap={REQUISITION_PRIORITY_BADGES} /> },
            { label: "Approver", value: displayText(pr.approver?.displayName) },
            { label: "Estimated Amount", value: <span className="font-bold">{formatInr(pr.estimatedAmount)}</span> },
            { label: "Purchase Order", value: displayText(pr.purchaseOrder?.orderNumber) },
            { label: "Title", value: displayText(pr.title), wide: true },
            { label: "Justification", value: displayText(pr.justification), wide: true },
          ]}
        />
      </DetailSection>

      <DetailSection title="Items">
        <DataTable caption="Requisition items" columns={ITEM_COLUMNS} rows={(pr.items ?? []).map((item, index) => ({ ...item, rowKey: String(index) }))} getRowKey={(row) => row.rowKey} minWidth={560} emptyTitle="No items" />
        <TotalsList rows={[{ label: "Estimated Amount", value: formatInr(pr.estimatedAmount), strong: true }]} />
      </DetailSection>

      <DetailSection title="Approval History">
        <DataTable
          caption="Approval history"
          columns={HISTORY_COLUMNS}
          rows={pr.approvalHistory ?? []}
          getRowKey={(row) => row.id}
          minWidth={640}
          emptyTitle="No decisions yet"
          emptyMessage={pr.pendingApproval ? "This requisition is waiting for approval." : undefined}
        />
      </DetailSection>

      {decision && (
        <ApprovalDecisionModal
          approval={{
            id: pr.pendingApproval.id,
            version: pr.pendingApproval.version,
            documentTypeLabel: "Purchase Requisition",
            document: { number: pr.requisitionNumber },
            amount: pr.estimatedAmount,
          }}
          decision={decision}
          onClose={() => setDecision(null)}
          onDecided={handleDecided}
        />
      )}
    </div>
  );
}

export default RequisitionDetail;
