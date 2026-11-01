import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Inbox, Info, LoaderCircle, Search, X } from "lucide-react";
import { compactInputClass, dangerSolidButton, initials, inputClass, submitButton, secondaryButton } from "./helpers";

/** notice: { type: "success" | "error" | "info", message }; action: optional { label, onClick }. */
export function Notice({ notice, onClose, action }) {
  if (!notice) return null;
  const variants = {
    error: { tone: "border-danger/30 bg-danger-soft text-danger", Icon: AlertCircle },
    info: { tone: "border-info/30 bg-info-soft text-info", Icon: Info },
    success: { tone: "border-success/30 bg-success-muted text-success", Icon: CheckCircle2 },
  };
  const { tone, Icon } = variants[notice.type] || variants.success;
  return (
    <div role={notice.type === "error" ? "alert" : "status"} className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-[13px] ${tone}`}>
      <span className="flex items-start gap-2">
        <Icon size={17} className="mt-px shrink-0" aria-hidden="true" />
        <span>{notice.message}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {action && (
          <button type="button" onClick={action.onClick} className="rounded-md border border-current/30 px-2.5 py-1 text-xs font-semibold hover:bg-surface/60">
            {action.label}
          </button>
        )}
        {onClose && (
          <button type="button" aria-label="Dismiss message" onClick={onClose} className="rounded opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        )}
      </span>
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
      {message}
    </p>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-xl font-bold text-ink">{title}</h3>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

const STAT_COLUMNS = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-3 xl:grid-cols-6",
  7: "sm:grid-cols-4 xl:grid-cols-7",
  8: "sm:grid-cols-4 xl:grid-cols-8",
};

/**
 * stats: [{ label, value, note?, badge?, tone? (value text class), alert?, onClick?, actionLabel? }]
 * Uppercase label, large value with an optional badge pill beside it, note underneath (Figma card pattern).
 * Cards with onClick render as buttons so they are keyboard reachable.
 */
export function StatGrid({ stats }) {
  return (
    <div className={`grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 ${STAT_COLUMNS[Math.min(stats.length, 8)] || STAT_COLUMNS[8]}`}>
      {stats.map((stat) => {
        const body = (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{stat.label}</p>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className={`break-words text-2xl font-bold leading-8 ${stat.tone || "text-navy"}`}>{stat.value}</p>
              {stat.badge && <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${stat.alert ? "bg-danger-soft text-danger" : "bg-sent-soft text-navy"}`}>{stat.badge}</span>}
            </div>
            {stat.note && <p className="mt-1 text-xs text-muted">{stat.note}</p>}
          </>
        );
        const card = `rounded-lg border bg-surface px-4 py-3.5 text-left ${stat.alert ? "border-danger" : "border-line"}`;
        return stat.onClick ? (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            aria-label={`${stat.label}: ${stat.value}. ${stat.actionLabel || "Open"}`}
            className={`${card} transition-colors hover:bg-surface-muted`}
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
    <section className={`overflow-hidden rounded-lg border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && <h4 className="text-[15px] font-semibold text-ink">{title}</h4>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** Search box used in page and panel toolbars. */
export function SearchField({ label, value, onChange, placeholder, className = "" }) {
  return (
    <label className={`flex h-9 min-w-0 items-center gap-2 rounded-md border border-field-line bg-field px-3 text-muted transition-colors focus-within:border-brand focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-soft ${className}`}>
      <Search size={15} className="shrink-0" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-placeholder"
      />
    </label>
  );
}

export function Avatar({ name, size = "md" }) {
  const sizes = { sm: "size-8 text-[11px]", md: "size-9 text-xs" };
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand ${sizes[size] || sizes.md}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function TableState({ icon: Icon, tone = "text-muted", spin = false, children, role }) {
  return (
    <div role={role} className={`flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-[13px] ${tone}`}>
      <Icon size={20} className={spin ? "animate-spin" : ""} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** columns: [{ key, label, render?(row), className?, wrap? }]; cells stay on one line unless wrap is set. */
export function DataTable({ columns, rows, loading, error, empty = "No records found.", rowKey = (row) => row.id, onRowClick, rowClassName }) {
  let state = null;
  if (loading) state = <TableState icon={LoaderCircle} spin role="status">Loading…</TableState>;
  else if (error) state = <TableState icon={AlertCircle} tone="text-danger" role="alert">{error}</TableState>;
  else if (rows.length === 0) state = <TableState icon={Inbox}>{empty}</TableState>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]" aria-busy={loading || undefined}>
        <thead className="border-b border-line bg-surface-muted text-[11.5px] font-semibold text-ink-soft">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-2.5">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {state ? (
            <tr><td colSpan={columns.length} className="p-0">{state}</td></tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors hover:bg-surface-muted ${onRowClick ? "cursor-pointer" : ""} ${rowClassName ? rowClassName(row) : ""}`}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 ${column.wrap ? "" : "whitespace-nowrap"} ${column.className || "text-ink-soft"}`}>
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

const GREEN = "bg-success-muted text-success";
const AMBER = "bg-warning-soft text-warning-strong";
const RED = "bg-danger-soft text-danger";
const BLUE = "bg-info-soft text-info";
const SENT = "bg-sent-soft text-navy";
const GREY = "bg-line-soft text-ink-soft";

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
  Late: AMBER,
  Missing: RED,
  Processed: GREEN,
  Paid: GREEN,
  Synced: GREEN,
  Error: RED,
  Open: AMBER,
  "Under Review": BLUE,
  Resolved: GREEN,
  Sent: SENT,
  Submitted: SENT,
  Invited: SENT,
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
  "On Duty": BLUE,
  Compensation: BLUE,
  Matched: GREEN,
  Unmatched: RED,
};

/** Shown instead of Approve/Reject on the viewer's own request; the server refuses self-approval. */
export function AwaitingApprover() {
  return <span className="text-xs italic text-muted">Awaiting another approver</span>;
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded px-2 text-[11px] font-semibold ${BADGE_TONES[status] || GREY}`}>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-3 sm:items-center sm:p-6">
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col ${wide ? "max-w-4xl" : "max-w-xl"} overflow-hidden rounded-xl bg-surface shadow-[0_24px_60px_rgba(15,23,42,0.28)] outline-none sm:max-h-[calc(100dvh-3rem)]`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-field-line px-6 py-4">
          <h4 className="text-lg font-bold text-ink">{title}</h4>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-full bg-line-soft text-muted hover:bg-line">
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
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
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${request.danger ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning-strong"}`} aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            {request.message && <p className="text-sm leading-6 text-ink-soft">{request.message}</p>}
            {input && (
              <label className="block text-xs font-semibold text-ink-soft">
                {input.label}
                {input.required && <span className="text-danger"> *</span>}
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
          <button type="submit" className={request.danger ? dangerSolidButton : submitButton}>
            {request.confirmLabel || "Confirm"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Field({ label, required, children, className = "" }) {
  return (
    <label className={`block text-xs font-semibold text-ink-soft ${className}`}>
      <span>
        {label}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </span>
      <div className="mt-1.5 font-normal normal-case">{children}</div>
    </label>
  );
}

/** Department names from the company's department records (active ones, plus the current value). */
export function DepartmentSelect({ departments = [], value, onChange, allLabel = "All departments" }) {
  const list = departments.filter((d) => d.status === "Active" || d.name === value);
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      <option value="">{allLabel}</option>
      {list.map((department) => (
        <option key={department.id} value={department.name}>{department.name}</option>
      ))}
    </select>
  );
}
/** Compact department filter for page toolbars; lists active departments plus the current value. */
export function DepartmentFilter({ departments = [], value, onChange }) {
  const list = departments.filter((d) => d.status === "Active" || d.name === value);
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Filter by department" className={compactInputClass}>
      <option value="">All departments</option>
      {list.map((department) => (
        <option key={department.id} value={department.name}>{department.name}</option>
      ))}
    </select>
  );
}

export function EmployeeSelect({ employees, value, onChange, includeAll = false, required = false, activeOnly = true }) {
  const list = activeOnly ? employees.filter((e) => e.status === "Active" || String(e.id) === String(value)) : employees;
  return (
    <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      <option value="">{includeAll ? "All employees" : list.length ? "Select employee" : "No eligible employees"}</option>
      {list.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.name} ({employee.employeeCode || employee.id})
        </option>
      ))}
    </select>
  );
}
