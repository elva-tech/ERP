import React, { useEffect, useState } from "react";
import { Building2, ArrowLeft } from "lucide-react";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import Badge from "../components/ui/Badge.jsx";
import { ROUTES } from "../config/navigation.js";

export default function WarehouseDetailPage({ warehouseId, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        // default to wh-1 if no param
        const targetId = warehouseId || "wh-1";
        const res = await warehouseService.getWarehouseById(targetId);
        if (mounted) setData(res);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load warehouse details");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [warehouseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-danger text-sm">
        <p className="font-semibold">Failed to load warehouse</p>
        <p className="mt-1">{error || "Warehouse not found"}</p>
        <button
          onClick={() => onNavigate(ROUTES.warehouses)}
          className="mt-4 px-4 py-1.5 bg-white border border-line rounded-lg text-ink font-semibold"
        >
          Back to Warehouses
        </button>
      </div>
    );
  }

  const { warehouse, itemsStored, recentActivity, categoryDistribution } = data;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="sr-only">{warehouse.name}</h2>
      <div>
        <button
          type="button"
          onClick={() => onNavigate(ROUTES.warehouses)}
          className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to All Warehouses
        </button>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Warehouse Info (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-line shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-ink">{warehouse.name}</h3>
                  <Badge tone="success">Active</Badge>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {warehouse.streetAddress}, {warehouse.city}, {warehouse.state} {warehouse.pinCode}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-6 pt-5 border-t border-line text-xs">
              <div>
                <span className="text-muted font-normal">Capacity • </span>
                <span className="text-ink font-semibold">
                  {warehouse.totalAreaSqFt.toLocaleString()} sq ft
                </span>
              </div>
              <div>
                <span className="text-muted font-normal">Manager • </span>
                <span className="text-ink font-semibold">{warehouse.contactPerson}</span>
              </div>
              <div>
                <span className="text-ink font-semibold">{warehouse.zonesCount} storage zones</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Donut Capacity Card (1 col) */}
        <div className="bg-white p-6 rounded-xl border border-line shadow-2xs flex flex-col justify-between">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
            Capacity Utilization
          </h4>
          <div className="flex items-center gap-6 my-auto py-2">
            {/* SVG Ring Progress */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-amber-500"
                  strokeDasharray={`${warehouse.capacityUtilization}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-extrabold text-amber-600">
                  {warehouse.capacityUtilization}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-ink">
                {Math.round((warehouse.totalAreaSqFt * warehouse.capacityUtilization) / 100).toLocaleString()}{" "}
                sq ft used
              </p>
              <p className="text-xs text-muted mt-0.5">High volume utilization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Stock by Category & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Category */}
        <div className="bg-white p-6 rounded-xl border border-line shadow-2xs">
          <h3 className="text-sm font-bold text-ink tracking-tight mb-5">Stock by Category</h3>
          <div className="space-y-4">
            {categoryDistribution.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-ink">{cat.name}</span>
                  <span className="text-muted">{cat.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-line-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl border border-line shadow-2xs">
          <h3 className="text-sm font-bold text-ink tracking-tight mb-5">Recent Activity</h3>
          <div className="divide-y divide-line">
            {recentActivity.map((act, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div>
                  <span className="font-semibold text-navy">{act.type}: </span>
                  <span className="text-muted">{act.ref}</span>
                </div>
                <span className={`font-bold ${act.positive ? "text-emerald-600" : "text-danger"}`}>
                  {act.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Table: Items Stored */}
      <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-sm font-bold text-ink tracking-tight">Items Stored</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-workspace border-b border-line text-muted">
              <tr>
                <th className="py-3.5 px-6 font-semibold">Item Code</th>
                <th className="py-3.5 px-6 font-semibold">Item Name</th>
                <th className="py-3.5 px-6 font-semibold">Category</th>
                <th className="py-3.5 px-6 font-semibold">Quantity</th>
                <th className="py-3.5 px-6 font-semibold">Stock Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {itemsStored.map((row) => (
                <tr key={row.id} className="hover:bg-workspace/50 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-navy">{row.itemCode}</td>
                  <td className="py-3.5 px-6 text-ink font-medium">{row.itemName}</td>
                  <td className="py-3.5 px-6 text-muted">{row.category}</td>
                  <td className="py-3.5 px-6 font-bold text-ink">
                    {row.quantity.toLocaleString()} {row.unit}
                  </td>
                  <td className="py-3.5 px-6 text-link font-semibold">
                    ₹{(row.stockValue / 100000).toFixed(1)} L
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

