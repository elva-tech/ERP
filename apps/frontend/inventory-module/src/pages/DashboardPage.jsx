import React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { ResourceBoundary } from "../components/ui/AsyncState.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import Panel from "../components/ui/Panel.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { ROUTES } from "../config/navigation.js";
import { dashboardService } from "../features/dashboard/services/dashboardService.js";

const ALERT_COLUMNS = [
  { key: "itemCode", header: "Item Code", width: "100px", cellClass: "font-bold text-navy", render: (row) => row.itemCode },
  { key: "description", header: "Description", cellClass: "text-ink", render: (row) => row.description },
  {
    key: "currentStock",
    header: "Current Stock",
    width: "110px",
    align: "right",
    cellClass: "font-semibold text-danger",
    render: (row) => row.currentStock,
  },
  { key: "minLevel", header: "Min Level", width: "90px", align: "right", render: (row) => row.minLevel },
  { key: "unit", header: "Unit", width: "70px", render: (row) => row.unit },
  { key: "warehouse", header: "Warehouse", width: "140px", render: (row) => row.warehouse },
];

export default function DashboardPage({ onNavigate }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await dashboardService.getDashboardMetrics();
        if (mounted) setMetrics(data);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load dashboard metrics");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  const resource = useMemo(
    () => ({
      status: loading ? "loading" : error ? "error" : "success",
      error,
      reload: () => window.location.reload(),
    }),
    [loading, error],
  );

  const {
    totalSkus = 2847,
    lowStockCount = 34,
    inwardTodayAmount = "₹4.2 Lakhs",
    outwardTodayAmount = "₹3.1 Lakhs",
    categoryStockDistribution = [],
    monthlyTrends = [],
    lowStockAlerts = [],
  } = metrics || {};

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h2 className="sr-only">Inventory Dashboard</h2>

      <ResourceBoundary resource={resource} compact>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total SKUs" value={totalSkus.toLocaleString()} tone="neutral" />
          <StatCard label="Low Stock Items" value={String(lowStockCount)} tone="warning" />
          <StatCard label="Inward Today" value={inwardTodayAmount} tone="brand" />
          <StatCard label="Outward Today" value={outwardTodayAmount} tone="brand" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel className="px-4 pb-4 pt-[13px]">
            <h3 className="text-[13px] font-bold leading-5 text-ink">Category-wise Stock Value</h3>
            <div className="mt-4 space-y-4">
              {categoryStockDistribution.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px] font-semibold">
                    <span className="text-ink">{cat.category}</span>
                    <span className="text-navy">{cat.percentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line-soft">
                    <div className="h-full rounded-full bg-navy" style={{ width: `${cat.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="px-4 pb-4 pt-[13px]">
            <h3 className="text-[13px] font-bold leading-5 text-ink">Stock Movement Trend (Inward vs Outward)</h3>
            <div className="mt-4 flex h-48 items-end justify-between gap-3 border-b border-line px-2 pb-2 pt-4">
              {monthlyTrends.map((t) => (
                <div key={t.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-36 w-full items-end justify-center gap-1.5">
                    <div className="w-3.5 rounded-t-sm bg-navy" style={{ height: `${t.inwardValue}%` }} title="Inward" />
                    <div className="w-3.5 rounded-t-sm bg-success" style={{ height: `${t.outwardValue}%` }} title="Outward" />
                  </div>
                  <span className="text-[11px] font-medium text-muted">{t.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-6 text-[11px] font-medium text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="size-3 rounded-xs bg-navy" aria-hidden="true" />
                Inward
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-3 rounded-xs bg-success" aria-hidden="true" />
                Outward
              </span>
            </div>
          </Panel>
        </div>

        <Panel className="px-[15px] pb-4 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning-strong" aria-hidden="true" />
              <h3 className="text-[13px] font-bold leading-5 text-ink">Low Stock Alerts</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.(ROUTES.itemMaster)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-link hover:underline"
            >
              View All Items
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <DataTable
            caption="Low stock alerts"
            columns={ALERT_COLUMNS}
            rows={lowStockAlerts}
            getRowKey={(row) => row.id}
            minWidth={720}
            emptyTitle="No low stock alerts"
          />
        </Panel>
      </ResourceBoundary>
    </div>
  );
}
