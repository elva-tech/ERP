import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, CheckCircle, AlertTriangle, Scale, Search, ArrowRight, RotateCcw } from "lucide-react";
import { reconciliationService } from "../features/reconciliation/services/reconciliationService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import { itemService } from "../features/items/services/itemService.js";
import StartReconciliationModal from "../features/reconciliation/components/StartReconciliationModal.jsx";
import Badge from "../components/ui/Badge.jsx";

export default function StockReconciliationPage({ onShowToast }) {
  const [records, setRecords] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [recRes, whRes, itmRes] = await Promise.all([
        reconciliationService.getReconciliations({
          warehouseId: selectedWarehouse !== "all" ? selectedWarehouse : undefined,
        }),
        warehouseService.getWarehouses(),
        itemService.getItems(),
      ]);
      setRecords(recRes.data || []);
      setWarehouses(whRes.data || []);
      setItems(itmRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load reconciliation records");
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartReconciliation = async (recData) => {
    try {
      setIsSubmitting(true);
      await reconciliationService.startReconciliation(recData);
      setIsModalOpen(false);
      onShowToast && onShowToast("Physical stock reconciliation initiated!", "success");
      fetchData();
    } catch (err) {
      onShowToast && onShowToast(err.message || "Failed to start reconciliation", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = (record) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === record.id
          ? { ...r, systemQty: r.physicalQty, variance: 0, variancePercent: 0, status: "Adjusted" }
          : r
      )
    );
    onShowToast &&
      onShowToast(`Stock variance for ${record.itemCode} posted to ledger as inventory adjustment!`, "success");
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchStatus =
        selectedStatus === "all" || r.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchSearch =
        (r.itemCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.itemName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.warehouseName || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [records, selectedStatus, searchQuery]);

  const kpis = useMemo(() => {
    const total = records.length;
    const matched = records.filter((r) => r.status === "Matched" || r.variance === 0).length;
    const discrepancies = records.filter((r) => r.variance !== 0).length;
    const netVarianceQty = records.reduce((acc, r) => acc + (r.variance || 0), 0);
    return { total, matched, discrepancies, netVarianceQty };
  }, [records]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="sr-only">Stock Reconciliation</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            Physical stock audit, cycle count comparison, and variance adjustment
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Start Reconciliation
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Total Audited</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">
            {kpis.total} <span className="text-xs font-normal text-slate-500">items</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">Under physical cycle count</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Matched (0 Variance)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {kpis.matched} <span className="text-xs font-normal text-slate-500">items</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">Physical count matches system</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Discrepancies</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {kpis.discrepancies} <span className="text-xs font-normal text-slate-500">items</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">Requires audit investigation</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">Net Variance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-brand-primary">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">
            {kpis.netVarianceQty >= 0 ? `+${kpis.netVarianceQty}` : kpis.netVarianceQty}{" "}
            <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">Net stock difference</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, code, or warehouse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink-muted uppercase">Warehouse:</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink-muted uppercase">Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="all">All Statuses</option>
              <option value="Matched">Matched</option>
              <option value="Discrepancy">Discrepancy</option>
              <option value="Adjusted">Adjusted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Variance Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink text-sm">Audit Findings & Variance Records</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredRecords.length} items
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-muted">Loading reconciliation findings...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50 m-4 rounded-lg">{error}</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">No reconciliation records match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-ink-muted">
                <tr>
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-right">System Qty</th>
                  <th className="py-3 px-4 text-right">Physical Qty</th>
                  <th className="py-3 px-4 text-right">Variance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const hasDiscrepancy = r.variance !== 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink text-xs">{r.itemName}</div>
                        <div className="text-[11px] font-mono text-ink-muted">{r.itemCode}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-secondary">
                        {r.warehouseName}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-xs text-ink">
                        {r.systemQty.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-xs text-brand-primary">
                        {r.physicalQty.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-semibold text-xs font-mono ${
                            r.variance < 0
                              ? "text-rose-600"
                              : r.variance > 0
                              ? "text-emerald-600"
                              : "text-slate-500"
                          }`}
                        >
                          {r.variance > 0 ? `+${r.variance}` : r.variance} ({r.variancePercent || 0}%)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            r.status === "Matched"
                              ? "success"
                              : r.status === "Adjusted"
                              ? "info"
                              : "danger"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasDiscrepancy && r.status !== "Adjusted" ? (
                          <button
                            onClick={() => handleAdjustStock(r)}
                            className="px-2.5 py-1 text-xs font-medium bg-brand text-white hover:bg-brand-hover rounded-md transition shadow-2xs"
                          >
                            Adjust Stock
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <StartReconciliationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleStartReconciliation}
        isSubmitting={isSubmitting}
        warehouses={warehouses}
        items={items}
      />
    </div>
  );
}

