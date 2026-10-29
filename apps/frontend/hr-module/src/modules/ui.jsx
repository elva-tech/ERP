import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { inputClass, primaryButton, secondaryButton } from "./helpers";

export function Notice({ notice, onClose }) {
  if (!notice) return null;
  const variants = {
    error: { tone: "border-red-200 bg-red-50 text-red-800", Icon: AlertCircle },
    info: { tone: "border-brand-100 bg-brand-50 text-brand-700", Icon: Info },
    success: { tone: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CheckCircle2 },
  };
  const { tone, Icon } = variants[notice.type] || variants.success;
  return (
    <div role={notice.type === "error" ? "alert" : "status"} className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${tone}`}>
      <span className="flex items-start gap-2">
        <Icon size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{notice.message}</span>
      </span>
      {onClose && (
        <button type="button" aria-label="Dismiss message" onClick={onClose} className="shrink-0 rounded opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

const ICON_TONES = {
  brand: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  slate: "bg-slate-100 text-slate-600",
};

/**
 * stats: [{ label, value, note?, tone? (value text class), icon?, iconTone?, onClick?, actionLabel? }]
 * Cards with onClick render as buttons so they are keyboard reachable.
 */
export function StatGrid({ stats }) {
  return (
    <div className={`grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 ${stats.length > 4 ? "xl:grid-cols-3 2xl:grid-cols-6" : "xl:grid-cols-4"}`}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
              {Icon && (
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ICON_TONES[stat.iconTone] || ICON_TONES.brand}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
              )}
            </div>
            <p className={`mt-2 break-words text-2xl font-bold ${stat.tone || "text-slate-900"}`}>{stat.value}</p>
            {stat.note && <p className="mt-1 text-xs text-slate-500">{stat.note}</p>}
          </>
        );
        const card = "rounded-xl border border-line bg-white p-5 text-left shadow-sm";
        return stat.onClick ? (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            aria-label={`${stat.label}: ${stat.value}. ${stat.actionLabel || "Open"}`}
            className={`${card} transition hover:border-brand-200 hover:shadow-md`}
          >
            {body}
          </button>
        ) : (
          <div key={stat.label} className={card}>{body}</div>
        );
      })}
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, padded = true, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-line bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <h4 className="font-semibold text-slate-900">{title}</h4>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** columns: [{ key, label, render?(row), className? }] */
export function DataTable({ columns, rows, loading, error, empty = "No records found.", rowKey = (row) => row.id }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500" aria-busy="true">Loading…</td></tr>
          ) : error ? (
            <tr><td colSpan={columns.length} role="alert" className="px-4 py-10 text-center text-red-600">{error}</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">{empty}</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-brand-50/40">
                {columns.map((column) => (
                  <td key={column.key} className={`whitespace-nowrap px-4 py-3 ${column.className || "text-slate-700"}`}>
                    {column.render ? column.render(row) : row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const GREEN = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
const AMBER = "bg-amber-50 text-amber-700 ring-amber-600/20";
const RED = "bg-red-50 text-red-700 ring-red-600/20";
const BLUE = "bg-brand-50 text-brand-700 ring-brand-600/20";
const GREY = "bg-slate-100 text-slate-600 ring-slate-500/20";

const BADGE_TONES = {
  Active: GREEN,
  Approved: GREEN,
  Present: GREEN,
  Completed: GREEN,
  Generated: GREEN,
  Online: GREEN,
  Verified: GREEN,
  Finalized: GREEN,
  Primary: BLUE,
  Provisional: AMBER,
  Pending: AMBER,
  Draft: AMBER,
  Late: "bg-orange-50 text-orange-700 ring-orange-600/20",
  "Half Day": AMBER,
  "Missing Punch": RED,
  Absent: RED,
  Rejected: RED,
  Offline: RED,
  Cancelled: GREY,
  Revoked: GREY,
  Expired: GREY,
  Accepted: GREEN,
  Suspended: RED,
  Inactive: GREY,
  Closed: GREY,
  "On Leave": BLUE,
  Holiday: BLUE,
};

/** Shown instead of Approve/Reject on the viewer's own request; the server refuses self-approval. */
export function AwaitingApprover() {
  return <span className="text-xs italic text-slate-500">Awaiting another approver</span>;
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONES[status] || GREY}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {status || "—"}
    </span>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/50 p-3 backdrop-blur-[1px] sm:items-center sm:p-6">
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col ${wide ? "max-w-4xl" : "max-w-xl"} rounded-xl bg-white shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)]`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}

/** Rendered by useConfirm (./useConfirm.js); not used directly. */
export function ConfirmDialog({ request, onSettle }) {
  const [value, setValue] = useState(request.input?.defaultValue == null ? "" : String(request.input.defaultValue));
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function settle(confirmed) {
    onSettle(request.input ? (confirmed ? value : null) : confirmed);
  }

  const input = request.input;
  return (
    <Modal title={request.title || "Please confirm"} onClose={() => settle(false)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          settle(true);
        }}
      >
        <div className="flex gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${request.danger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`} aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            {request.message && <p className="text-sm leading-6 text-slate-700">{request.message}</p>}
            {input && (
              <label className="block text-xs font-semibold text-slate-600">
                {input.label}
                {input.required && <span className="text-red-500"> *</span>}
                {input.type === "number" ? (
                  <input ref={inputRef} type="number" required={input.required} min={input.min} step={input.step} value={value} onChange={(event) => setValue(event.target.value)} className={`${inputClass} mt-1.5`} />
                ) : (
                  <textarea ref={inputRef} rows={3} required={input.required} value={value} onChange={(event) => setValue(event.target.value)} className={`${inputClass} mt-1.5`} />
                )}
              </label>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => settle(false)} className={secondaryButton}>
            {request.cancelLabel || "Cancel"}
          </button>
          <button
            type="submit"
            className={request.danger ? primaryButton.replace("bg-brand-600", "bg-red-600").replace("hover:bg-brand-700", "hover:bg-red-700") : primaryButton}
          >
            {request.confirmLabel || "Confirm"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Field({ label, required, children, className = "" }) {
  return (
    <label className={`block text-xs font-semibold text-slate-600 ${className}`}>
      <span>
        {label}
        {required && <span className="text-red-500" aria-hidden="true"> *</span>}
      </span>
      <div className="mt-1.5 font-normal">{children}</div>
    </label>
  );
}

export function EmployeeSelect({ employees, value, onChange, includeAll = false, required = false, activeOnly = true }) {
  const list = activeOnly ? employees.filter((e) => e.status === "Active" || String(e.id) === String(value)) : employees;
  return (
    <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      <option value="">{includeAll ? "All employees" : "Select employee"}</option>
      {list.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.name} ({employee.employeeCode || employee.id})
        </option>
      ))}
    </select>
  );
}
