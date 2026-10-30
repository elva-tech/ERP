
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { withQuery } from "../../api";
import { formatDate, formatMoney, useApi } from "../helpers";

const popoverClass =
  "absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-line bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.14)]";

function useDismiss(open, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    function onPointer(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        closeRef.current();
      }
    }

    function onKey(event) {
      if (event.key === "Escape") closeRef.current();
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return ref;
}

/** Pending approval requests this member is permitted to review. */
export default function ApprovalNotificationBell({
  companyId,
  onOpenApprovals,
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const pending = useApi(withQuery("/api/approvals/pending", { companyId }));
  const data = pending.data || {};

  const items = [
    ...(data.leaveRequests || []).map((r) => ({
      key: `l${r.id}`,
      title: `${r.employee_name} · ${r.leave_type_name}`,
      detail: `Leave ${formatDate(r.from_date)} – ${formatDate(r.to_date)} (${r.days} day${r.days === 1 ? "" : "s"})`,
    })),
    ...(data.regularizations || []).map((r) => ({
      key: `r${r.id}`,
      title: `${r.employee_name} · Regularization`,
      detail: `Attendance on ${formatDate(r.attendance_date)}`,
    })),
    ...(data.advances || []).map((r) => ({
      key: `a${r.id}`,
      title: `${r.employee_name} · Advance`,
      detail: `${formatMoney(r.amount)}${r.purpose ? ` · ${r.purpose}` : ""}`,
    })),
  ];

  const count = items.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) pending.reload();
          setOpen(!open);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          count ? `Approvals: ${count} pending` : "Approvals: none pending"
        }
        className="relative grid size-9 place-items-center rounded-full bg-workspace text-ink hover:bg-line"
      >
        <Bell size={18} strokeWidth={2.25} aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-surface ring-2 ring-surface">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pending approvals"
          className={`${popoverClass} w-[min(22rem,calc(100vw-2rem))]`}
        >
          <div className="border-b border-line px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">
              Pending approvals
            </p>
            <p className="text-xs text-muted">
              Requests you are allowed to review
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {pending.loading ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted">
                Loading…
              </p>
            ) : pending.error ? (
              <p
                role="alert"
                className="px-4 py-6 text-center text-[13px] text-danger"
              >
                {pending.error}
              </p>
            ) : count === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted">
                Nothing is waiting for your review.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {items.slice(0, 8).map((item) => (
                  <li key={item.key} className="px-4 py-3">
                    <p className="text-[13px] font-medium text-ink">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted">{item.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenApprovals();
              }}
              className="w-full rounded-md px-3 py-2 text-[13px] font-semibold text-link hover:bg-info-soft"
            >
              Open My Approvals{count > 8 ? ` (${count - 8} more)` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
