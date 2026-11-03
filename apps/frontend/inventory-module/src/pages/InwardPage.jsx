import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../components/ui/DataTable.jsx";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import AddInwardModal from "../features/inward/components/AddInwardModal.jsx";
import { inwardService } from "../features/inward/services/inwardService.js";
import { itemService } from "../features/items/services/itemService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import { useListQuery } from "../hooks/useListQuery.js";
import { usePageSearch } from "../hooks/usePageSearch.jsx";

const fetchInward = (params) => inwardService.getInwardEntries(params);

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "Current period" },
  { value: "30d", label: "Last 30 days" },
  { value: "60d", label: "Last 60 days" },
  { value: "quarter", label: "Last quarter" },
];

const COLUMNS = [
  { key: "date", header: "Date", width: "100px", render: (row) => row.date },
  { key: "grnNo", header: "GRN No", width: "120px", cellClass: "font-bold text-navy", render: (row) => row.grnNo },
  { key: "supplier", header: "Supplier", cellClass: "text-ink", render: (row) => row.supplier },
  {
    key: "totalItems",
    header: "Items",
    width: "80px",
    align: "right",
    render: (row) => `${row.totalItems} items`,
  },
  { key: "warehouseName", header: "Warehouse", width: "140px", render: (row) => row.warehouseName },
];

export default function InwardPage({ onShowToast }) {
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { search } = usePageSearch();

  const warehouseOptions = useMemo(
    () => [{ value: "", label: "All" }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))],
    [warehouses],
  );

  const query = useListQuery(fetchInward, { search, warehouseId: selectedWarehouse || undefined, dateRange });
  const entries = query.data;
  const { reload } = query;

  // The modal's reference data does not depend on the search term, so load it once.
  useEffect(() => {
    let active = true;
    Promise.all([warehouseService.getWarehouses(), itemService.getItems()])
      .then(([whRes, itmRes]) => {
        if (!active) return;
        setWarehouses(whRes.data || []);
        setItems(itmRes.data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const listResource = useMemo(
    () => ({ status: query.status, error: query.error, reload }),
    [query.status, query.error, reload],
  );

  function handleCreated() {
    setIsModalOpen(false);
    onShowToast?.("Goods inward recorded and stock updated!", "success");
    reload();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="sr-only">Inward Management</h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Warehouse" value={selectedWarehouse} options={warehouseOptions} onChange={setSelectedWarehouse} />
          <FilterSelect label="Date range" value={dateRange} options={DATE_RANGE_OPTIONS} onChange={setDateRange} />
        </div>
        <PrimaryActionButton onClick={() => setIsModalOpen(true)}>Add New Inward</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <DataTable
          caption="Recent inward entries"
          columns={COLUMNS}
          rows={entries}
          getRowKey={(row) => row.id}
          resource={listResource}
          minWidth={770}
          emptyTitle="No inward entries"
          emptyMessage={search ? "No entries match your search." : "Record a goods receipt with Add New Inward."}
        />
        <ListFooter itemCount={entries.length} noun="entries" />
      </Panel>

      <AddInwardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
        warehouses={warehouses}
        items={items}
      />
    </div>
  );
}
