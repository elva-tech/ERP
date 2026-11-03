import { useState } from "react";
import { X, FileText, CheckCircle2, Calendar, ShieldCheck, Download, Clock } from "lucide-react";
import { StatusBadge } from "../../../components/ui/Badge.jsx";
import { formatDate, formatInr } from "../../../lib/formatters.js";
import { useSession } from "../../auth/sessionContext.js";

export function AgreementDetailDrawer({ agreement, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const { session } = useSession();

  if (!agreement) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0b1226]/50 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-line px-6 py-4 bg-surface-muted/30">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[14px] font-bold tracking-wide text-navy">
                {agreement.agreementNumber}
              </span>
              <StatusBadge status={agreement.status} />
            </div>
            <h2 className="mt-1 text-[17px] font-bold text-ink sm:text-[19px]">
              {agreement.title || "Subcontract Agreement"}
            </h2>
            <p className="text-[12px] text-muted">
              {agreement.subcontractor?.name} • {agreement.projectName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail view"
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-line px-6 text-[13px] font-medium text-muted">
          {[
            { id: "overview", label: "Overview" },
            { id: "documents", label: "Documents" },
            { id: "clauses", label: "Clauses & Terms" },
            { id: "dates", label: "Important Dates" },
            { id: "activity", label: "Activity / Audit" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-3 py-3 transition-colors ${
                activeTab === tab.id
                  ? "border-navy font-bold text-navy"
                  : "border-transparent hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-[13px]">
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Key Commercial Metrics */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-surface-muted/40 p-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted">Agreement Value</span>
                  <p className="mt-1 text-[18px] font-bold text-ink">
                    {formatInr(agreement.agreementValue, { fractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted">Payment Terms</span>
                  <p className="mt-1 font-semibold text-ink-soft">
                    {agreement.paymentSchedule || "Standard Progress Billing"}
                  </p>
                </div>
              </div>

              {/* Scope of Work */}
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-muted">Scope of Work</h4>
                <div className="mt-2 rounded-lg border border-line/80 bg-surface p-3.5 text-ink leading-relaxed">
                  {agreement.scopeOfWork || agreement.scopeSummary || "No scope summary documented."}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 border-t border-line/70 pt-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted">Agreement Date</span>
                  <p className="mt-0.5 font-medium text-ink">{formatDate(agreement.agreementDate)}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted">Agreement Owner</span>
                  <p className="mt-0.5 font-medium text-ink">{agreement.owner || "Project Dept"}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted">Contract Duration</span>
                  <p className="mt-0.5 font-medium text-ink">
                    {formatDate(agreement.startDate)} to {formatDate(agreement.endDate)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted">Classification</span>
                  <p className="mt-0.5 font-medium text-ink">{agreement.type || "Subcontract"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-line p-3.5 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded bg-red-50 text-red-600">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{agreement.agreementNumber}_Executed_Contract.pdf</p>
                    <p className="text-[11px] text-muted">Version 1.0 • Digitally signed & verified</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] font-medium text-ink hover:bg-white"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "clauses" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-line p-4">
                <h5 className="font-bold text-ink">Terms & Conditions</h5>
                <p className="mt-2 text-ink-soft leading-relaxed whitespace-pre-line">
                  {agreement.termsAndConditions || "Standard Subcontract Terms & Conditions apply to this agreement."}
                </p>
              </div>
            </div>
          )}

          {activeTab === "dates" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-line p-3">
                <Calendar size={18} className="text-muted" />
                <div>
                  <p className="font-semibold text-ink">Effective Date: {formatDate(agreement.startDate)}</p>
                  <p className="text-[11px] text-muted">Work authorization commences</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-line p-3">
                <Clock size={18} className="text-amber-600" />
                <div>
                  <p className="font-semibold text-ink">Expiry Date: {formatDate(agreement.endDate)}</p>
                  <p className="text-[11px] text-muted">Contract term conclusion</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 border-l-2 border-navy pl-3 py-1">
                <div>
                  <p className="font-semibold text-ink">Agreement Record Created</p>
                  <p className="text-[11px] text-muted">By {session?.user?.displayName || "Authorized Officer"} on {formatDate(agreement.agreementDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-l-2 border-emerald-500 pl-3 py-1">
                <div>
                  <p className="font-semibold text-ink">Status Updated to Active</p>
                  <p className="text-[11px] text-muted">Approved by Executive Committee</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex shrink-0 items-center justify-between border-t border-line px-6 py-3.5 bg-surface-muted/20">
          <div className="text-[11px] text-muted">Tenant: {session?.tenant?.name || "Enterprise Tenant"}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-navy-dark px-4 py-2 text-[12px] font-semibold text-white hover:bg-navy"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

