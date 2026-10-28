import { ArrowLeft } from "lucide-react";
import Panel from "./Panel.jsx";

/** Shared layout pieces for record "View" screens. Values are rendered exactly as the backend returns them. */

export function BackButton() {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="inline-flex h-[31px] items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-workspace focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      Back
    </button>
  );
}

export function DetailHeader({ title, subtitle, badge, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <BackButton />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-bold leading-6 text-navy">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-[12px] leading-[18px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DetailSection({ title, aside, children, className = "" }) {
  return (
    <Panel className={`px-5 pb-4 pt-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold leading-5 text-ink">{title}</h3>
        {aside}
      </div>
      {children}
    </Panel>
  );
}

/** @param {{ fields: Array<{ label: string, value: import("react").ReactNode, wide?: boolean }> }} props */
export function FieldGrid({ fields }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map((field) => (
        <div key={field.label} className={`min-w-0 ${field.wide ? "sm:col-span-2 lg:col-span-4" : ""}`}>
          <dt className="text-[11.5px] font-semibold leading-4 text-muted">{field.label}</dt>
          <dd className="mt-1 whitespace-pre-line break-words text-[13px] leading-[18px] text-ink">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Right-aligned label/value rows under a line-items table (subtotal, tax, totals). */
export function TotalsList({ rows }) {
  return (
    <dl className="ml-auto mt-3 w-full max-w-[320px] space-y-1.5 text-[13px]">
      {rows.map((row) => (
        <div key={row.label} className={`flex justify-between gap-4 ${row.strong ? "border-t border-line pt-1.5 font-bold text-ink" : "text-muted"}`}>
          <dt>{row.label}</dt>
          <dd className={row.strong ? "" : "text-ink"}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const ACTION_TONES = {
  brand: "bg-navy text-white hover:bg-sidebar focus-visible:outline-navy",
  success: "bg-success text-white hover:bg-[#059669] focus-visible:outline-success",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-soft focus-visible:outline-danger",
  neutral: "border border-line bg-surface text-ink hover:bg-workspace focus-visible:outline-navy",
};

export function ActionButton({ tone = "neutral", icon: Icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-[35px] items-center gap-1.5 rounded-md px-3.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${ACTION_TONES[tone]}`}
    >
      {Icon && <Icon size={15} strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </button>
  );
}
