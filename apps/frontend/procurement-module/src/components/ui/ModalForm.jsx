import { CircleAlert } from "lucide-react";
import { describeError } from "./errorMessages.js";

/**
 * Form body + footer shared by every creation modal.
 * The primary action shows a pending state and is disabled while the server request runs.
 */
const SUBMIT_TONES = {
  brand: "bg-brand-strong hover:bg-brand-hover focus-visible:outline-brand",
  success: "bg-success hover:bg-[#059669] focus-visible:outline-success",
  danger: "bg-danger hover:bg-[#dc2626] focus-visible:outline-danger",
};

function ModalForm({ onSubmit, onCancel, submitLabel, isSubmitting, formError, submitTone = "brand", children }) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-[15px]">
        {formError && <FormErrorBanner error={formError} />}
        {children}
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-field-line bg-modal-footer px-6 pb-[14px] pt-[13px] sm:flex-row sm:items-start sm:justify-between">
        <p className="pt-1 text-[10px] leading-[14px] text-placeholder">Fields marked required must be completed</p>
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-[35px] rounded-md border border-field-line bg-surface px-4 text-[13px] font-semibold text-muted hover:bg-workspace focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`h-[35px] rounded-md px-5 text-[13px] font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70 ${SUBMIT_TONES[submitTone]}`}
          >
            {isSubmitting ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

function FormErrorBanner({ error }) {
  const { title, message } = describeError(error);
  const detail = error?.kind === "validation" ? error.message : message;
  return (
    <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5">
      <CircleAlert size={16} className="mt-px shrink-0 text-danger" aria-hidden="true" />
      <div className="text-[12px] leading-[17px]">
        <p className="font-semibold text-ink">{error?.kind === "validation" ? "Please review the highlighted fields" : title}</p>
        {detail && <p className="text-ink-soft">{detail}</p>}
        {error?.requestId && <p className="mt-0.5 text-muted">Reference: {error.requestId}</p>}
      </div>
    </div>
  );
}

export default ModalForm;
