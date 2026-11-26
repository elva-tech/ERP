import React, { useEffect, useMemo, useState } from "react";
import { Building2, MoreHorizontal, ArrowRight } from "lucide-react";
import PrimaryActionButton from "../components/ui/PrimaryActionButton.jsx";
import Panel from "../components/ui/Panel.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { ROUTES } from "../config/navigation.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import AddWarehouseModal from "../features/warehouses/components/AddWarehouseModal.jsx";
import { usePageSearch } from "../hooks/usePageSearch.jsx";
import { matchesSearch } from "../lib/search.js";

export default function WarehouseDashboardPage({ onNavigate, onShowToast }) {
  const { search } = usePageSearch();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await warehouseService.getWarehouses();
      setWarehouses(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  function handleWarehouseCreated(created) {
    setIsModalOpen(false);
    const name = created?.name ?? created?.data?.name;
    onShowToast?.(name ? `Warehouse ${name} added successfully!` : "Warehouse added successfully!", "success");
    fetchWarehouses();
  }

  const formatStockValue = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const warehouseSummary = useMemo(() => {
    if (!warehouses.length) return null;
    const activeCount = warehouses.filter((w) => w.status === "Active").length;
    const transitCount = warehouses.filter((w) => w.type === "Transit").length;
    const combinedStockValue = warehouses.reduce((sum, w) => sum + (Number(w.stockValue) || 0), 0);
    const avgUtilization = Math.round(
      warehouses.reduce((sum, w) => sum + (Number(w.capacityUtilization) || 0), 0) / warehouses.length
    );
    const totalLocationRecords = warehouses.reduce((sum, w) => sum + (Number(w.totalItems) || 0), 0);
    return {
      total: warehouses.length,
      activeCount,
      transitCount,
      combinedStockValue,
      avgUtilization,
      totalLocationRecords,
    };
  }, [warehouses]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="sr-only">Warehouse Overview</h2>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <PrimaryActionButton onClick={() => setIsModalOpen(true)}>Add Warehouse</PrimaryActionButton>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Warehouses"
          value={loading ? "—" : String(warehouseSummary?.total ?? 0)}
          footnote={
            <p className="mt-1 text-[11px] leading-4 text-muted">
              {warehouseSummary
                ? `${warehouseSummary.activeCount} active • ${warehouseSummary.transitCount} transit`
                : "Loading summary…"}
            </p>
          }
        />
        <StatCard
          label="Combined Stock Value"
          value={loading ? "—" : formatStockValue(warehouseSummary?.combinedStockValue ?? 0)}
          tone="brand"
        />
        <StatCard
          label="Average Utilization"
          value={loading ? "—" : `${warehouseSummary?.avgUtilization ?? 0}%`}
          footnote={<p className="mt-1 text-[11px] leading-4 text-muted">Across all locations</p>}
        />
        <StatCard
          label="Total Location Records"
          value={loading ? "—" : (warehouseSummary?.totalLocationRecords ?? 0).toLocaleString("en-IN")}
          footnote={<p className="mt-1 text-[11px] leading-4 text-muted">Item balances by warehouse</p>}
        />
      </div>

      {/* Grid of Warehouse Cards */}
      {loading ? (
        <div className="p-12 text-center text-muted text-sm">Loading warehouses...</div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-danger text-sm rounded-xl">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses
            .filter(
              (wh) =>
                !search.trim() ||
                matchesSearch(search, wh.name, wh.code, wh.city, wh.streetAddress)
            )
            .map((wh) => {
            const isHigh = wh.capacityUtilization >= 80;
            const progressColor = isHigh ? "bg-amber-500" : "bg-emerald-600";

            return (
              <Panel
                key={wh.id}
                as="article"
                className="flex flex-col justify-between p-4 transition-colors hover:border-muted"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <button className="text-muted hover:text-ink p-1">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="mt-3 text-[13px] font-bold leading-5 text-ink">{wh.name}</h3>
                  <p className="mt-0.5 text-[12px] leading-4 text-muted">
                    {wh.streetAddress}, {wh.city}
                  </p>

                  {/* Utilization Progress */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[11px] font-semibold uppercase text-muted">Capacity Utilization</span>
                      <span className={isHigh ? "text-amber-600" : "text-emerald-700"}>
                        {wh.capacityUtilization}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-line-soft rounded-full overflow-hidden">
                      <div
                        className={`h-full ${progressColor} rounded-full`}
                        style={{ width: `${wh.capacityUtilization}%` }}
                      />
                    </div>
                  </div>

                  {/* Total Items & Stock Value */}
                  <div className="mt-5 pt-4 border-t border-line space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold leading-4 text-muted">Total Items</p>
                      <p className="mt-0.5 text-[20px] font-bold leading-7 text-navy">
                        {wh.totalItems.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold leading-4 text-muted">Stock Value</p>
                      <p className="mt-0.5 text-[20px] font-bold leading-7 text-navy">
                        {formatStockValue(wh.stockValue)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-line flex items-center justify-between text-xs">
                  <span className="text-muted">
                    {wh.zonesCount} zones • {wh.totalAreaSqFt.toLocaleString()} sq ft
                  </span>
                  <button
                    onClick={() => onNavigate(ROUTES.warehouseDetail, { warehouseId: wh.id })}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-link hover:underline"
                  >
                    <span>View warehouse</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <AddWarehouseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleWarehouseCreated}
      />
    </div>
  );
}

