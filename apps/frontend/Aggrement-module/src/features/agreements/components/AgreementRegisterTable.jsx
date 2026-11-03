import { useState } from "react";
import { MoreVertical, Eye, FileText, AlertCircle } from "lucide-react";
import { StatusBadge } from "../../../components/ui/Badge.jsx";
import { formatDate, formatInr } from "../../../lib/formatters.js";

export function AgreementRegisterTable({
  agreements = [],
  isLoading = false,
  error = null,
  onRetry,
  onViewAgreement,
  hasActiveFilters = false,
  onClearFilters,
}) {
  const [activeActionId, setActiveActionId] = useState(null);
  const [expandedScopeId, setExpandedScopeId] = useState(null);

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-line bg-surface-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Agreement No</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Subcontractor</th>
              <th className="px-3 py-3">Project / Site</th>
              <th className="px-4 py-3">Scope of Work</th>
              <th className="px-3 py-3 text-right">Agreement Value</th>
              <th className="px-3 py-3">Start Date</th>
              <th className="px-3 py-3">End Date</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {Array.from({ length: 6 }).map((_, idx) => (
              <tr key={idx} className="animate-pulse">
                <td className="px-4 py-3.5"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                <td className="px-3 py-3.5"><div className="h-4 w-16 rounded bg-slate-100" /></td>
                <td className="px-3 py-3.5"><div className="h-4 w-28 rounded bg-slate-200" /></td>
                <td className="px-3 py-3.5"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                <td className="px-4 py-3.5"><div className="h-4 w-44 rounded bg-slate-100" /></td>
                <td className="px-3 py-3.5 text-right"><div className="ml-auto h-4 w-20 rounded bg-slate-200" /></td>
                <td className="px-3 py-3.5"><div className="h-4 w-16 rounded bg-slate-100" /></td>
                <td className="px-3 py-3.5"><div className="h-4 w-16 rounded bg-slate-100" /></td>
                <td className="px-3 py-3.5"><div className="h-5 w-16 rounded-full bg-slate-200" /></td>
                <td className="px-3 py-3.5 text-center"><div className="mx-auto size-5 rounded bg-slate-100" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-rose-50 text-rose-600">
          <AlertCircle size={24} aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-[15px] font-bold text-ink">Failed to load agreements</h3>
        <p className="mt-1 max-w-md text-[13px] text-muted">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-8 items-center rounded-lg bg-navy-dark px-4 text-[12px] font-semibold text-white hover:bg-navy"
          >
            Retry Request
          </button>
        )}
      </div>
    );
  }

  if (agreements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-slate-100 text-muted">
          <FileText size={24} aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-[15px] font-bold text-ink">
          {hasActiveFilters ? "No matching agreements found" : "No agreements in register"}
        </h3>
        <p className="mt-1 max-w-md text-[13px] text-muted">
          {hasActiveFilters
            ? "Try adjusting your search criteria or resetting the status filter."
            : "No subcontract agreement records currently exist for this organization scope."}
        </p>
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 inline-flex h-8 items-center rounded-lg border border-line bg-surface px-4 text-[12px] font-semibold text-ink hover:bg-slate-50"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-[13px]" aria-label="Subcontract Agreements">
        <thead className="border-b border-line bg-surface-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="w-[125px] px-4 py-3">Agreement No</th>
            <th scope="col" className="w-[100px] px-3 py-3">Date</th>
            <th scope="col" className="w-[170px] px-3 py-3">Subcontractor</th>
            <th scope="col" className="w-[160px] px-3 py-3">Project / Site</th>
            <th scope="col" className="min-w-[200px] px-4 py-3">Scope of Work</th>
            <th scope="col" className="w-[145px] px-3 py-3 text-right">Agreement Value</th>
            <th scope="col" className="w-[105px] px-3 py-3">Start Date</th>
            <th scope="col" className="w-[105px] px-3 py-3">End Date</th>
            <th scope="col" className="w-[110px] px-3 py-3">Status</th>
            <th scope="col" className="w-[60px] px-3 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {agreements.map((agr) => {
            const isMenuOpen = activeActionId === agr.id;
            const isScopeExpanded = expandedScopeId === agr.id;
            const scopeText = agr.scopeOfWork || agr.scopeSummary || "—";
            const isLongScope = scopeText.length > 55;

            return (
              <tr
                key={agr.id}
                className="group transition-colors hover:bg-slate-50/70"
              >
                {/* 1. Agreement No */}
                <td className="px-4 py-3.5 font-bold text-navy">
                  <button
                    type="button"
                    onClick={() => onViewAgreement && onViewAgreement(agr)}
                    className="hover:underline focus-visible:outline-2 focus-visible:outline-navy"
                  >
                    {agr.agreementNumber}
                  </button>
                </td>

                {/* 2. Date */}
                <td className="px-3 py-3.5 text-muted whitespace-nowrap">
                  {formatDate(agr.agreementDate)}
                </td>

                {/* 3. Subcontractor */}
                <td className="px-3 py-3.5 font-semibold text-ink">
                  <div className="truncate max-w-[160px]" title={agr.subcontractor?.name}>
                    {agr.subcontractor?.name || "—"}
                  </div>
                </td>

                {/* 4. Project / Site */}
                <td className="px-3 py-3.5 text-ink-soft">
                  <div className="truncate max-w-[150px]" title={agr.projectName}>
                    {agr.projectName || "—"}
                  </div>
                </td>

                {/* 5. Scope of Work (Safe truncation with inspection) */}
                <td className="px-4 py-3.5 text-ink">
                  <div className="relative">
                    <p className={`text-[12px] leading-relaxed ${isScopeExpanded ? "" : "line-clamp-2 max-w-[280px]"}`}>
                      {scopeText}
                    </p>
                    {isLongScope && (
                      <button
                        type="button"
                        onClick={() => setExpandedScopeId(isScopeExpanded ? null : agr.id)}
                        className="mt-0.5 text-[10px] font-semibold text-navy hover:underline"
                      >
                        {isScopeExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                </td>

                {/* 6. Agreement Value */}
                <td className="px-3 py-3.5 text-right font-bold text-ink whitespace-nowrap">
                  {formatInr(agr.agreementValue, { fractionDigits: 0 })}
                </td>

                {/* 7. Start Date */}
                <td className="px-3 py-3.5 text-muted whitespace-nowrap">
                  {formatDate(agr.startDate)}
                </td>

                {/* 8. End Date */}
                <td className="px-3 py-3.5 text-muted whitespace-nowrap">
                  {formatDate(agr.endDate)}
                </td>

                {/* 9. Status */}
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <StatusBadge status={agr.status} />
                </td>

                {/* Actions */}
                <td className="relative px-3 py-3.5 text-center whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setActiveActionId(isMenuOpen ? null : agr.id)}
                    aria-label={`Actions for ${agr.agreementNumber}`}
                    className="grid size-7 place-items-center rounded text-muted hover:bg-slate-200/60 hover:text-ink focus-visible:outline-2 focus-visible:outline-navy"
                  >
                    <MoreVertical size={16} aria-hidden="true" />
                  </button>

                  {isMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-4 top-10 z-20 w-36 overflow-hidden rounded-lg border border-line bg-surface py-1 text-left shadow-[0_8px_20px_rgba(15,23,42,0.14)]"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveActionId(null);
                          if (onViewAgreement) onViewAgreement(agr);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-ink hover:bg-slate-50"
                      >
                        <Eye size={14} className="text-muted" aria-hidden="true" />
                        <span>View Details</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

