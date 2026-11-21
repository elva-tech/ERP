import { CircleAlert, CircleCheck } from "lucide-react";

/** Success toasts are only raised after a server-confirmed operation. */
function Toast({ toast }) {
  const Icon = toast?.tone === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-5 z-50 flex justify-center sm:inset-x-auto sm:right-6"
    >
      {toast && (
        <div className="flex max-w-sm items-center gap-2.5 rounded-lg bg-sidebar px-4 py-3 text-[12.5px] text-white shadow-[0_12px_32px_rgba(16,27,55,0.3)]">
          <Icon
            size={16}
            className={`shrink-0 ${toast.tone === "error" ? "text-danger" : "text-success"}`}
            aria-hidden="true"
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default Toast;
