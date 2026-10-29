import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Download, AlertTriangle, Clock, ShieldAlert, CheckCircle, Search, Filter } from "lucide-react";
import { agingService } from "../features/aging/services/agingService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import Badge from "../components/ui/Badge.jsx";

export default function StockAgingPage({ onShowToast }) {
  const [agingData, setAgingData] = useState({ buckets: [], itemDetails: [], totalValue: 0 });
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBucket, setSelectedBucket] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [agingRes, whRes] = await Promise.all([
        agingService.getAgingAnalysis({
          warehouseId: selectedWarehouse !== "all" ? selectedWarehouse : undefined,
        }),
        warehouseService.getWarehouses(),
      ]);
      setAgingData(agingRes.data || agingRes || { buckets: [], itemDetails: [], totalValue: 0 });
      setWarehouses(whRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load stock aging data");
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const buckets = agingData.buckets || [];
  const items = agingData.itemDetails || [];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        (item.itemCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.itemName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.warehouseName || "").toLowerCase().includes(searchQuery.toLowerCase());

      let matchBucket = true;
      if (selectedBucket === "0-30") matchBucket = item.ageDays <= 30;
      else if (selectedBucket === "31-60") matchBucket = item.ageDays > 30 && item.ageDays <= 60;
      else if (selectedBucket === "61-90") matchBucket = item.ageDays > 60 && item.ageDays <= 90;
      else if (selectedBucket === "90+") matchBucket = item.ageDays > 90;

      return matchSearch && matchBucket;
    });
  }, [items, searchQuery, selectedBucket]);

  const formatCurrency = (val) => {
    return "₹" + Number(val || 0).toLocaleString("en-IN");
  };

  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      onShowToast && onShowToast("No aging records to export", "neutral");
      return;
    }
    const headers = ["Item Code", "Item Name", "Warehouse", "Quantity", "Unit", "Age (Days)", "Valuation", "Last Movement"];
    const rows = filteredItems.map((i) => [
      i.itemCode,
      `"${i.itemName.replace(/"/g, '""')}"`,
      `"${i.warehouseName}"`,
      i.quantity,
      i.unit,
      i.ageDays,
      i.value,
      i.lastMovementDate,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_aging_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast && onShowToast("Aging analysis report exported to CSV", "success");
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="sr-only">Stock Aging Analysis</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            Holding period valuation, slow-moving items, and obsolescence risk control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-ink font-medium shadow-xs focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="all">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            Export Analysis
          </button>
        </div>
      </div>

      {/* 4 Aging Bucket Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {buckets.map((b, idx) => {
          const isGreen = idx === 0;
          const isBlue = idx === 1;
          const isAmber = idx === 2;
          const isRed = idx === 3;
          return (
            <div
              key={b.bucket}
              onClick={() => setSelectedBucket(selectedBucket === b.bucket.replace(" days", "") ? "all" : b.bucket.replace(" days", ""))}
              className={`bg-white border rounded-xl p-4.5 shadow-xs cursor-pointer transition hover:border-slate-400 ${
                selectedBucket === b.bucket.replace(" days", "") ? "ring-2 ring-brand-primary border-brand-primary" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  isGreen ? "text-emerald-700" : isBlue ? "text-blue-700" : isAmber ? "text-amber-700" : "text-rose-700"
                }`}>
                  {b.bucket}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isGreen ? "bg-emerald-50 text-emerald-700" : isBlue ? "bg-blue-50 text-blue-700" : isAmber ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                }`}>
                  {b.percentage}%
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-ink">
                {formatCurrency(b.value)}
              </div>
              <div className="flex items-center justify-between text-xs text-ink-muted mt-2">
                <span>{b.count} SKUs active</span>
                <span className="font-medium text-slate-500">
                  {isGreen ? "Fast Moving" : isBlue ? "Standard" : isAmber ? "Slow Moving" : "Stagnant / Dead"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Aging Distribution Visual Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Inventory Value Aging Distribution</span>
          <span className="text-xs text-ink-muted">
            Total Valuation: <strong className="text-ink">{formatCurrency(agingData.totalValue || 123500000)}</strong>
          </span>
        </div>
        <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden">
          {buckets.map((b) => (
            <div
              key={b.bucket}
              style={{ width: `${b.percentage}%`, backgroundColor: b.color }}
              className="h-full transition-all duration-300 hover:opacity-90"
              title={`${b.bucket}: ${b.percentage}% (${formatCurrency(b.value)})`}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          {buckets.map((b) => (
            <div key={b.bucket} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
              <span className="text-ink-secondary font-medium">{b.bucket}:</span>
              <span className="text-ink-muted">{formatCurrency(b.value)} ({b.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Item Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by item code, name, warehouse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-ink-muted uppercase">Bucket:</label>
            <select
              value={selectedBucket}
              onChange={(e) => setSelectedBucket(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="all">All Buckets</option>
              <option value="0-30">0-30 Days (Fresh)</option>
              <option value="31-60">31-60 Days (Normal)</option>
              <option value="61-90">61-90 Days (Slow)</option>
              <option value="90+">90+ Days (Stagnant)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-muted">Loading stock aging details...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50 m-4 rounded-lg">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">No stock items match the selected aging filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-ink-muted">
                <tr>
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-right">Holding Qty</th>
                  <th className="py-3 px-4 text-right">Holding Value</th>
                  <th className="py-3 px-4 text-center">Age (Days)</th>
                  <th className="py-3 px-4">Last Movement</th>
                  <th className="py-3 px-4">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isCritical = item.ageDays > 90;
                  const isSlow = item.ageDays > 60 && item.ageDays <= 90;
                  const isModerate = item.ageDays > 30 && item.ageDays <= 60;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink text-xs">{item.itemName}</div>
                        <div className="text-[11px] font-mono text-ink-muted">{item.itemCode}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-secondary">
                        {item.warehouseName}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-xs text-ink">
                        {item.quantity.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-xs text-ink">
                        {formatCurrency(item.value)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          isCritical
                            ? "bg-rose-100 text-rose-800 font-mono"
                            : isSlow
                            ? "bg-amber-100 text-amber-800 font-mono"
                            : isModerate
                            ? "bg-blue-100 text-blue-800 font-mono"
                            : "bg-emerald-100 text-emerald-800 font-mono"
                        }`}>
                          {item.ageDays}d
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-muted whitespace-nowrap">
                        {item.lastMovementDate}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            isCritical
                              ? "danger"
                              : isSlow
                              ? "warning"
                              : isModerate
                              ? "info"
                              : "success"
                          }
                        >
                          {isCritical ? "Obsolete Risk" : isSlow ? "Slow Moving" : isModerate ? "Moderate" : "Fresh Stock"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

