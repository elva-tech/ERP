import { useId, useRef, useState } from "react";
import { Calendar, ChevronDown, Download, Printer } from "lucide-react";
import OutlineButton from "../../../components/ui/OutlineButton.jsx";
import { INPUT_CLASS } from "../../../components/ui/formStyles.js";
import { formatDate } from "../../../lib/formatters.js";

const BOX_CLASS =
  "relative flex h-[46px] flex-col justify-center rounded-md border border-line bg-surface pl-3.5 pr-3.5 text-left focus-within:border-muted focus-within:ring-2 focus-within:ring-navy/15";

function SupplierPicker({ value, lookup, onChange }) {
  const selected = lookup.options.find((option) => option.value === value);
  let display = selected?.label ?? "Select a supplier";
  if (lookup.status === "loading") display = "Loading suppliers…";
  if (lookup.status === "error") display = "Suppliers unavailable";

  return (
    <div className={`${BOX_CLASS} w-full sm:w-[279px]`}>
      <span className="text-[11px] leading-[13px] text-muted">Selected Supplier</span>
      <span className="flex items-center justify-between gap-2">
        <span className={`truncate text-[13px] font-semibold leading-[18px] ${selected ? "text-ink" : "text-placeholder"}`}>
          {display}
        </span>
        <ChevronDown size={16} strokeWidth={2.25} className="shrink-0 text-muted" aria-hidden="true" />
      </span>
      <select
        aria-label="Selected supplier"
        value={value}
        disabled={lookup.status !== "success"}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
      >
        <option value="" disabled>
          Select a supplier
        </option>
        {lookup.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateRangePicker({ range, onApply }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(range);
  const popoverId = useId();
  const triggerRef = useRef(null);
  const isInvalid = Boolean(draft.fromDate && draft.toDate && draft.toDate < draft.fromDate);
  const label =
    range.fromDate || range.toDate
      ? `${formatDate(range.fromDate)} - ${formatDate(range.toDate)}`
      : "Default statement period";

  function handleToggle() {
    setDraft(range);
    setIsOpen((open) => !open);
  }

  function handleApply(event) {
    event.preventDefault();
    if (isInvalid) return;
    onApply(draft);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleReset() {
    onApply({ fromDate: "", toDate: "" });
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="relative w-full sm:w-[218px]">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        className={`${BOX_CLASS} w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy`}
      >
        <span className="text-[11px] leading-[13px] text-muted">Date Range</span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-semibold leading-[18px] text-ink">{label}</span>
          <Calendar size={16} className="shrink-0 text-muted" aria-hidden="true" />
        </span>
      </button>
      {isOpen && (
        <form
          id={popoverId}
          onSubmit={handleApply}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
              triggerRef.current?.focus();
            }
          }}
          className="absolute left-0 top-[52px] z-30 w-[260px] rounded-lg border border-line bg-surface p-3 shadow-[0_12px_32px_rgba(16,27,55,0.16)]"
        >
          <label className="block text-[12px] font-semibold text-ink" htmlFor={`${popoverId}-from`}>
            From
          </label>
          <input
            id={`${popoverId}-from`}
            type="date"
            value={draft.fromDate}
            onChange={(event) => setDraft((current) => ({ ...current, fromDate: event.target.value }))}
            className={`${INPUT_CLASS} mt-1`}
          />
          <label className="mt-2 block text-[12px] font-semibold text-ink" htmlFor={`${popoverId}-to`}>
            To
          </label>
          <input
            id={`${popoverId}-to`}
            type="date"
            value={draft.toDate}
            min={draft.fromDate || undefined}
            aria-invalid={isInvalid || undefined}
            onChange={(event) => setDraft((current) => ({ ...current, toDate: event.target.value }))}
            className={`${INPUT_CLASS} mt-1`}
          />
          {isInvalid && <p className="mt-1 text-[11px] text-danger">End date cannot be before start date.</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="h-[31px] rounded-md px-3 text-[12px] font-semibold text-muted hover:bg-workspace"
            >
              Reset
            </button>
            <button type="submit" className="h-[31px] rounded-md bg-navy px-3 text-[12px] font-semibold text-white">
              Apply
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function LedgerToolbar({ supplierId, supplierLookup, range, onSupplierChange, onRangeChange, onExport, exportingFormat }) {
  const canExport = Boolean(supplierId) && !exportingFormat;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
        <SupplierPicker value={supplierId} lookup={supplierLookup} onChange={onSupplierChange} />
        <DateRangePicker range={range} onApply={onRangeChange} />
      </div>
      <div className="flex items-center gap-2.5">
        <OutlineButton icon={Download} disabled={!canExport} onClick={() => onExport("xlsx")}>
          {exportingFormat === "xlsx" ? "Exporting…" : "Export Excel"}
        </OutlineButton>
        <OutlineButton icon={Printer} disabled={!canExport} onClick={() => onExport("pdf")}>
          {exportingFormat === "pdf" ? "Preparing…" : "Print PDF"}
        </OutlineButton>
      </div>
    </div>
  );
}

export default LedgerToolbar;
