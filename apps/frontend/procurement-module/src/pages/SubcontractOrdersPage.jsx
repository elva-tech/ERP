import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import StatusTabs from "../components/ui/StatusTabs.jsx";
import { useServerList } from "../hooks/useServerList.js";
import SubcontractOrderTable from "../features/subcontract-orders/components/SubcontractOrderTable.jsx";
import { listSubcontractOrders } from "../features/subcontract-orders/subcontractOrderService.js";
import { SUBCONTRACT_ORDER_STATUS_TABS } from "../features/subcontract-orders/subcontractOrderStatus.js";

function SubcontractOrdersPage() {
  const list = useServerList(listSubcontractOrders, { status: "active" });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusTabs
          ariaLabel="Filter subcontract orders by status"
          tabs={SUBCONTRACT_ORDER_STATUS_TABS}
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
        />
        <PrimaryActionButton disabled title="The Create Order form has not been designed yet.">
          Create Order
        </PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <SubcontractOrderTable orders={list.items} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="orders" onPageChange={list.setPage} />
      </Panel>
    </div>
  );
}

export default SubcontractOrdersPage;
