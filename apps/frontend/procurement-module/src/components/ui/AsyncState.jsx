import { CircleAlert, FileSearch, Inbox, LoaderCircle, LockKeyhole, ShieldAlert, WifiOff } from "lucide-react";
import { describeError } from "./errorMessages.js";

const ERROR_ICONS = {
  not_configured: WifiOff,
  network: WifiOff,
  unavailable: WifiOff,
  unauthorized: LockKeyhole,
  forbidden: ShieldAlert,
  not_found: FileSearch,
};

function StateFrame({ icon: Icon, iconClass = "text-muted", title, message, action, compact }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-4 text-center ${compact ? "py-8" : "py-14"}`}
    >
      <Icon size={compact ? 20 : 24} className={iconClass} aria-hidden="true" />
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      {message && <p className="max-w-md text-[12px] leading-[18px] text-muted">{message}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…", compact }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center gap-2 ${compact ? "py-8" : "py-14"}`}>
      <LoaderCircle size={18} className="animate-spin text-muted" aria-hidden="true" />
      <span className="text-[12px] text-muted">{label}</span>
    </div>
  );
}

export function EmptyState({ title = "No records found", message, compact }) {
  return <StateFrame icon={Inbox} title={title} message={message} compact={compact} />;
}

export function ErrorState({ error, onRetry, compact }) {
  const { title, message, canRetry } = describeError(error);
  const Icon = ERROR_ICONS[error?.kind] ?? CircleAlert;
  return (
    <div role="alert">
      <StateFrame
        icon={Icon}
        iconClass={error?.kind === "forbidden" ? "text-brand" : "text-muted"}
        title={title}
        message={message}
        compact={compact}
        action={
          canRetry && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 h-[31px] rounded-md border border-line bg-surface px-3 text-[12px] font-semibold text-ink hover:bg-workspace focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Try again
            </button>
          ) : null
        }
      />
    </div>
  );
}

/** Picks the loading, error, or empty state for a resource; renders `children` when data is present. */
export function ResourceBoundary({ resource, isEmpty, emptyTitle, emptyMessage, compact, children }) {
  if (resource.status === "loading") return <LoadingState compact={compact} />;
  if (resource.status === "error") return <ErrorState error={resource.error} onRetry={resource.reload} compact={compact} />;
  if (isEmpty) return <EmptyState title={emptyTitle} message={emptyMessage} compact={compact} />;
  return children;
}
