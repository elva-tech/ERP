import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "../components/ui/Badge.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import AddInwardModal from "../features/inward/components/AddInwardModal.jsx";
import { inwardService } from "../features/inward/services/inwardService.js";
import { itemService } from "../features/items/services/itemService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";

const INWARD_STATUS_BADGES = {
  Received: { label: "Received", tone: "success" },
  Draft: { label: "Draft", tone: "warning" },
  Pending: { label: "Pending", tone: "info" },
};

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "Current period" },
  { value: "30d", label: "Last 30 days" },
  { value: "60d", label: "Last 60 days" },
  { value: "90d", label: "Last quarter" },
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
  {
    key: "status",
    header: "Status",
    width: "110px",
    render: (row) => <StatusBadge status={row.status} statusMap={INWARD_STATUS_BADGES} className="w-full" />,
  },
];

export default function InwardPage({ onShowToast }) {
  const [entries, setEntries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const warehouseOptions = useMemo(
    () => [{ value: "", label: "All" }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))],
    [warehouses],
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [inwRes, whRes, itmRes] = await Promise.all([
        inwardService.getInwardEntries({
          warehouseId: selectedWarehouse || undefined,
        }),
        warehouseService.getWarehouses(),
        itemService.getItems(),
      ]);
      setEntries(inwRes.data || []);
      setWarehouses(whRes.data || []);
      setItems(itmRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load inward entries");
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const listResource = useMemo(
    () => ({
      status: loading ? "loading" : error ? "error" : "success",
      error,
      reload: fetchData,
    }),
    [loading, error, fetchData],
  );

  function handleCreated() {
    setIsModalOpen(false);
    onShowToast?.("Goods inward recorded and stock updated!", "success");
    fetchData();
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
          minWidth={880}
          emptyTitle="No inward entries"
          emptyMessage="Record a goods receipt with Add New Inward."
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
