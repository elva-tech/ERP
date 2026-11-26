import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { StatusBadge } from "../components/ui/Badge.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import AddItemModal from "../features/items/components/AddItemModal.jsx";
import { itemService } from "../features/items/services/itemService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import { useListQuery } from "../hooks/useListQuery.js";
import { usePageSearch } from "../hooks/usePageSearch.jsx";

const PAGE_SIZE = 20;
const fetchItems = (params) => itemService.getItems(params);

const CATEGORY_OPTIONS = [
  { value: "", label: "All" },
  { value: "Cables & Wires", label: "Cables & Wires" },
  { value: "Switchgear", label: "Switchgear" },
  { value: "Distribution Panels", label: "Distribution Panels" },
  { value: "Transformers", label: "Transformers" },
  { value: "Conduits", label: "Conduits" },
  { value: "Earthing", label: "Earthing" },
  { value: "Meters", label: "Meters" },
  { value: "Accessories", label: "Accessories" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "In Stock", label: "In Stock" },
  { value: "Low Stock", label: "Low Stock" },
  { value: "Reorder", label: "Reorder" },
  { value: "Out of Stock", label: "Out of Stock" },
];

const ITEM_STATUS_BADGES = {
  "In Stock": { label: "In Stock", tone: "success" },
  "Low Stock": { label: "Low Stock", tone: "warning" },
  Reorder: { label: "Reorder", tone: "warningStrong" },
  "Out of Stock": { label: "Out of Stock", tone: "danger" },
};

const ITEM_COLUMNS = [
  {
    key: "itemCode",
    header: "Item Code",
    width: "110px",
    cellClass: "font-bold text-navy",
    render: (item) => item.itemCode,
  },
  { key: "itemName", header: "Item Name", cellClass: "text-ink font-medium", render: (item) => item.itemName },
  { key: "category", header: "Category", width: "140px", render: (item) => item.category },
  { key: "unit", header: "Unit", width: "70px", render: (item) => item.unit },
  { key: "hsnCode", header: "HSN", width: "90px", cellClass: "font-mono", render: (item) => item.hsnCode },
  {
    key: "currentStock",
    header: "Current Stock",
    width: "110px",
    align: "right",
    cellClass: "font-semibold text-ink",
    render: (item) => (item.currentStock ?? 0).toLocaleString(),
  },
  {
    key: "reorderLevel",
    header: "Reorder",
    width: "90px",
    align: "right",
    render: (item) => item.reorderLevel,
  },
  {
    key: "status",
    header: "Status",
    width: "120px",
    render: (item) => <StatusBadge status={item.status} statusMap={ITEM_STATUS_BADGES} className="w-full" />,
  },
];

export default function ItemMasterPage({ onShowToast }) {
  const { search } = usePageSearch();
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const query = useListQuery(fetchItems, {
    search,
    category,
    status,
    warehouseId: selectedWarehouse || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const items = query.data ?? [];
  const { response, reload, status: queryStatus, error } = query;

  const pagination = useMemo(() => {
    const pageSize = response?.pagination?.limit ?? response?.pagination?.pageSize ?? PAGE_SIZE;
    const totalItems = response?.pagination?.totalItems ?? response?.pagination?.total ?? response?.total;
    if (!Number.isFinite(totalItems)) return null;
    return {
      page: response?.pagination?.page ?? page,
      pageSize,
      totalItems,
      totalPages: response?.pagination?.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize)),
    };
  }, [response, page]);

  useEffect(() => {
    setPage(1);
  }, [search, category, status, selectedWarehouse]);

  useEffect(() => {
    let mounted = true;
    warehouseService.getWarehouses().then((res) => {
      if (mounted) setWarehouses(res?.data || []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const warehouseOptions = useMemo(
    () => [{ value: "", label: "All Warehouses" }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))],
    [warehouses],
  );

  useEffect(() => {
    const handleStockUpdate = () => reload();
    window.addEventListener("inventory:stock-updated", handleStockUpdate);
    return () => window.removeEventListener("inventory:stock-updated", handleStockUpdate);
  }, [reload]);

  const listResource = useMemo(
    () => ({
      status: queryStatus,
      error,
      reload,
    }),
    [queryStatus, error, reload],
  );

  function handleItemCreated(created) {
    setIsModalOpen(false);
    const code = created?.itemCode ?? created?.data?.itemCode;
    onShowToast?.(code ? `Item ${code} created successfully!` : "Item created successfully!", "success");
    window.dispatchEvent(new CustomEvent("inventory:stock-updated"));
    reload();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="sr-only">Item Master</h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <FilterSelect label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
          <FilterSelect label="Warehouse" value={selectedWarehouse} options={warehouseOptions} onChange={setSelectedWarehouse} />
          <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            disabled={queryStatus === "loading"}
            title="Refresh current stock"
            aria-label="Refresh stock"
            className="inline-flex h-[31px] shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[12px] font-semibold text-ink-soft transition-colors hover:bg-workspace hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={13} className={queryStatus === "loading" ? "animate-spin" : ""} aria-hidden="true" />
            Refresh
          </button>
          <PrimaryActionButton onClick={() => setIsModalOpen(true)}>Add Item</PrimaryActionButton>
        </div>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <DataTable
          caption="Item master"
          columns={ITEM_COLUMNS}
          rows={items}
          getRowKey={(item) => item.id}
          resource={listResource}
          minWidth={980}
          emptyTitle="No items found"
          emptyMessage="Try adjusting your search or filters."
        />
        <ListFooter
          pagination={pagination}
          itemCount={items.length}
          noun="items"
          onPageChange={setPage}
        />
      </Panel>

      <AddItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={handleItemCreated} />
    </div>
  );
}