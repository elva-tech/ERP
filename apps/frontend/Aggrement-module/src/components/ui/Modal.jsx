import { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";

export function Modal({
  title,
  description,
  children,
  onClose,
  isDirty = false,
  width = "max-w-2xl",
}) {
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        handleRequestClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty]);

  function handleRequestClose() {
    if (isDirty) {
      setShowConfirmDiscard(true);
    } else {
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0b1226]/60 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={handleRequestClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative z-10 flex w-full flex-col rounded-2xl border border-line bg-surface shadow-[0_20px_50px_rgba(15,23,42,0.2)] max-h-[92vh] ${width}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-[17px] font-bold text-ink sm:text-[18px]">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[12px] text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Close dialog"
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-navy"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Unsaved Changes Confirmation Dialog */}
        {showConfirmDiscard && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-xs p-6">
            <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-5 shadow-xl text-center">
              <div className="mx-auto grid size-11 place-items-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle size={22} aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-[15px] font-bold text-ink">Discard unsaved changes?</h3>
              <p className="mt-1 text-[12px] text-muted">
                You have unsaved changes in this agreement. If you close now, your progress will be lost.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmDiscard(false)}
                  className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-[12px] font-semibold text-ink-soft hover:bg-slate-50"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDiscard(false);
                    onClose();
                  }}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-700"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
