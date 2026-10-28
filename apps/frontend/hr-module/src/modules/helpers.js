import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api";

export const MANAGER_ROLES = ["company_admin", "hr_manager"];
export const canManage = (role) => MANAGER_ROLES.includes(role);
export const isAdmin = (role) => role === "company_admin";
export const ROLE_LABELS = {
  company_admin: "Company Admin",
  hr_manager: "HR Manager",
  employee: "Employee",
};

/** Field styling without a width, for toolbar date/month pickers. */
export const compactInputClass =
  "rounded-md border border-field-line bg-field px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-placeholder hover:border-field-line focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted";
export const inputClass = `w-full ${compactInputClass}`;

const buttonBase =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
/** Page-level New/Create/Record actions. */
export const primaryButton = `${buttonBase} bg-brand text-surface hover:bg-brand-hover`;
/** Slate primary action used where the red brand accent was replaced. */
export const slateButton = `${buttonBase} bg-ink-soft text-surface hover:bg-ink`;
/** Modal submit and detail-page primary actions. */
export const submitButton = `${buttonBase} bg-brand-strong text-surface hover:bg-brand-hover`;
export const secondaryButton = `${buttonBase} border border-line bg-surface text-ink hover:bg-workspace`;
export const dangerButton = `${buttonBase} border border-danger/30 bg-surface text-danger hover:bg-danger-soft`;
export const dangerSolidButton = `${buttonBase} bg-danger text-surface hover:bg-danger/90`;
export const iconButton =
  "inline-flex size-8 items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors hover:bg-workspace hover:text-ink disabled:opacity-50";
export const linkButton = "rounded text-xs font-semibold hover:underline disabled:opacity-50";
const smallButtonBase =
  "inline-flex h-7 items-center justify-center rounded-md px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const approveButton = `${smallButtonBase} bg-success text-surface hover:bg-success/90`;
export const rejectButton = `${smallButtonBase} bg-danger text-surface hover:bg-danger/90`;
/** Login and sign-up submit. */
export const loginButton = `${buttonBase} bg-login text-surface hover:bg-login-hover`;

/** Narrows an employee list to one department name; the department is never sent to the API. */
export function employeesInDepartment(employees, department) {
  return department ? employees.filter((e) => e.department === department) : employees;
}

export function initials(name) {
  return (
    String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?"
  );
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function todayLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function currentMonth() {
  return todayLocal().slice(0, 7);
}

export function monthBounds(month) {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}`, days: last, year, month: m };
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "—";
  return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB");
}

/**
 * Loads JSON from the API whenever `path` changes (null skips loading).
 * Previous data stays visible while a reload is in flight.
 */
export function useApi(path) {
  const [version, setVersion] = useState(0);
  const key = path ? `${path}#${version}` : null;
  const [state, setState] = useState({ key: null, data: null, error: "" });

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    apiRequest(path)
      .then((data) => {
        if (!cancelled) setState({ key, data, error: "" });
      })
      .catch((error) => {
        if (!cancelled) setState({ key, data: null, error: error.message || "Request failed." });
      });
    return () => {
      cancelled = true;
    };
  }, [key, path]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return {
    data: state.data,
    error: state.key === key ? state.error : "",
    loading: Boolean(key) && state.key !== key,
    reload,
  };
}

/** Runs an async mutation with a busy flag and a success/error notice. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const run = useCallback(async (fn, successMessage) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await fn();
      setNotice({ type: "success", message: successMessage || result?.message || "Saved." });
      return result ?? true;
    } catch (error) {
      const details = Array.isArray(error.details) ? ` ${error.details.join(" ")}` : "";
      setNotice({ type: "error", message: `${error.message || "Request failed."}${details}` });
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, notice, setNotice, run };
}

export function downloadCsv(filename, columns, rows) {
  const escape = (value) => {
    let text = value === null || value === undefined ? "" : String(value);
    // Spreadsheet apps execute cells starting with these characters as formulas.
    if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.map((c) => escape(c.label)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => escape(c.value ? c.value(row) : row[c.key])).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
