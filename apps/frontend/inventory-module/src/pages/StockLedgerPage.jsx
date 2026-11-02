import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Download, Printer, Filter, Calendar } from "lucide-react";
import { ledgerService } from "../features/ledger/services/ledgerService.js";
import { itemService } from "../features/items/services/itemService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import DateRangeFilter from "../components/ui/DateRangeFilter.jsx";
import Badge from "../components/ui/Badge.jsx";
import Panel from "../components/ui/Panel.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { isWithinDateRange } from "../lib/dateUtils.js";

export default function StockLedgerPage({ onShowToast }) {
  const [entries, setEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedItem, setSelectedItem] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ledRes, itmRes, whRes] = await Promise.all([
        ledgerService.getLedger({
          itemId: selectedItem !== "all" ? selectedItem : undefined,
          warehouseId: selectedWarehouse !== "all" ? selectedWarehouse : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        itemService.getItems(),
        warehouseService.getWarehouses(),
      ]);
      setEntries(ledRes.data || []);
      setItems(itmRes.data || []);
      setWarehouses(whRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load stock ledger");
    } finally {
      setLoading(false);
    }
  }, [selectedItem, selectedWarehouse, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time refresh when stock updates occur
  useEffect(() => {
    const handleStockUpdate = () => {
      fetchData();
    };
    window.addEventListener("inventory:stock-updated", handleStockUpdate);
    return () => {
      window.removeEventListener("inventory:stock-updated", handleStockUpdate);
    };
  }, [fetchData]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchType = selectedType === "all" || e.type.toLowerCase() === selectedType.toLowerCase();
      const matchDate = isWithinDateRange(e.date, startDate, endDate);
      return matchType && matchDate;
    });
  }, [entries, selectedType, startDate, endDate]);

  // Compute KPI summary
  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredEntries.forEach((e) => {
      totalIn += Number(e.quantityIn || 0);
      totalOut += Number(e.quantityOut || 0);
    });
    const latestBalance = filteredEntries.length > 0 ? filteredEntries[0].balance : 0;
    const openingBalance =
      filteredEntries.length > 0
        ? filteredEntries[filteredEntries.length - 1].balance -
          (filteredEntries[filteredEntries.length - 1].quantityIn || 0) +
          (filteredEntries[filteredEntries.length - 1].quantityOut || 0)
        : 0;

    return {
      openingBalance: Math.max(0, openingBalance),
      totalIn,
      totalOut,
      closingBalance: latestBalance,
    };
  }, [filteredEntries]);

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      onShowToast && onShowToast("No ledger entries to export", "neutral");
      return;
    }
    const headers = [
      "Date",
      "Voucher No",
      "Type",
      "Item Code",
      "Item Name",
      "Warehouse",
      "In",
      "Out",
      "Balance",
      "Reference",
    ];
    const rows = filteredEntries.map((e) => [
      e.date,
      e.voucherNo,
      e.type,
      e.itemCode,
      `"${e.itemName.replace(/"/g, '""')}"`,
      `"${e.warehouseName}"`,
      e.quantityIn || 0,
      e.quantityOut || 0,
      e.balance,
      `"${(e.reference || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast && onShowToast("Stock ledger exported to CSV successfully!", "success");
  };

  const handlePrint = () => {
    window.print();
  };

  function handleClearDateRange() {
    setStartDate("");
    setEndDate("");
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="sr-only">Stock Ledger</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            Historical ledger of all inventory inflows, outflows, and running balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-ink-secondary bg-white hover:bg-slate-50 transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Print Ledger
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
              Select Item
            </label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              <option value="all">All Items</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.itemCode} - {i.itemName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
              Warehouse Location
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
              Transaction Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              <option value="all">All Transaction Types</option>
              <option value="inward">Inward (+)</option>
              <option value="outward">Outward (-)</option>
              <option value="transfer">Stock Transfer</option>
              <option value="adjustment">Reconciliation / Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
              Date Filter
            </label>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClear={handleClearDateRange}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Opening Balance"
          value={`${summary.openingBalance.toLocaleString()} units`}
          footnote={<p className="mt-1 text-[11px] leading-4 text-muted">At start of selected period</p>}
        />
        <StatCard
          label="Total Inflow"
          value={`+${summary.totalIn.toLocaleString()}`}
          tone="success"
          footnote={<p className="mt-1 text-[11px] leading-4 text-muted">Receipts & inwards</p>}
        />
        <StatCard
          label="Total Outflow"
          value={`-${summary.totalOut.toLocaleString()}`}
          tone="warning"
          footnote={<p className="mt-1 text-[11px] leading-4 text-muted">Issues & dispatches</p>}
        />
        <StatCard
          label="Closing Balance"
          value={`${summary.closingBalance.toLocaleString()} units`}
          tone="brand"
          footnote={<p className="mt-1 text-[11px] leading-4 text-muted">Current on-hand stock</p>}
        />
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink text-sm">Movement Entries</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredEntries.length} transactions
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-muted">Loading stock ledger records...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50 m-4 rounded-lg">{error}</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">No stock movements found matching filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-right">Qty In (+)</th>
                  <th className="py-3 px-4 text-right">Qty Out (-)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                  <th className="py-3 px-4">Reference / Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-xs text-ink-muted whitespace-nowrap">{row.date}</td>
                    <td className="py-3 px-4 font-mono font-medium text-action-navy whitespace-nowrap">
                      {row.voucherNo}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          row.type === "Inward"
                            ? "success"
                            : row.type === "Outward"
                            ? "warning"
                            : row.type === "Transfer"
                            ? "default"
                            : "outline"
                        }
                      >
                        {row.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-ink">{row.itemName}</div>
                      <div className="text-xs text-ink-muted font-mono">{row.itemCode}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-ink">{row.warehouseName}</td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600">
                      {row.quantityIn > 0 ? `+${row.quantityIn.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-amber-600">
                      {row.quantityOut > 0 ? `-${row.quantityOut.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-ink">
                      {row.balance !== undefined ? row.balance.toLocaleString() : "—"} {row.unit || "units"}
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-muted max-w-xs truncate">{row.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
