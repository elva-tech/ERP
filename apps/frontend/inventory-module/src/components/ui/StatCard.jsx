import Panel from "./Panel.jsx";

const VALUE_TONES = {
  neutral: "text-navy",
  ink: "text-ink",
  brand: "text-brand",
  success: "text-success",
  warning: "text-warning-strong",
};

/**
 * KPI tile. `value` is pre-formatted display text supplied by the caller from API data;
 * `null` renders an em dash so missing metrics never look like zero.
 */
function StatCard({ label, value, tone = "neutral", footnote, className = "", valueClassName = "text-[20px]" }) {
  return (
    <Panel as="article" className={`px-4 pb-[15px] pt-[14px] ${className}`}>
      <h2 className="truncate text-[12px] leading-5 text-muted">{label}</h2>
      <p className={`mt-1 truncate font-bold leading-7 ${valueClassName} ${VALUE_TONES[tone] ?? VALUE_TONES.neutral}`}>
        {value ?? "—"}
      </p>
      {footnote}
    </Panel>
  );
}

export default StatCard;
