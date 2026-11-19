
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "../components/ui/Badge.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import SearchInput from "../components/ui/SearchInput.jsx";
import AddItemModal from "../features/items/components/AddItemModal.jsx";
import { itemService } from "../features/items/services/itemService.js";
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
    width: "11%",
    cellClass: "font-bold text-navy",
    render: (item) => item.itemCode,
  },
  {
    key: "itemName",
    header: "Item Name",
    width: "27%",
    cellClass: "font-medium text-ink",
    render: (item) => item.itemName,
  },
  {
    key: "category",
    header: "Category",
    width: "14%",
    render: (item) => item.category,
  },
  {
    key: "unit",
    header: "Unit",
    width: "6%",
    render: (item) => item.unit,
  },
  {
    key: "hsnCode",
    header: "HSN",
    width: "9%",
    cellClass: "font-mono",
    render: (item) => item.hsnCode,
  },
  {
    key: "currentStock",
    header: "Current Stock",
    width: "12%",
    align: "right",
    cellClass: "font-semibold text-ink",
    render: (item) => Number(item.currentStock ?? 0).toLocaleString("en-IN"),
  },
  {
    key: "reorderLevel",
    header: "Reorder",
    width: "9%",
    align: "right",
    cellClass: "text-muted",
    render: (item) => Number(item.reorderLevel ?? 0).toLocaleString("en-IN"),
  },
  {
    key: "status",
    header: "Status",
    width: "12%",
    align: "center",
    render: (item) => (
      <div className="w-full">
        <StatusBadge status={item.status} statusMap={ITEM_STATUS_BADGES} className="w-full" />
      </div>
    ),
  },
];
export default function ItemMasterPage({ onShowToast }) {
  const { search, setSearch } = usePageSearch();
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const query = useListQuery(fetchItems, { search, category, status, page, limit: PAGE_SIZE });
  const items = query.data ?? [];
  const { response, reload } = query;
  const pagination = useMemo(() => {
    const pageSize = response?.pagination?.limit ?? response?.pagination?.pageSize ?? PAGE_SIZE;
    const totalItems = response?.pagination?.total ?? response?.pagination?.totalItems ?? response?.total;
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
  }, [search]);
  const handleCategory = useCallback((value) => {
    setCategory(value);
    setPage(1);
  }, []);
  const handleStatus = useCallback((value) => {
    setStatus(value);
    setPage(1);
  }, []);
  const listResource = useMemo(
    () => ({ status: query.status, error: query.error, reload }),
    [query.status, query.error, reload],
  );
  function handleItemCreated(created) {
    setIsModalOpen(false);
    const code = created?.itemCode ?? created?.data?.itemCode;
    onShowToast?.(code ? `Item ${code} created successfully!` : "Item created successfully!", "success");
    reload();
  }
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <h2 className="sr-only">Item Master</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <SearchInput value={search} onSearch={setSearch} placeholder="Search item code, name or HSN…" label="Search items" className="min-w-[220px] flex-1 sm:max-w-[320px]" />
          <FilterSelect label="Category" value={category} options={CATEGORY_OPTIONS} onChange={handleCategory} />
          <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={handleStatus} />
        </div>
        <PrimaryActionButton onClick={() => setIsModalOpen(true)}>Add Item</PrimaryActionButton>
      </div>
      <Panel className="min-w-0 flex-1 px-[15px] pb-4 pt-4">
        <DataTable
          caption="Item master"
          columns={ITEM_COLUMNS}
          rows={items}
          getRowKey={(item) => item.id ?? item.itemCode}
          resource={listResource}
          layout="grid"
          minWidth={0}
          emptyTitle="No items found"
          emptyMessage="Try adjusting your search or filters."
        />
        <ListFooter pagination={pagination} itemCount={items.length} noun="items" onPageChange={setPage} />
      </Panel>
      <AddItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={handleItemCreated} />
    </div>
  );
}
