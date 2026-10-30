import { withQuery } from "../../api";
export const profilePath = (employeeId, suffix, companyId, params = {}) =>
  withQuery(`/api/employees/${encodeURIComponent(employeeId)}${suffix}`, { companyId, ...params });

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function historySummary(h) {
  if (h.source === "system") {
    if (h.event_type === "Status Change") return `Status: ${h.previous_status} → ${h.new_status}`;
    const parts = [];
    if ((h.previous_designation || "") !== (h.designation || "")) parts.push(`Designation: ${h.previous_designation || "—"} → ${h.designation}`);
    if ((h.previous_department || "") !== (h.department || "")) parts.push(`Department: ${h.previous_department || "—"} → ${h.department}`);
    return parts.join(" · ");
  }
  return [h.designation, h.department, h.organization].filter(Boolean).join(" · ");
}
