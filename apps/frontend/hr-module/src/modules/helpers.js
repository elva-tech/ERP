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

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500";
export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
export const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";
export const linkButton = "rounded text-xs font-semibold hover:underline disabled:opacity-50";

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
