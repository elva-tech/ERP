import { useState } from "react";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import StatusTabs from "../components/ui/StatusTabs.jsx";
import { useServerList } from "../hooks/useServerList.js";
import CreatePurchaseOrderModal from "../features/purchase-orders/components/CreatePurchaseOrderModal.jsx";
import PurchaseOrderTable from "../features/purchase-orders/components/PurchaseOrderTable.jsx";
import { listPurchaseOrders } from "../features/purchase-orders/purchaseOrderService.js";
import { PURCHASE_ORDER_STATUS_TABS } from "../features/purchase-orders/purchaseOrderStatus.js";

function PurchaseOrdersPage({ onNotify }) {
  const list = useServerList(listPurchaseOrders, { status: "sent" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  function handleCreated(order) {
    setIsCreateOpen(false);
    list.resource.reload();
    onNotify(order?.orderNumber ? `Purchase order ${order.orderNumber} created.` : "Purchase order created.");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusTabs
          ariaLabel="Filter purchase orders by status"
          tabs={PURCHASE_ORDER_STATUS_TABS}
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
        />
        <PrimaryActionButton onClick={() => setIsCreateOpen(true)}>+ Create PO</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <PurchaseOrderTable orders={list.items} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="purchase orders" onPageChange={list.setPage} />
      </Panel>

      {isCreateOpen && <CreatePurchaseOrderModal onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default PurchaseOrdersPage;
