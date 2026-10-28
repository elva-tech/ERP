import Panel from "../../../components/ui/Panel.jsx";

const VALUE_TONES = {
  success: "text-success",
  navy: "text-navy",
};

/** One of the three scorecard highlights. `supplierName` and `value` are null when the API has no winner. */
function PerformanceHighlightCard({ title, supplierName, metricLabel, value, tone, isLoading }) {
  return (
    <Panel as="article" className="px-4 pb-[13px] pt-[14px]">
      <h2 className="truncate text-[11px] font-semibold uppercase leading-[14px] text-muted">{title}</h2>
      <p className={`mt-[9px] truncate text-[16px] font-bold leading-[22px] ${supplierName ? "text-ink" : "text-placeholder"}`}>
        {supplierName ?? (isLoading ? "Loading…" : "Insufficient data")}
      </p>
      <div className="mt-[10px] flex h-5 items-center justify-between gap-3">
        <span className="text-[12px] leading-5 text-muted">{metricLabel}</span>
        <span className={`text-[14px] font-bold leading-5 ${value ? VALUE_TONES[tone] : "text-placeholder"}`}>
          {value ?? "—"}
        </span>
      </div>
    </Panel>
  );
}

export default PerformanceHighlightCard;
