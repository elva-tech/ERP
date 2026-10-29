import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "../components/ui/Badge.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import AddOutwardModal from "../features/outward/components/AddOutwardModal.jsx";
import { itemService } from "../features/items/services/itemService.js";
import { outwardService } from "../features/outward/services/outwardService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";

const OUTWARD_STATUS_BADGES = {
  Dispatched: { label: "Dispatched", tone: "success" },
  Delivered: { label: "Delivered", tone: "info" },
  Draft: { label: "Draft", tone: "warning" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "Dispatched", label: "Dispatched" },
  { value: "Delivered", label: "Delivered" },
  { value: "Draft", label: "Draft" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "Current period" },
  { value: "30d", label: "Last 30 days" },
  { value: "60d", label: "Last 60 days" },
];

const COLUMNS = [
  { key: "date", header: "Date", width: "100px", render: (row) => row.date },
  {
    key: "deliveryNoteNo",
    header: "Delivery Note No",
    width: "130px",
    cellClass: "font-bold text-navy",
    render: (row) => row.deliveryNoteNo,
  },
  { key: "destination", header: "Customer / Department", cellClass: "text-ink", render: (row) => row.destination },
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
    render: (row) => <StatusBadge status={row.status} statusMap={OUTWARD_STATUS_BADGES} className="w-full" />,
  },
];

export default function OutwardPage({ onShowToast }) {
  const [entries, setEntries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
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
      const [outRes, whRes, itmRes] = await Promise.all([
        outwardService.getOutwardEntries({
          warehouseId: selectedWarehouse || undefined,
          status: selectedStatus || undefined,
        }),
        warehouseService.getWarehouses(),
        itemService.getItems(),
      ]);
      setEntries(outRes.data || []);
      setWarehouses(whRes.data || []);
      setItems(itmRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load outward entries");
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, selectedStatus]);

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
    onShowToast?.("Stock dispatched and balances updated!", "success");
    fetchData();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="sr-only">Outward Management</h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Warehouse" value={selectedWarehouse} options={warehouseOptions} onChange={setSelectedWarehouse} />
          <FilterSelect label="Date range" value={dateRange} options={DATE_RANGE_OPTIONS} onChange={setDateRange} />
          <FilterSelect label="Status" value={selectedStatus} options={STATUS_FILTER_OPTIONS} onChange={setSelectedStatus} />
        </div>
        <PrimaryActionButton onClick={() => setIsModalOpen(true)}>Add New Outward</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <DataTable
          caption="Recent outward entries"
          columns={COLUMNS}
          rows={entries}
          getRowKey={(row) => row.id}
          resource={listResource}
          minWidth={920}
          emptyTitle="No outward entries"
          emptyMessage="Record a dispatch with Add New Outward."
        />
        <ListFooter itemCount={entries.length} noun="entries" />
      </Panel>

      <AddOutwardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
        warehouses={warehouses}
        items={items}
      />
    </div>
  );
}
