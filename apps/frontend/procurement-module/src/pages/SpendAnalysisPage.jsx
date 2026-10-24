import { useCallback } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import ColumnChart from "../components/charts/ColumnChart.jsx";
import DonutChart from "../components/charts/DonutChart.jsx";
import { ResourceBoundary } from "../components/ui/AsyncState.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import Panel from "../components/ui/Panel.jsx";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { displayText, formatInrCompact } from "../lib/formatters.js";
import { getSpendAnalysis } from "../features/reports/reportService.js";

const CATEGORY_COLORS = ["brand", "navy", "warning", "success"];

const KPI_CARDS = [
  { key: "totalAnnualSpend", label: "Total Annual Spend", money: true },
  { key: "costSavings", label: "Cost Savings Achieved", money: true },
  { key: "averageOrderValue", label: "Average PO Value", money: true },
  { key: "budgetUtilization", label: "Budget Utilization", money: false },
];

function KpiCard({ label, metric, money }) {
  let value = null;
  if (metric?.value !== null && metric?.value !== undefined) {
    value = money ? formatInrCompact(metric.value, { fractionDigits: 1 }) : `${metric.value}%`;
  }
  const trend = metric?.trend;
  const TrendIcon = trend?.direction === "up" ? ArrowUp : trend?.direction === "down" ? ArrowDown : null;
  return (
    <Panel as="article" className="px-[13px] pb-3 pt-[11px]">
      <h2 className="truncate text-[10px] font-bold uppercase leading-[14px] text-muted">{label}</h2>
      <p className="mt-1 truncate text-[18px] font-bold leading-6 text-navy">{value ?? "—"}</p>
      <p className={`mt-1 flex h-4 items-center gap-1 text-[10px] font-semibold ${trend?.tone === "positive" ? "text-success" : "text-muted"}`}>
        {TrendIcon && <TrendIcon size={11} strokeWidth={2.5} aria-hidden="true" />}
        {trend?.label ?? ""}
      </p>
    </Panel>
  );
}

const DEPARTMENT_COLUMNS = [
  { key: "department", header: "Department", cellClass: "font-semibold text-ink", render: (d) => displayText(d.departmentName) },
  { key: "count", header: "Requisitions Count", width: "140px", align: "right", cellClass: "text-ink", render: (d) => displayText(d.requisitionCount) },
  {
    key: "value",
    header: "Total Value (₹)",
    width: "160px",
    align: "right",
    cellClass: "font-semibold text-brand",
    render: (d) => formatInrCompact(d.totalValue, { unit: "cr", fractionDigits: 1 }),
  },
  { key: "share", header: "Percentage Share", width: "160px", align: "right", render: (d) => (d.sharePercent ? `${d.sharePercent}%` : "—") },
];

function SpendAnalysisPage() {
  const load = useCallback((signal) => getSpendAnalysis({ periodId: "" }, signal), []);
  const analysis = useAsyncResource(load, "spend-analysis");
  const data = analysis.status === "success" ? analysis.data : null;
  const categories = data?.categoryDistribution ?? [];
  const months = data?.monthlyTrend ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <KpiCard key={card.key} label={card.label} metric={data?.kpis?.[card.key]} money={card.money} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[398px_minmax(0,1fr)]">
        <Panel className="flex min-h-[220px] flex-col px-4 pb-4 pt-[13px]">
          <h2 className="text-[13px] font-bold leading-5 text-ink">Spend by Category Distribution</h2>
          <div className="flex flex-1 items-center">
            <ResourceBoundary resource={analysis} isEmpty={categories.length === 0} emptyTitle="No categorised spend" compact>
              <DonutChart
                ariaLabel="Spend by category"
                size={78}
                thickness={13}
                segments={categories.map((category, index) => ({
                  key: category.id,
                  label: category.name,
                  sharePercent: category.sharePercent,
                  color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                }))}
              />
            </ResourceBoundary>
          </div>
        </Panel>

        <Panel className="flex min-h-[220px] flex-col px-4 pb-3 pt-[13px]">
          <h2 className="text-[13px] font-bold leading-5 text-ink">Monthly Spend Trend (₹ Lakhs)</h2>
          <ResourceBoundary resource={analysis} isEmpty={months.length === 0} emptyTitle="No spend recorded" compact>
            <ColumnChart
              ariaLabel="Monthly spend in lakhs"
              className="mt-3 flex-1"
              height={110}
              barWidth={12}
              points={months.map((month) => ({
                key: month.periodKey,
                label: month.label,
                value: month.amount,
                valueLabel: `${month.label}: ${formatInrCompact(month.amount, { unit: "lakh", fractionDigits: 1 })}`,
              }))}
            />
          </ResourceBoundary>
        </Panel>
      </div>

      <Panel className="flex-1 px-4 pb-4 pt-[13px]">
        <h2 className="mb-2 text-[13px] font-bold leading-5 text-ink">Department-wise Spend &amp; Requisitions</h2>
        <DataTable
          caption="Department-wise spend and requisitions"
          columns={DEPARTMENT_COLUMNS}
          rows={data?.departments ?? []}
          getRowKey={(row) => row.departmentId}
          resource={analysis}
          minWidth={640}
          headerCellClass="h-7 text-[11px] font-semibold leading-4 text-muted"
          bodyCellClass="h-[31px] text-[12px] leading-4"
          emptyTitle="No departmental spend recorded"
        />
      </Panel>
    </div>
  );
}

export default SpendAnalysisPage;
