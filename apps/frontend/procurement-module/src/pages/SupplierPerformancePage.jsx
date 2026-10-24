import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import { useLookupOptions, withAllOption } from "../hooks/useLookupOptions.js";
import { useServerList } from "../hooks/useServerList.js";
import { formatDateTime } from "../lib/formatters.js";
import PerformanceHighlightCard from "../features/supplier-performance/components/PerformanceHighlightCard.jsx";
import PerformanceIndexTable from "../features/supplier-performance/components/PerformanceIndexTable.jsx";
import { getSupplierPerformance } from "../features/supplier-performance/supplierPerformanceService.js";

const suffix = (value, text) => (value ? `${value}${text}` : null);

function SupplierPerformancePage() {
  const list = useServerList(getSupplierPerformance, { periodId: "", categoryId: "" });
  const periods = useLookupOptions("performancePeriods");
  const categories = useLookupOptions("supplierCategories");
  const data = list.resource.status === "success" ? list.resource.data : null;
  const highlights = data?.highlights ?? {};
  const isLoading = list.resource.status === "loading";

  const periodOptions = periods.options.length
    ? periods.options
    : [{ value: "", label: data?.period?.label ?? "—" }];
  const periodValue = list.filters.periodId || data?.period?.id || periods.defaultValue || periodOptions[0].value;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Period"
            value={periodValue}
            options={periodOptions}
            disabled={periods.status !== "success"}
            onChange={(value) => list.setFilter("periodId", value)}
          />
          <FilterSelect
            label="Category"
            value={list.filters.categoryId}
            options={withAllOption(categories.options, "All Material")}
            onChange={(value) => list.setFilter("categoryId", value)}
          />
        </div>
        {data?.lastUpdatedAt && (
          <p className="text-[12px] leading-4 text-muted">Last updated: {formatDateTime(data.lastUpdatedAt)}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PerformanceHighlightCard
          title="Best Delivery Compliance"
          supplierName={highlights.bestDelivery?.supplier?.name ?? null}
          metricLabel="On-Time Rate"
          value={suffix(highlights.bestDelivery?.onTimeRate, "%")}
          tone="success"
          isLoading={isLoading}
        />
        <PerformanceHighlightCard
          title="Highest Quality Compliance"
          supplierName={highlights.highestQuality?.supplier?.name ?? null}
          metricLabel="Rejection Rate"
          value={suffix(highlights.highestQuality?.rejectionRate, "%")}
          tone="success"
          isLoading={isLoading}
        />
        <PerformanceHighlightCard
          title="Fastest Response Time"
          supplierName={highlights.fastestResponse?.supplier?.name ?? null}
          metricLabel="Avg Response"
          value={suffix(highlights.fastestResponse?.avgResponseHours, " Hrs")}
          tone="navy"
          isLoading={isLoading}
        />
      </div>

      <Panel className="flex-1 px-4 pb-4 pt-[13px]">
        <h2 className="text-[14px] font-bold leading-5 text-ink">Detailed Supplier Performance Index</h2>
        <PerformanceIndexTable rows={list.items} resource={list.resource} />
        <ListFooter pagination={list.pagination} itemCount={list.items.length} noun="suppliers" onPageChange={list.setPage} />
      </Panel>
    </div>
  );
}

export default SupplierPerformancePage;
