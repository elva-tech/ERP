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
    render: (item) => item.currentStock.toLocaleString(),
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await itemService.getItems({ search, category, status });
      setItems(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  }, [search, category, status]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const listResource = useMemo(
    () => ({
      status: loading ? "loading" : error ? "error" : "success",
      error,
      reload: fetchItems,
    }),
    [loading, error, fetchItems],
  );

  function handleItemCreated(created) {
    setIsModalOpen(false);
    const code = created?.itemCode ?? created?.data?.itemCode;
    onShowToast?.(code ? `Item ${code} created successfully!` : "Item created successfully!", "success");
    fetchItems();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="sr-only">Item Master</h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search item code, name or HSN…"
            label="Search items"
            className="min-w-[220px] flex-1 sm:max-w-[320px]"
          />
          <FilterSelect label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
          <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        </div>
        <PrimaryActionButton onClick={() => setIsModalOpen(true)}>+ Add Item</PrimaryActionButton>
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
        <ListFooter itemCount={items.length} noun="items" />
      </Panel>

      <AddItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={handleItemCreated} />
    </div>
  );
}
