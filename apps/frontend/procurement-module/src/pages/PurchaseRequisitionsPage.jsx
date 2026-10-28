import { useState } from "react";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import StatusTabs from "../components/ui/StatusTabs.jsx";
import { useServerList } from "../hooks/useServerList.js";
import NewRequisitionModal from "../features/purchase-requisitions/components/NewRequisitionModal.jsx";
import RequisitionTable from "../features/purchase-requisitions/components/RequisitionTable.jsx";
import { listPurchaseRequisitions } from "../features/purchase-requisitions/purchaseRequisitionService.js";
import { REQUISITION_STATUS_TABS } from "../features/purchase-requisitions/requisitionStatus.js";

function PurchaseRequisitionsPage({ onNotify }) {
  const list = useServerList(listPurchaseRequisitions, { status: "pending_approval" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  function handleCreated(requisition) {
    setIsCreateOpen(false);
    list.resource.reload();
    onNotify(
      requisition?.requisitionNumber
        ? `Requisition ${requisition.requisitionNumber} submitted for approval.`
        : "Requisition submitted for approval.",
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusTabs
          ariaLabel="Filter requisitions by status"
          tabs={REQUISITION_STATUS_TABS}
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
        />
        <PrimaryActionButton onClick={() => setIsCreateOpen(true)}>+ New PR</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <RequisitionTable requisitions={list.items} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="requisitions" onPageChange={list.setPage} />
      </Panel>

      {isCreateOpen && <NewRequisitionModal onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default PurchaseRequisitionsPage;
