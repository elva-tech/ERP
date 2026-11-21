import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "../components/ui/DataTable.jsx";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import DateRangeFilter from "../components/ui/DateRangeFilter.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import AddOutwardModal from "../features/outward/components/AddOutwardModal.jsx";
import { itemService } from "../features/items/services/itemService.js";
import { outwardService } from "../features/outward/services/outwardService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import { isWithinDateRange } from "../lib/dateUtils.js";

const COLUMNS = [
  { key: "date", header: "Date", width: "100px", render: (row) => row.date },
  {
    key: "deliveryNoteNo",
    header: "Delivery Note No",
    width: "140px",
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
];

export default function OutwardPage({ onShowToast }) {
  const [entries, setEntries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
          startDate: startDate || undefined,
          endDate: endDate || undefined,
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
  }, [selectedWarehouse, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayedEntries = useMemo(() => {
    return entries.filter((row) => isWithinDateRange(row.date, startDate, endDate));
  }, [entries, startDate, endDate]);

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
    window.dispatchEvent(new CustomEvent("inventory:stock-updated"));
    fetchData();
  }

  function handleClearDateRange() {
    setStartDate("");
    setEndDate("");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="sr-only">Outward Management</h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Warehouse"
            value={selectedWarehouse}
            options={warehouseOptions}
            onChange={setSelectedWarehouse}
          />
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={handleClearDateRange}
          />
        </div>
        <PrimaryActionButton onClick={() => setIsModalOpen(true)}>Add New Outward</PrimaryActionButton>
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        <DataTable
          caption="Recent outward entries"
          columns={COLUMNS}
          rows={displayedEntries}
          getRowKey={(row) => row.id}
          resource={listResource}
          minWidth={880}
          emptyTitle="No outward entries"
          emptyMessage="Record a dispatch with Add New Outward or adjust filters."
        />
        <ListFooter itemCount={displayedEntries.length} noun="entries" />
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
