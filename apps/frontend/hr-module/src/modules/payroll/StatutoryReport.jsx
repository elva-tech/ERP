import { useState } from "react";
import { withQuery } from "../../api";
import { Download, Eye, Printer } from "lucide-react";
import { downloadCsv } from "../helpers";
import {
  canManage,
  compactInputClass,
  formatMoney,
  iconButton,
  useApi,
} from "../helpers";
import {
  DataTable,
  DepartmentSelect,
  Field,
  Notice,
  PageHeader,
  Panel,
} from "../ui";
import { ManagerOnly } from "./shared";
import { periodLabel } from "./constants";
const STATUTORY_VIEWS = {
  PF: {
    title: "PF",
    subtitle: "Provident Fund amounts from payslips (employee and employer components named PF/EPF)",
    columns: ["gross_pay", "pf_employee", "pf_employer"],
  },
  ESIC: {
    title: "ESIC",
    subtitle: "ESIC amounts from payslips (employee and employer components named ESIC)",
    columns: ["gross_pay", "esic_employee", "esic_employer"],
  },
  ALL: {
    title: "Statutory Reports",
    subtitle: "PF, ESIC, professional tax and TDS per employee for a payroll run",
    columns: ["gross_pay", "pf_employee", "pf_employer", "esic_employee", "esic_employer", "professional_tax", "tds"],
  },
};
const COLUMN_LABELS = {
  gross_pay: "Gross", pf_employee: "PF (employee)", pf_employer: "PF (employer)", esic_employee: "ESIC (employee)",
  esic_employer: "ESIC (employer)", professional_tax: "Professional tax", tds: "TDS",
};

const REPORT_LIST = [
  { kind: "PF", name: "PF Monthly Statement", page: "pf" },
  { kind: "ESIC", name: "ESIC Monthly Statement", page: "esic" },
  { kind: "ALL", name: "Statutory Summary (PF, ESIC, PT, TDS)", page: null },
];

function reportColumns(kind) {
  return [
    { key: "employee_name", label: "Employee", className: "font-semibold" },
    { key: "employee_code", label: "Code" },
    ...STATUTORY_VIEWS[kind].columns.map((key) => ({ key, label: COLUMN_LABELS[key], render: (r) => formatMoney(r[key]) })),
  ];
}

export function StatutoryReport({ companyId, role, employees = [], departments = [], onNavigate, kind = "ALL" }) {
  const view = STATUTORY_VIEWS[kind];
  const runs = useApi(canManage(role) ? withQuery("/api/payroll/runs", { companyId }) : null);
  const [runId, setRunId] = useState("");
  const [department, setDepartment] = useState("");
  const runList = (runs.data?.runs || []).filter((r) => r.status !== "Cancelled");
  const effectiveRunId = runId || (runList[0] ? String(runList[0].id) : "");
  const report = useApi(effectiveRunId ? withQuery("/api/payroll/statutory", { companyId, runId: effectiveRunId }) : null);
  const allRows = report.data?.rows || [];
  const departmentOf = new Map(employees.map((e) => [String(e.id), e.department]));
  const rows = department ? allRows.filter((r) => departmentOf.get(String(r.employee_id)) === department) : allRows;
  const columns = reportColumns(kind);
  const runLabel = report.data?.run ? periodLabel(report.data.run) : "";

  function exportCsv(reportKind) {
    const title = STATUTORY_VIEWS[reportKind].title.replace(/\s+/g, "-").toLowerCase();
    const cols = reportColumns(reportKind).map((c) => ({ key: c.key, label: c.label }));
    downloadCsv(`${title}-${effectiveRunId}${department ? `-${department.replace(/\s+/g, "-").toLowerCase()}` : ""}.csv`, cols, rows);
  }

  return (
    <ManagerOnly role={role}>
      <section className="space-y-5">
        <PageHeader title={view.title} subtitle={view.subtitle} />

        <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Payroll run">
              <select value={effectiveRunId} onChange={(e) => setRunId(e.target.value)} className={`${compactInputClass} min-w-48`}>
                {runList.length === 0 && <option value="">No payroll runs</option>}
                {runList.map((r) => <option key={r.id} value={r.id}>{periodLabel(r)} ({r.status})</option>)}
              </select>
            </Field>
            <Field label="Department" className="min-w-48">
              <DepartmentSelect departments={departments} value={department} onChange={setDepartment} />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-soft">Export</p>
            <div className="inline-flex overflow-hidden rounded-md border border-line" role="group" aria-label="Export report">
              <button type="button" disabled={!rows.length} onClick={() => exportCsv(kind)} className="inline-flex h-9 items-center gap-1.5 bg-brand px-3 text-xs font-semibold text-surface hover:bg-brand-hover disabled:opacity-50">
                <Download size={14} aria-hidden="true" /> CSV
              </button>
              <button type="button" disabled={!rows.length} onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 bg-surface px-3 text-xs font-semibold text-ink hover:bg-workspace disabled:opacity-50">
                <Printer size={14} aria-hidden="true" /> Print / PDF
              </button>
            </div>
          </div>
        </div>

        <Notice notice={{ type: "info", message: report.data?.note || "Amounts reflect company-configured salary components. Statutory rates, wage ceilings, eligibility and filing formats (ECR, ESIC challan) must be confirmed by the payroll accountant." }} />

        {kind === "ALL" && (
          <Panel title="Reports list" subtitle={runLabel ? `Payroll run: ${runLabel}` : "Select a payroll run to download reports"} padded={false}>
            <DataTable
              rowKey={(r) => r.kind}
              rows={REPORT_LIST}
              columns={[
                { key: "name", label: "Report name", className: "font-semibold" },
                { key: "category", label: "Category", render: () => "Statutory reports" },
                { key: "frequency", label: "Frequency", render: () => "Monthly (per payroll run)" },
                { key: "source", label: "Source", className: "text-muted", render: () => "Generated payslips" },
                {
                  key: "actions",
                  label: "Actions",
                  render: (r) => (
                    <span className="flex items-center gap-2">
                      {r.page && onNavigate && (
                        <button type="button" onClick={() => onNavigate(r.page)} title={`Open ${r.name}`} aria-label={`Open ${r.name}`} className={iconButton}>
                          <Eye size={14} />
                        </button>
                      )}
                      <button type="button" disabled={!rows.length} onClick={() => exportCsv(r.kind)} title={`Download ${r.name} (CSV)`} aria-label={`Download ${r.name} as CSV`} className={iconButton}>
                        <Download size={14} />
                      </button>
                    </span>
                  ),
                },
              ]}
            />
          </Panel>
        )}

        <Panel title={`${kind === "ALL" ? "Statutory summary" : `${view.title} monthly statement`}${runLabel ? ` — ${runLabel} (${report.data.run.status})` : ""}`} subtitle={department ? `Department: ${department}` : undefined} padded={false}>
          <DataTable loading={report.loading} error={report.error} rowKey={(r) => r.employee_id} rows={rows} empty={department ? "No payslips for this department in this run." : "No payslips for this run."} columns={columns} />
        </Panel>
      </section>
    </ManagerOnly>
  );
}
