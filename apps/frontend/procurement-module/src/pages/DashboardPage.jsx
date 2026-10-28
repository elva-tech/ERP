import ColumnChart from "../components/charts/ColumnChart.jsx";
import DonutChart from "../components/charts/DonutChart.jsx";
import { ResourceBoundary } from "../components/ui/AsyncState.jsx";
import { StatusBadge } from "../components/ui/Badge.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import Panel from "../components/ui/Panel.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { ROUTES } from "../config/navigation.js";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { buildHref } from "../hooks/useHashRoute.js";
import { displayText, formatDate, formatInr, formatInrCompact } from "../lib/formatters.js";
import { getDashboard } from "../features/dashboard/dashboardService.js";
import { PURCHASE_ORDER_STATUS_BADGES } from "../features/purchase-orders/purchaseOrderStatus.js";

const CATEGORY_COLORS = ["navy", "brand", "success", "warning"];
const crore = (amount) => formatInrCompact(amount, { unit: "cr", fractionDigits: 1 });
const count = (value) => (value === null || value === undefined ? null : String(value));

const KPI_CARDS = [
  { key: "purchaseValue", label: "Purchase Value", tone: "neutral", format: crore },
  { key: "pendingRequisitions", label: "Pending PRs", tone: "brand", format: count },
  { key: "pendingOrders", label: "Pending POs", tone: "brand", format: count },
  { key: "pendingApprovals", label: "Pending Approvals", tone: "brand", format: count },
  { key: "supplierPayables", label: "Supplier Payables", tone: "neutral", format: crore },
  { key: "monthlySpend", label: "Monthly Spend", tone: "neutral", format: crore },
];

const RECENT_ORDER_COLUMNS = [
  { key: "number", header: "PO Number", width: "100px", cellClass: "font-bold text-navy", render: (o) => displayText(o.orderNumber) },
  { key: "supplier", header: "Supplier", cellClass: "text-ink", render: (o) => displayText(o.supplierName) },
  { key: "amount", header: "Amount", width: "120px", cellClass: "font-semibold text-ink", render: (o) => formatInr(o.totalAmount) },
  { key: "date", header: "Date", width: "100px", render: (o) => formatDate(o.orderDate) },
  {
    key: "status",
    header: "Status",
    width: "100px",
    cellClass: "",
    render: (o) => <StatusBadge status={o.status} statusMap={PURCHASE_ORDER_STATUS_BADGES} className="w-full" />,
  },
];

function DashboardPage() {
  const dashboard = useAsyncResource(getDashboard, "dashboard");
  const data = dashboard.status === "success" ? dashboard.data : null;
  const months = data?.monthlySpend ?? [];
  const categories = data?.categoryBreakdown?.categories ?? [];
  const approvals = data?.pendingApprovals ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPI_CARDS.map((card) => {
          const raw = data?.kpis?.[card.key];
          return (
            <StatCard
              key={card.key}
              label={card.label}
              value={raw === null || raw === undefined ? null : card.format(raw)}
              tone={card.tone}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_398px]">
        <Panel className="flex h-[240px] flex-col px-4 pb-3 pt-[13px]">
          <h2 className="text-[13px] font-bold leading-5 text-ink">Monthly Procurement Spend (₹ Lakhs)</h2>
          <ResourceBoundary resource={dashboard} isEmpty={months.length === 0} emptyTitle="No spend recorded" compact>
            <ColumnChart
              ariaLabel="Monthly procurement spend in lakhs"
              className="mt-3 flex-1 px-[18%]"
              height={120}
              barWidth={32}
              points={months.map((month) => ({
                key: month.periodKey,
                label: month.label,
                value: month.amount,
                valueLabel: `${month.label}: ${formatInrCompact(month.amount, { unit: "lakh", fractionDigits: 1 })}`,
              }))}
            />
          </ResourceBoundary>
        </Panel>

        <Panel className="flex h-[240px] flex-col px-4 pb-3 pt-[13px]">
          <h2 className="text-[13px] font-bold leading-5 text-ink">Purchase Category Breakdown</h2>
          <div className="flex flex-1 items-center">
            <ResourceBoundary resource={dashboard} isEmpty={categories.length === 0} emptyTitle="No categorised purchases" compact>
              <DonutChart
                ariaLabel="Purchase value by category"
                size={112}
                thickness={20}
                centerCaption="Total"
                centerValue={formatInrCompact(data?.categoryBreakdown?.totalAmount, { unit: "cr", fractionDigits: 1 })}
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
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_378px]">
        <Panel className="px-4 pb-4 pt-[13px]">
          <h2 className="mb-2 text-[13px] font-bold leading-5 text-ink">Recent Purchase Orders</h2>
          <DataTable
            caption="Recent purchase orders"
            columns={RECENT_ORDER_COLUMNS}
            rows={data?.recentOrders ?? []}
            getRowKey={(row) => row.id}
            resource={dashboard}
            minWidth={560}
            headerCellClass="h-7 text-[11px] font-semibold leading-4 text-muted"
            bodyCellClass="h-[41px] text-[12px] leading-4"
            emptyTitle="No purchase orders yet"
          />
        </Panel>

        <Panel className="px-4 pb-4 pt-[13px]">
          <h2 className="mb-2 text-[13px] font-bold leading-5 text-ink">Pending Approvals</h2>
          <ResourceBoundary resource={dashboard} isEmpty={approvals.length === 0} emptyTitle="Nothing awaiting your approval" compact>
            <ul className="space-y-2">
              {approvals.map((approval) => (
                <li key={approval.id}>
                  <a
                    href={buildHref(ROUTES.pendingApprovals)}
                    className="block rounded-md bg-workspace px-3 py-2.5 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-navy"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-[12px] font-bold text-navy">{displayText(approval.document?.number)}</span>
                      <span className="shrink-0 text-[12px] font-bold text-brand">
                        {formatInrCompact(approval.amount, { unit: "lakh", fractionDigits: 1, lakhLabel: "L" })}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[12px] text-ink">{displayText(approval.title)}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted">{displayText(approval.subtitle)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </ResourceBoundary>
        </Panel>
      </div>
    </div>
  );
}

export default DashboardPage;
