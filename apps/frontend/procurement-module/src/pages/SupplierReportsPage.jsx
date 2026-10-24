import HorizontalBars from "../components/charts/HorizontalBars.jsx";
import { ResourceBoundary } from "../components/ui/AsyncState.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import Panel from "../components/ui/Panel.jsx";
import { ROUTES } from "../config/navigation.js";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { buildHref } from "../hooks/useHashRoute.js";
import { displayText, formatInr, formatInrCompact } from "../lib/formatters.js";
import { getSupplierReportOverview } from "../features/reports/reportService.js";

const TILES = [
  { key: "directory", title: "Supplier Directory", subtitle: "Contact lists & GST profiles.", href: buildHref(ROUTES.supplierMaster) },
  { key: "performance", title: "Performance Index", subtitle: "Scorecards & SLA parameters.", href: buildHref(ROUTES.supplierPerformance) },
  { key: "payments", title: "Payment Reports", subtitle: "Pending balances & aging.", href: buildHref(ROUTES.supplierLedger) },
  { key: "compliance", title: "Compliance Report", subtitle: "Tax profiles & documentation.", href: null },
];

const agingAmount = (value, className = "text-ink") =>
  value && !/^0*(\.0*)?$/.test(value) ? <span className={className}>{formatInr(value)}</span> : <span className="text-muted">—</span>;

const AGING_COLUMNS = [
  { key: "supplier", header: "Supplier", cellClass: "font-semibold text-ink", render: (r) => displayText(r.supplier?.name) },
  { key: "b0", header: "0-30 Days", width: "100px", align: "right", cellClass: "", render: (r) => agingAmount(r.bucket0To30) },
  { key: "b31", header: "31-60 Days", width: "90px", align: "right", cellClass: "", render: (r) => agingAmount(r.bucket31To60) },
  { key: "b61", header: "61-90 Days", width: "90px", align: "right", cellClass: "", render: (r) => agingAmount(r.bucket61To90) },
  { key: "b90", header: "90+ Days", width: "90px", align: "right", cellClass: "", render: (r) => agingAmount(r.bucket90Plus, "text-danger") },
  { key: "total", header: "Total Out.", width: "110px", align: "right", cellClass: "font-bold text-brand", render: (r) => formatInr(r.totalOutstanding) },
];

function Tile({ tile }) {
  const content = (
    <>
      <span className="block text-[13px] font-bold leading-[18px] text-ink">{tile.title}</span>
      <span className="block text-[10px] leading-[14px] text-muted">{tile.subtitle}</span>
    </>
  );
  const className = "block rounded-lg border border-line bg-surface px-[11px] py-[10px]";
  if (!tile.href) {
    return (
      <div aria-disabled="true" title="This report has not been designed yet." className={`${className} cursor-not-allowed`}>
        {content}
      </div>
    );
  }
  return (
    <a href={tile.href} className={`${className} hover:border-[#cbd5e1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy`}>
      {content}
    </a>
  );
}

function SupplierReportsPage() {
  const overview = useAsyncResource(getSupplierReportOverview, "supplier-report-overview");
  const data = overview.status === "success" ? overview.data : null;
  const topSuppliers = data?.topSuppliersByVolume?.items ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map((tile) => (
          <Tile key={tile.key} tile={tile} />
        ))}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[339px_minmax(0,1fr)]">
        <Panel className="px-4 pb-4 pt-[13px]">
          <h2 className="mb-3 text-[13px] font-bold leading-5 text-ink">Top Suppliers by Volume (₹ Lakhs)</h2>
          <ResourceBoundary resource={overview} isEmpty={topSuppliers.length === 0} emptyTitle="No purchase volume recorded" compact>
            <HorizontalBars
              ariaLabel="Top suppliers by purchase volume"
              axisMax={data?.topSuppliersByVolume?.axisMax}
              rows={topSuppliers.map((row) => ({
                key: row.supplier?.id,
                label: row.supplier?.name,
                value: row.amount,
                valueLabel: formatInrCompact(row.amount, { unit: "lakh", fractionDigits: 0, lakhLabel: "L" }),
              }))}
            />
          </ResourceBoundary>
        </Panel>

        <Panel className="px-4 pb-4 pt-[13px]">
          <h2 className="mb-1.5 text-[13px] font-bold leading-5 text-ink">Supplier Payment Aging Report</h2>
          <DataTable
            caption="Supplier payment aging"
            columns={AGING_COLUMNS}
            rows={data?.paymentAging?.items ?? []}
            getRowKey={(row) => row.supplier?.id}
            resource={overview}
            minWidth={640}
            headerCellClass="h-7 text-[11px] font-semibold leading-4 text-muted"
            bodyCellClass="h-[35px] text-[12px] leading-4"
            emptyTitle="No outstanding supplier balances"
          />
        </Panel>
      </div>
    </div>
  );
}

export default SupplierReportsPage;
