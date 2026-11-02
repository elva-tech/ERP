import React from "react";
import { Calendar, X, AlertCircle } from "lucide-react";

/**
 * ERP Date Range Filter with start/end date inputs, validation, and clear button.
 */
export default function DateRangeFilter({
  startDate = "",
  endDate = "",
  onStartDateChange,
  onEndDateChange,
  onClear,
  label = "Date Range",
  className = "",
}) {
  const isInvalidRange = Boolean(startDate && endDate && startDate > endDate);
  const hasValue = Boolean(startDate || endDate);

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <div
        className={`inline-flex h-[31px] items-center gap-1.5 rounded-md border bg-surface px-2 text-[12px] transition-colors ${
          isInvalidRange ? "border-danger ring-1 ring-danger/30" : "border-line hover:border-slate-400"
        }`}
      >
        <Calendar size={13} className="text-muted shrink-0" aria-hidden="true" />
        <span className="text-[11px] font-medium text-muted hidden sm:inline">{label}:</span>

        <input
          type="date"
          aria-label="Start date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="h-full bg-transparent text-[11px] font-medium text-ink focus:outline-none cursor-pointer"
        />

        <span className="text-muted text-[11px]">to</span>

        <input
          type="date"
          aria-label="End date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="h-full bg-transparent text-[11px] font-medium text-ink focus:outline-none cursor-pointer"
        />

        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            title="Clear date filter"
            aria-label="Clear date range"
            className="p-0.5 text-muted hover:text-ink rounded transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {isInvalidRange && (
        <span
          role="alert"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-danger bg-danger-soft px-1.5 py-0.5 rounded"
        >
          <AlertCircle size={11} /> Start date cannot be after end date
        </span>
      )}
    </div>
  );
}

