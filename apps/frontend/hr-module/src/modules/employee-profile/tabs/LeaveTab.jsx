import { useMemo, useState } from "react";
import { withQuery } from "../../../api";
import { formatDate, inputClass, useApi } from "../../helpers";
import { DataTable, Field, Notice, Panel, StatusBadge } from "../../ui";
import { ProfileStats } from "../shared";
export function LeaveTab({ companyId, employeeId }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const balances = useApi(withQuery("/api/leave/balances", { companyId, employeeId, year }));
  const requests = useApi(withQuery("/api/leave/requests", { companyId, employeeId }));
  const rows = balances.data?.balances || [];
  const total = (key) => rows.reduce((sum, r) => sum + Number(r[key] || 0), 0);
  const history = useMemo(
    () => (requests.data?.requests || []).filter((r) => r.from_date?.startsWith(String(year))).sort((a, b) => b.from_date.localeCompare(a.from_date)),
    [requests.data, year]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Leave year"><input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())} className={`${inputClass} w-32`} /></Field>
      </div>
      <ProfileStats stats={[
        { label: "Entitled (incl. carry-forward)", value: total("allocated") + total("carry_forward") },
        { label: "Used", value: total("used"), tone: "text-ink-soft" },
        { label: "Pending", value: total("pending"), tone: "text-warning-strong" },
        { label: "Available", value: total("available"), tone: "text-success" },
      ]} />
      {balances.loading ? (
        <Panel><p className="text-sm text-muted">Loading balances…</p></Panel>
      ) : balances.error ? (
        <Notice notice={{ type: "error", message: balances.error }} />
      ) : rows.length === 0 ? (
        <Notice notice={{ type: "info", message: "No active leave types configured for this year." }} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.leave_type_id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink">{r.leave_type_name}</p>
                <span className="text-[10px] font-semibold uppercase text-placeholder">{r.is_paid ? "Paid" : "Unpaid"}</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-navy">{r.available}<span className="ml-1 text-sm font-medium text-muted">available</span></p>
              <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-ink-soft">
                <dt>Allocated</dt><dd className="text-right font-semibold">{r.allocated}{r.is_default_allocation ? " (default)" : ""}</dd>
                <dt>Carried forward</dt><dd className="text-right font-semibold">{r.carry_forward}</dd>
                <dt>Used</dt><dd className="text-right font-semibold">{r.used}</dd>
                <dt>Pending</dt><dd className="text-right font-semibold">{r.pending}</dd>
              </dl>
            </div>
          ))}
        </div>
      )}
      <Panel title={`Leave history (${year})`} padded={false}>
        <DataTable
          loading={requests.loading}
          error={requests.error}
          rows={history}
          empty="No leave requests in this year."
          columns={[
            { key: "leave_type_name", label: "Leave type", className: "font-semibold" },
            { key: "from_date", label: "From", render: (r) => formatDate(r.from_date) },
            { key: "to_date", label: "To", render: (r) => formatDate(r.to_date) },
            { key: "days", label: "Days" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "reviewed_by_name", label: "Reviewed by", render: (r) => r.reviewed_by_name || "—" },
          ]}
        />
      </Panel>
    </div>
  );
}
