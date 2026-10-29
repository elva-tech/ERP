import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Download, Printer, Filter, Calendar } from "lucide-react";
import { ledgerService } from "../features/ledger/services/ledgerService.js";
import { itemService } from "../features/items/services/itemService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import Badge from "../components/ui/Badge.jsx";
import Panel from "../components/ui/Panel.jsx";
import StatCard from "../components/ui/StatCard.jsx";

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
  const [dateRange, setDateRange] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ledRes, itmRes, whRes] = await Promise.all([
        ledgerService.getLedger({
          itemId: selectedItem !== "all" ? selectedItem : undefined,
          warehouseId: selectedWarehouse !== "all" ? selectedWarehouse : undefined,
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
  }, [selectedItem, selectedWarehouse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchType = selectedType === "all" || e.type.toLowerCase() === selectedType.toLowerCase();
      return matchType;
    });
  }, [entries, selectedType]);

  // Compute KPI summary
  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredEntries.forEach((e) => {
      totalIn += Number(e.quantityIn || 0);
      totalOut += Number(e.quantityOut || 0);
    });
    const latestBalance = filteredEntries.length > 0 ? filteredEntries[0].balance : 0;
    const openingBalance = filteredEntries.length > 0
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
    const headers = ["Date", "Voucher No", "Type", "Item Code", "Item Name", "Warehouse", "In", "Out", "Balance", "Reference"];
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
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast && onShowToast("Stock ledger exported to CSV successfully", "success");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
              Select Item
            </label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
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
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
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
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
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
              Date Period
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="all">Current Financial Period</option>
              <option value="30d">Last 30 Days</option>
              <option value="60d">Last 60 Days</option>
              <option value="90d">Last Quarter</option>
            </select>
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
          label="Total Inward (+)"
          value={`+${summary.totalIn.toLocaleString()} units`}
          tone="success"
          footnote={<p className="mt-1 text-[11px] leading-4 text-muted">Receipts & inter-wh transfers in</p>}
        />
        <StatCard
          label="Total Outward (-)"
          value={`-${summary.totalOut.toLocaleString()} units`}
          tone="warning"
          footnote={<p className="mt-1 text-[11px] leading-4 text-muted">Dispatches & site issues</p>}
        />
        <StatCard
          label="Closing Balance"
          value={`${summary.closingBalance.toLocaleString()} units`}
          tone="brand"
          footnote={<p className="mt-1 text-[11px] leading-4 text-muted">Real-time available stock</p>}
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-bold leading-5 text-ink">Ledger Entries</h3>
            <span className="rounded-full bg-line-soft px-2 py-0.5 text-[11px] font-semibold text-muted">
              {filteredEntries.length} records
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-muted">Loading stock ledger transactions...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50 m-4 rounded-lg">{error}</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">No stock ledger transactions found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-ink-muted">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-right">In (+)</th>
                  <th className="py-3 px-4 text-right">Out (-)</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4">Reference / Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-xs font-medium text-ink-secondary whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-medium text-brand-primary">
                      {row.voucherNo}
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone={row.type === "Inward" ? "success" : row.type === "Outward" ? "warning" : row.type === "Transfer" ? "info" : "neutral"}>
                        {row.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-ink text-xs">{row.itemName}</div>
                      <div className="text-[11px] font-mono text-ink-muted">{row.itemCode}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-secondary">
                      {row.warehouseName}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-xs text-emerald-600">
                      {row.quantityIn > 0 ? `+${row.quantityIn.toLocaleString()} ${row.unit || ""}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-xs text-rose-600">
                      {row.quantityOut > 0 ? `-${row.quantityOut.toLocaleString()} ${row.unit || ""}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-xs text-ink font-mono">
                      {row.balance.toLocaleString()} {row.unit || ""}
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-muted">
                      {row.reference || "Direct Stock Entry"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

