import { AGREEMENT_STATUS_CONFIG } from "./badgeStyles.js";

export function StatusBadge({ status, className = "" }) {
  const normalized = (status || "").toLowerCase().replace(/[\s-]/g, "_");
  const config = AGREEMENT_STATUS_CONFIG[normalized] || {
    label: status || "Unknown",
    dotClass: "bg-slate-400",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-4 ${config.badgeClass} ${className}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${config.dotClass}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

