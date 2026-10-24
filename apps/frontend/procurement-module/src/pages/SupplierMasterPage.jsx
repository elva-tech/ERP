import { useState } from "react";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import { useLookupOptions, withAllOption } from "../hooks/useLookupOptions.js";
import { useServerList } from "../hooks/useServerList.js";
import AddSupplierModal from "../features/suppliers/components/AddSupplierModal.jsx";
import SupplierStatusChangeModal from "../features/suppliers/components/SupplierStatusChangeModal.jsx";
import SupplierTable from "../features/suppliers/components/SupplierTable.jsx";
import { listSuppliers } from "../features/suppliers/supplierService.js";
import { SUPPLIER_STATUS, SUPPLIER_STATUS_FILTER_OPTIONS } from "../features/suppliers/supplierStatus.js";

function SupplierMasterPage({ onNotify }) {
  const list = useServerList(listSuppliers, { categoryId: "", status: SUPPLIER_STATUS.active });
  const categories = useLookupOptions("supplierCategories");
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [statusChangeSupplier, setStatusChangeSupplier] = useState(null);

  function handleCreated(supplier) {
    setIsAddSupplierOpen(false);
    list.resource.reload();
    onNotify(supplier?.name ? `Supplier ${supplier.name} created.` : "Supplier created.");
  }

  function handleStatusChanged(message) {
    setStatusChangeSupplier(null);
    list.resource.reload();
    onNotify(message);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Category"
            value={list.filters.categoryId}
            options={withAllOption(categories.options)}
            onChange={(value) => list.setFilter("categoryId", value)}
          />
          <FilterSelect
            label="Status"
            value={list.filters.status}
            options={SUPPLIER_STATUS_FILTER_OPTIONS}
            onChange={(value) => list.setFilter("status", value)}
          />
        </div>
        <PrimaryActionButton onClick={() => setIsAddSupplierOpen(true)}>+ Add Supplier</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <SupplierTable
          suppliers={list.items}
          resource={list.resource}
          onRequestStatusChange={setStatusChangeSupplier}
        />
        <ListFooter
          pagination={list.pagination}
          itemCount={list.items.length}
          noun="suppliers"
          onPageChange={list.setPage}
        />
      </Panel>

      {isAddSupplierOpen && (
        <AddSupplierModal onClose={() => setIsAddSupplierOpen(false)} onCreated={handleCreated} />
      )}
      {statusChangeSupplier && (
        <SupplierStatusChangeModal
          supplier={statusChangeSupplier}
          onClose={() => setStatusChangeSupplier(null)}
          onChanged={handleStatusChanged}
        />
      )}
    </div>
  );
}

export default SupplierMasterPage;
