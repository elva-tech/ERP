import { ShieldAlert } from "lucide-react";
import { primaryButton } from "../modules/helpers";

export function AccessDenied({
  title = "Access denied",
  message = "You do not have permission to open this page. If you need access, contact your company administrator.",
  onBack,
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-8" role="alert">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger"
          aria-hidden="true"
        >
          <ShieldAlert size={20} />
        </span>
        <div>
          <h3 className="text-xl font-bold text-ink">{title}</h3>
          <p className="mt-2 text-[13px] leading-6 text-muted">{message}</p>
          {typeof onBack === "function" && (
            <button type="button" onClick={onBack} className={`${primaryButton} mt-5`}>
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}