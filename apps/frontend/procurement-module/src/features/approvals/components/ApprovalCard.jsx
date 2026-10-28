import { StatusBadge } from "../../../components/ui/Badge.jsx";
import ViewLink from "../../../components/ui/ViewLink.jsx";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { APPROVAL_PRIORITY_BADGES } from "../approvalOptions.js";

function Field({ label, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[11px] leading-[14px] text-muted">{label}</p>
      <div className="mt-0.5 truncate text-[12px] leading-[18px]">{children}</div>
    </div>
  );
}

/** One pending approval request. Approve/Reject are offered only when the backend allows them for this user. */
function ApprovalCard({ approval, onApprove, onReject }) {
  const canApprove = approval.allowedActions?.approve !== false;
  const canReject = approval.allowedActions?.reject !== false;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-3 lg:grid lg:min-h-[66px] lg:grid-cols-[28px_220px_160px_120px_140px_90px_minmax(0,1fr)_auto] lg:items-center lg:gap-0 lg:py-2 lg:pl-6 lg:pr-4">
      <input
        type="checkbox"
        disabled
        aria-label={`Select ${approval.document?.number} for bulk approval (bulk approval policy pending)`}
        className="hidden size-[14px] rounded border-line lg:block"
      />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase leading-[13px] text-muted">{approval.documentTypeLabel}</p>
        <h2 className="truncate text-[13px] font-bold leading-[18px] text-ink">{displayText(approval.document?.number)}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:contents">
        <Field label="Requested By">
          <span className="font-semibold text-ink">{displayText(approval.requestedBy?.displayName)}</span>
        </Field>
        <Field label="Submitted On">
          <span className="text-ink">{formatDate(approval.submittedAt)}</span>
        </Field>
        <Field label="Est. Amount">
          <span className="text-[15px] font-bold text-brand">{formatInr(approval.amount)}</span>
        </Field>
        <Field label="Priority">
          <StatusBadge status={approval.priority} statusMap={APPROVAL_PRIORITY_BADGES} className="h-4 px-1.5 text-[9px]" />
        </Field>
      </div>
      <Field label="Description" className="lg:pr-3">
        <span className="text-ink" title={approval.description ?? undefined}>
          {displayText(approval.description)}
        </span>
      </Field>
      <div className="flex items-center gap-2">
        <span className="mr-1 text-[12px]">
          <ViewLink
            recordType={approval.documentType}
            recordId={approval.document?.id}
            documentNumber={approval.document?.number}
            label="Details"
          />
        </span>
        {canReject && (
          <button
            type="button"
            onClick={() => onReject(approval)}
            className="h-[31px] rounded-md bg-danger px-[18px] text-[12px] font-semibold text-white hover:bg-[#dc2626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            Reject
          </button>
        )}
        {canApprove && (
          <button
            type="button"
            onClick={() => onApprove(approval)}
            className="h-[31px] rounded-md bg-success px-[18px] text-[12px] font-semibold text-white hover:bg-[#059669] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
          >
            Approve
          </button>
        )}
      </div>
    </article>
  );
}

export default ApprovalCard;
