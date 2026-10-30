import { useState } from "react";
import { sendJson, withQuery } from "../../api";
import {
  canManage,
  compactInputClass,
  currentMonth,
  formatMoney,
  isAdmin,
  linkButton,
  primaryButton,
  secondaryButton,
  useAction,
  useApi,
} from "../helpers";
import {
  DataTable,
  DepartmentSelect,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
} from "../ui";
import { useConfirm } from "../useConfirm";
import { ManagerOnly } from "./shared";
import { PAYROLL_RULES_NOTE, periodLabel } from "./constants";
const payslipColumns = [
  { key: "employee_name", label: "Employee", className: "font-semibold" },
  { key: "employee_code", label: "Code" },
  { key: "basic_pay", label: "Basic", render: (r) => formatMoney(r.basic_pay) },
  { key: "hra", label: "HRA", render: (r) => formatMoney(r.hra) },
  { key: "da", label: "DA", render: (r) => formatMoney(r.da) },
  { key: "other_earnings", label: "Other earnings", render: (r) => formatMoney(r.other_earnings) },
  { key: "gross_pay", label: "Gross", render: (r) => formatMoney(r.gross_pay) },
  { key: "pf_employee", label: "PF", render: (r) => formatMoney(r.pf_employee) },
  { key: "esic_employee", label: "ESIC", render: (r) => formatMoney(r.esic_employee) },
  { key: "professional_tax", label: "PT", render: (r) => formatMoney(r.professional_tax) },
  { key: "tds", label: "TDS", render: (r) => formatMoney(r.tds) },
  { key: "other_deductions", label: "Other ded.", render: (r) => formatMoney(r.other_deductions) },
  { key: "net_salary", label: "Net", className: "font-semibold text-navy", render: (r) => formatMoney(r.net_salary) },
];

export function PayrollProcessing({ companyId, role, departments = [] }) {
  const runs = useApi(canManage(role) ? withQuery("/api/payroll/runs", { companyId }) : null);
  const [selectedId, setSelectedId] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState(currentMonth());
  const [skipped, setSkipped] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const action = useAction();
  const confirm = useConfirm();
  const runList = runs.data?.runs || [];
  const selected = runList.find((r) => String(r.id) === selectedId) || runList[0];
  const detail = useApi(selected ? withQuery(`/api/payroll/runs/${selected.id}`, { companyId }) : null);

  async function createRun() {
    const [year, month] = period.split("-").map(Number);
    const result = await action.run(() => sendJson("POST", "/api/payroll/runs", { companyId, year, month }));
    if (result) { setSelectedId(String(result.run.id)); runs.reload(); }
  }

  async function act(verb) {
    if (verb !== "process") {
      const confirmed = await confirm.ask(
        verb === "finalize"
          ? { title: `Finalize ${periodLabel(selected)} payroll`, message: "Payslips become visible to employees and advance balances are reduced. This cannot be undone.", confirmLabel: "Finalize payroll" }
          : { title: `Cancel ${periodLabel(selected)} payroll run`, message: "Cancel this payroll run? Its draft payslips will no longer be used.", confirmLabel: "Cancel run", cancelLabel: "Keep run", danger: true }
      );
      if (!confirmed) return;
    }
    const result = await action.run(() => sendJson("PATCH", withQuery(`/api/payroll/runs/${selected.id}`, { companyId }), { action: verb }));
    if (result) {
      setSkipped(result.skipped || []);
      setWarnings(result.warnings || []);
      runs.reload();
      detail.reload();
    }
  }

  return (
    <ManagerOnly role={role}>
      <section className="space-y-5">
        <PageHeader title="Payroll Processing" subtitle="Create a monthly run, generate draft payslips, review, then finalize">
          <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className={compactInputClass} />
          <button type="button" disabled={action.busy} onClick={createRun} className={primaryButton}>+ Create run</button>
        </PageHeader>
        <Notice notice={{ type: "info", message: PAYROLL_RULES_NOTE }} />
        <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
        <Panel title="Payroll runs" padded={false}>
          <DataTable
            loading={runs.loading}
            error={runs.error}
            rows={runList}
            empty="No payroll runs yet."
            columns={[
              { key: "period", label: "Period", className: "font-semibold", render: (r) => periodLabel(r) },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "policy", label: "Policy", render: (r) => (!r.payslip_count ? "â€”" : r.is_provisional ? <StatusBadge status="Provisional" /> : `v${r.policy_version}`) },
              { key: "payslip_count", label: "Payslips" },
              { key: "total_gross", label: "Gross", render: (r) => formatMoney(r.total_gross) },
              { key: "total_deductions", label: "Deductions", render: (r) => formatMoney(r.total_deductions) },
              { key: "total_net", label: "Net", render: (r) => formatMoney(r.total_net) },
              { key: "processed_by_name", label: "Processed by", render: (r) => r.processed_by_name || "â€”" },
              { key: "view", label: "", render: (r) => <button type="button" onClick={() => { setSelectedId(String(r.id)); setSkipped([]); setWarnings([]); }} className={`${linkButton} text-link`}>{selected?.id === r.id ? "Selected" : "View"}</button> },
            ]}
          />
        </Panel>
        {selected && (
          <Panel
            title={`${periodLabel(selected)} â€” ${selected.status}`}
            subtitle={selected.status === "Draft" ? "Processing regenerates draft payslips from current salary assignments and active advances." : undefined}
            actions={selected.status === "Draft" && (
              <>
                <button type="button" disabled={action.busy} onClick={() => act("process")} className={primaryButton}>{selected.payslip_count ? "Reprocess" : "Process payroll"}</button>
                {isAdmin(role) && <button type="button" disabled={action.busy || !selected.payslip_count} onClick={() => act("finalize")} className={secondaryButton}>Finalize</button>}
                {isAdmin(role) && <button type="button" disabled={action.busy} onClick={() => act("cancel")} className={`${secondaryButton} text-danger`}>Cancel run</button>}
              </>
            )}
            padded={false}
          >
            {selected.status === "Draft" && selected.is_provisional && selected.payslip_count > 0 && (
              <div className="border-b border-line p-4"><Notice notice={{ type: "error", message: "Provisional run: no approved payroll policy was in force when it was processed, so loss of pay and rounding were not applied. Approve the policy under Payroll Policy, then reprocess before finalizing." }} /></div>
            )}
            {warnings.map((w) => (
              <div key={w} className="border-b border-line p-4"><Notice notice={{ type: "info", message: w }} /></div>
            ))}
            {skipped.length > 0 && (
              <div className="border-b border-line p-4"><Notice notice={{ type: "info", message: `Skipped (no salary assignment for this month): ${skipped.map((s) => s.name).join(", ")}` }} /></div>
            )}
            {(detail.data?.payslips || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
                <span className="text-sm font-medium text-muted">Show payslips for</span>
                <div className="w-full sm:w-64"><DepartmentSelect departments={departments} value={department} onChange={setDepartment} /></div>
                {department && <span className="text-xs text-muted">Run totals above cover all departments; processing always covers the whole company.</span>}
              </div>
            )}
            <DataTable
              loading={detail.loading}
              error={detail.error}
              rows={(detail.data?.payslips || []).filter((p) => !department || p.department === department)}
              empty={department ? "No payslips for this department in this run." : "No payslips yet. Process the run to generate them."}
              columns={[...payslipColumns.slice(0, 2), { key: "department", label: "Department", wrap: true }, ...payslipColumns.slice(2)]}
            />
          </Panel>
        )}
        {confirm.dialog}
      </section>
    </ManagerOnly>
  );
}
