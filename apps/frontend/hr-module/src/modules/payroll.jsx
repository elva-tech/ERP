import { useState } from "react";
import { Download, Eye, Printer } from "lucide-react";
import { apiRequest, sendJson, withQuery } from "../api";
import { LOGO_SRC } from "../shell";
import MasterCrud from "./MasterCrud";
import {
  MONTH_NAMES,
  canManage,
  compactInputClass,
  currentMonth,
  downloadCsv,
  employeesInDepartment,
  formatDate,
  formatMoney,
  iconButton,
  inputClass,
  isAdmin,
  linkButton,
  primaryButton, submitButton,
  secondaryButton,
  slateButton,
  todayLocal,
  useAction,
  useApi,
} from "./helpers";
import {
  AwaitingApprover,
  DataTable,
  DepartmentFilter,
  DepartmentSelect,
  EmployeeSelect,
  Field,
  Modal,
  Notice,
  PageHeader,
  Panel,
  StatGrid,
  StatusBadge,
} from "./ui";
import { useConfirm } from "./useConfirm";

const PAYROLL_RULES_NOTE =
  "Payroll is calculated only from the configured salary components. No PF, ESIC, professional tax or TDS rates are built in. Loss of pay and net-pay rounding follow the approved Payroll Policy; without an approved policy, runs are provisional and cannot be finalized. Mid-month joining/leaving is not prorated. Confirm all statutory components with your payroll accountant before finalizing.";

const periodLabel = (run) => `${MONTH_NAMES[run.pay_period_month - 1]} ${run.pay_period_year}`;

function ManagerOnly({ role, children, message }) {
  if (!canManage(role)) return <Notice notice={{ type: "info", message: message || "This page is available to HR managers and company admins." }} />;
  return children;
}

function StructureEditor({ companyId, structure, onClose }) {
  const lines = useApi(withQuery(`/api/payroll/structures/${structure.id}/components`, { companyId }));
  const components = useApi(withQuery("/api/payroll/components", { companyId }));
  const [draft, setDraft] = useState(null);
  const [previewCtc, setPreviewCtc] = useState("600000");
  const [preview, setPreview] = useState(null);
  const action = useAction();

  const current = draft ?? (lines.data?.components || []).map((l) => ({
    componentId: String(l.component_id),
    amount: l.amount ?? "",
    percentage: l.percentage ?? "",
  }));
  const all = components.data?.components || [];
  const byId = new Map(all.map((c) => [String(c.id), c]));
  const available = all.filter((c) => c.status === "Active" && !current.some((l) => l.componentId === String(c.id)));

  const update = (index, patch) => setDraft(current.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  async function save() {
    const result = await action.run(() =>
      sendJson("PUT", withQuery(`/api/payroll/structures/${structure.id}/components`, { companyId }), {
        components: current.map((l) => ({ componentId: l.componentId, amount: l.amount === "" ? null : Number(l.amount), percentage: l.percentage === "" ? null : Number(l.percentage) })),
      })
    );
    if (result) {
      setDraft(null);
      lines.reload();
    }
  }

  async function runPreview() {
    const result = await action.run(
      () => apiRequest(withQuery(`/api/payroll/structures/${structure.id}/components`, { companyId, previewCtc })),
      "Preview calculated from the saved structure."
    );
    if (result) setPreview(result.preview);
  }

  return (
    <Modal title={`Configure structure — ${structure.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
        <p className="text-xs text-muted">Fixed components use a monthly amount. Percentage components use the percentage of the base set on the component (CTC = annual CTC ÷ 12, Gross, or another component).</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11.5px] font-semibold text-muted">
              <tr><th className="px-3 py-2">Component</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Calculation</th><th className="px-3 py-2">Value</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody>
              {lines.loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">Loading…</td></tr>
              ) : current.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">No components yet. Add components below.</td></tr>
              ) : current.map((line, index) => {
                const c = byId.get(line.componentId);
                return (
                  <tr key={line.componentId} className="border-t border-line">
                    <td className="px-3 py-2 font-semibold">{c?.name || line.componentId}</td>
                    <td className="px-3 py-2">{c?.component_type}</td>
                    <td className="px-3 py-2">{c?.calculation_type === "Percentage" ? `% of ${c.percentage_of}` : "Fixed monthly"}</td>
                    <td className="px-3 py-2">
                      {c?.calculation_type === "Percentage" ? (
                        <input type="number" step="0.01" min="0" value={line.percentage} onChange={(e) => update(index, { percentage: e.target.value })} className={`${inputClass} w-28`} aria-label={`${c?.name} percentage`} />
                      ) : (
                        <input type="number" step="0.01" min="0" value={line.amount} onChange={(e) => update(index, { amount: e.target.value })} className={`${inputClass} w-36`} aria-label={`${c?.name} amount`} />
                      )}
                    </td>
                    <td className="px-3 py-2"><button type="button" onClick={() => setDraft(current.filter((_, i) => i !== index))} className={`${linkButton} text-danger`}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value="" onChange={(e) => e.target.value && setDraft([...current, { componentId: e.target.value, amount: "", percentage: "" }])} className={`${inputClass} max-w-xs`}>
            <option value="">{available.length ? "+ Add component" : "All active components added"}</option>
            {available.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.component_type})</option>)}
          </select>
          <button type="button" disabled={action.busy || draft === null} onClick={save} className={primaryButton}>Save structure</button>
        </div>
        <div className="rounded-lg border border-line p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Preview with annual CTC"><input type="number" min="1" value={previewCtc} onChange={(e) => setPreviewCtc(e.target.value)} className={`${inputClass} w-44`} /></Field>
            <button type="button" disabled={action.busy || draft !== null} onClick={runPreview} className={secondaryButton}>Calculate preview</button>
            {draft !== null && <span className="text-xs text-warning-strong">Save changes before previewing.</span>}
          </div>
          {preview && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {preview.lines.map((l) => <tr key={l.componentId} className="border-t border-line-soft"><td className="py-1.5">{l.name}</td><td className="py-1.5 text-muted">{l.type}</td><td className="py-1.5 text-right">{formatMoney(l.amount)}</td></tr>)}
                  <tr className="border-t border-field-line font-semibold"><td className="py-1.5">Gross</td><td /><td className="py-1.5 text-right">{formatMoney(preview.gross)}</td></tr>
                  <tr className="font-semibold"><td className="py-1.5">Deductions</td><td /><td className="py-1.5 text-right">{formatMoney(preview.deductions)}</td></tr>
                  <tr className="font-semibold text-navy"><td className="py-1.5">Net (before advance recovery)</td><td /><td className="py-1.5 text-right">{formatMoney(preview.net)}</td></tr>
                  <tr className="text-muted"><td className="py-1.5">Employer contributions</td><td /><td className="py-1.5 text-right">{formatMoney(preview.employer)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function designationsForDepartment(designations, departmentId, currentId) {
  return designations.filter((d) =>
    String(d.id) === String(currentId)
    || (d.status === "Active" && (!departmentId || !d.departments.length || d.departments.some((dep) => dep.id === String(departmentId))))
  );
}

export function SalaryStructure({ companyId, role, employees, departments = [], designations = [] }) {
  const [tab, setTab] = useState("Structures");
  const [configuring, setConfiguring] = useState(null);
  const structures = useApi(canManage(role) ? withQuery("/api/payroll/structures", { companyId }) : null);
  const activeStructures = (structures.data?.structures || []).filter((s) => s.status === "Active");
  const activeDepartments = (currentId) => departments.filter((d) => d.status === "Active" || String(d.id) === String(currentId));

  return (
    <ManagerOnly role={role}>
      <section className="space-y-5">
        <Notice notice={{ type: "info", message: PAYROLL_RULES_NOTE }} />
        <div className="flex gap-2">
          {["Structures", "Components", "Employee Assignments"].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={tab === t ? primaryButton : secondaryButton}>{t}</button>
          ))}
        </div>
        {tab === "Components" && (
          <MasterCrud
            title="Salary Components"
            subtitle="Earnings, deductions and employer contributions used in structures"
            companyId={companyId}
            role={role}
            path="/api/payroll/components"
            listKey="components"
            itemKey="component"
            columns={[
              { key: "name", label: "Component", className: "font-semibold" },
              { key: "component_type", label: "Type" },
              { key: "calculation_type", label: "Calculation", render: (r) => (r.calculation_type === "Percentage" ? `% of ${r.percentage_of}` : "Fixed") },
              { key: "is_statutory", label: "Statutory", render: (r) => (r.is_statutory ? "Yes" : "No") },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            emptyForm={{ name: "", componentType: "Earning", calculationType: "Fixed", percentageOf: "", isStatutory: false, status: "Active" }}
            toForm={(r) => ({ name: r.name, componentType: r.component_type, calculationType: r.calculation_type, percentageOf: r.percentage_of || "", isStatutory: r.is_statutory, status: r.status })}
            toPayload={(f) => ({ ...f, percentageOf: f.calculationType === "Percentage" ? f.percentageOf : null })}
            fields={(f, set) => (
              <>
                <Field label="Name" required className="sm:col-span-2"><input required value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} className={inputClass} /></Field>
                <Field label="Type"><select value={f.componentType} onChange={(e) => set({ ...f, componentType: e.target.value })} className={inputClass}>{["Earning", "Deduction", "Employer Contribution"].map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Calculation"><select value={f.calculationType} onChange={(e) => set({ ...f, calculationType: e.target.value })} className={inputClass}><option>Fixed</option><option>Percentage</option></select></Field>
                {f.calculationType === "Percentage" && (
                  <Field label="Percentage of" required className="sm:col-span-2">
                    <input required list="component-bases" value={f.percentageOf} onChange={(e) => set({ ...f, percentageOf: e.target.value })} placeholder="CTC, Gross, or a component name such as Basic" className={inputClass} />
                    <datalist id="component-bases"><option value="CTC" /><option value="Gross" /></datalist>
                  </Field>
                )}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isStatutory} onChange={(e) => set({ ...f, isStatutory: e.target.checked })} /> Statutory component</label>
                <Field label="Status"><select value={f.status} onChange={(e) => set({ ...f, status: e.target.value })} className={inputClass}><option>Active</option><option>Inactive</option></select></Field>
              </>
            )}
          />
        )}
        {tab === "Structures" && (
          <MasterCrud
            title="Salary Structures"
            subtitle="Templates combining components; assign them to employees with an annual CTC"
            companyId={companyId}
            role={role}
            path="/api/payroll/structures"
            listKey="structures"
            itemKey="structure"
            onChanged={structures.reload}
            extraActions={(row) => <button type="button" onClick={() => setConfiguring(row)} className={`${linkButton} text-success`}>Configure</button>}
            columns={[
              { key: "name", label: "Structure", className: "font-semibold" },
              { key: "department_name", label: "Department", wrap: true, render: (r) => r.department_name || "All" },
              { key: "designation_name", label: "Designation", wrap: true, render: (r) => r.designation_name || "All" },
              { key: "ctc", label: "Annual salary range", render: (r) => (r.ctc_min || r.ctc_max ? `${formatMoney(r.ctc_min)} – ${formatMoney(r.ctc_max)}` : "—") },
              { key: "component_count", label: "Components" },
              { key: "assignment_count", label: "Assignments" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            emptyForm={{ name: "", description: "", ctcMin: "", ctcMax: "", departmentId: "", designationId: "", status: "Active" }}
            toForm={(r) => ({ name: r.name, description: r.description || "", ctcMin: r.ctc_min ?? "", ctcMax: r.ctc_max ?? "", departmentId: r.department_id ? String(r.department_id) : "", designationId: r.designation_id ? String(r.designation_id) : "", status: r.status })}
            toPayload={(f) => ({ ...f, ctcMin: f.ctcMin === "" ? null : Number(f.ctcMin), ctcMax: f.ctcMax === "" ? null : Number(f.ctcMax), departmentId: f.departmentId || null, designationId: f.designationId || null })}
            fields={(f, set) => (
              <>
                <Field label="Name" required className="sm:col-span-2"><input required value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} className={inputClass} /></Field>
                <Field label="Department">
                  <select
                    value={f.departmentId}
                    onChange={(e) => {
                      const departmentId = e.target.value;
                      const keep = designationsForDepartment(designations, departmentId, "").some((d) => String(d.id) === f.designationId);
                      set({ ...f, departmentId, designationId: keep ? f.designationId : "" });
                    }}
                    className={inputClass}
                  >
                    <option value="">All departments</option>
                    {activeDepartments(f.departmentId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="Designation">
                  <select value={f.designationId} onChange={(e) => set({ ...f, designationId: e.target.value })} className={inputClass}>
                    <option value="">All designations</option>
                    {designationsForDepartment(designations, f.departmentId, f.designationId).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </Field>
                <Field label="Minimum annual salary (₹)"><input type="number" min="0" value={f.ctcMin} onChange={(e) => set({ ...f, ctcMin: e.target.value })} className={inputClass} /></Field>
                <Field label="Maximum annual salary (₹)"><input type="number" min="0" value={f.ctcMax} onChange={(e) => set({ ...f, ctcMax: e.target.value })} className={inputClass} /></Field>
                <Field label="Status"><select value={f.status} onChange={(e) => set({ ...f, status: e.target.value })} className={inputClass}><option>Active</option><option>Inactive</option></select></Field>
                <Field label="Description" className="sm:col-span-2"><textarea rows={2} value={f.description} onChange={(e) => set({ ...f, description: e.target.value })} className={inputClass} /></Field>
              </>
            )}
          />
        )}
        {tab === "Employee Assignments" && (
          <MasterCrud
            title="Salary Assignments"
            subtitle="Which structure and annual CTC applies to each employee, by effective date"
            companyId={companyId}
            role={role}
            path="/api/payroll/assignments"
            listKey="assignments"
            itemKey="assignment"
            deleteRoleCheck={canManage}
            columns={[
              { key: "employee_name", label: "Employee", className: "font-semibold" },
              { key: "employee_code", label: "Code" },
              { key: "structure_name", label: "Structure" },
              { key: "ctc_annual", label: "Annual CTC", render: (r) => formatMoney(r.ctc_annual) },
              { key: "effective_from", label: "From", render: (r) => formatDate(r.effective_from) },
              { key: "effective_to", label: "To", render: (r) => (r.effective_to ? formatDate(r.effective_to) : "Open-ended") },
            ]}
            emptyForm={{ department: "", employeeId: "", structureId: "", ctcAnnual: "", effectiveFrom: todayLocal(), effectiveTo: "" }}
            toForm={(r) => ({ department: "", employeeId: String(r.employee_id), structureId: String(r.structure_id), ctcAnnual: r.ctc_annual, effectiveFrom: r.effective_from, effectiveTo: r.effective_to || "" })}
            toPayload={(f) => ({ employeeId: f.employeeId, structureId: f.structureId, ctcAnnual: Number(f.ctcAnnual), effectiveFrom: f.effectiveFrom, effectiveTo: f.effectiveTo || null })}
            fields={(f, set) => (
              <>
                <Field label="Department">
                  <DepartmentSelect
                    departments={departments}
                    value={f.department}
                    onChange={(department) => {
                      const keep = employeesInDepartment(employees, department).some((e) => String(e.id) === String(f.employeeId));
                      set({ ...f, department, employeeId: keep ? f.employeeId : "" });
                    }}
                  />
                </Field>
                <Field label="Employee" required><EmployeeSelect employees={employeesInDepartment(employees, f.department)} value={f.employeeId} onChange={(v) => set({ ...f, employeeId: v })} required /></Field>
                <Field label="Salary structure" required className="sm:col-span-2">
                  <select required value={f.structureId} onChange={(e) => set({ ...f, structureId: e.target.value })} className={inputClass}>
                    <option value="">{activeStructures.length ? "Select structure" : "Create a structure first"}</option>
                    {activeStructures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Annual CTC (₹)" required><input type="number" min="1" step="0.01" required value={f.ctcAnnual} onChange={(e) => set({ ...f, ctcAnnual: e.target.value })} className={inputClass} /></Field>
                <Field label="Effective from" required><input type="date" required value={f.effectiveFrom} onChange={(e) => set({ ...f, effectiveFrom: e.target.value })} className={inputClass} /></Field>
                <Field label="Effective to"><input type="date" value={f.effectiveTo} onChange={(e) => set({ ...f, effectiveTo: e.target.value })} className={inputClass} /></Field>
              </>
            )}
          />
        )}
        {configuring && <StructureEditor companyId={companyId} structure={configuring} onClose={() => { setConfiguring(null); structures.reload(); }} />}
      </section>
    </ManagerOnly>
  );
}

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
              { key: "policy", label: "Policy", render: (r) => (!r.payslip_count ? "—" : r.is_provisional ? <StatusBadge status="Provisional" /> : `v${r.policy_version}`) },
              { key: "payslip_count", label: "Payslips" },
              { key: "total_gross", label: "Gross", render: (r) => formatMoney(r.total_gross) },
              { key: "total_deductions", label: "Deductions", render: (r) => formatMoney(r.total_deductions) },
              { key: "total_net", label: "Net", render: (r) => formatMoney(r.total_net) },
              { key: "processed_by_name", label: "Processed by", render: (r) => r.processed_by_name || "—" },
              { key: "view", label: "", render: (r) => <button type="button" onClick={() => { setSelectedId(String(r.id)); setSkipped([]); setWarnings([]); }} className={`${linkButton} text-link`}>{selected?.id === r.id ? "Selected" : "View"}</button> },
            ]}
          />
        </Panel>
        {selected && (
          <Panel
            title={`${periodLabel(selected)} — ${selected.status}`}
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

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const restWords = rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? ` ${ONES[rest % 10]}` : ""}`;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", restWords].filter(Boolean).join(" ");
}

/** Indian numbering (crore, lakh, thousand) for the payslip "In words" line. */
function rupeesInWords(value) {
  const amount = Math.round(Number(value) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0) return "";
  let rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const parts = [];
  for (const [size, label] of [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]]) {
    const count = Math.floor(rupees / size);
    if (count) parts.push(`${count >= 1000 ? rupeesInWords(count).replace(/ Only$/, "") : belowThousand(count)} ${label}`);
    rupees %= size;
  }
  if (rupees) parts.push(belowThousand(rupees));
  const words = parts.join(" ") || "Zero";
  return `${words}${paise ? ` and ${belowThousand(paise)} Paise` : ""} Only`;
}

function StatementTable({ title, lines, totalLabel, total, totalTone }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line">
      <p className="border-b border-line bg-surface-muted px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink">{title}</p>
      <ul className="flex-1 divide-y divide-line-soft">
        {lines.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-muted">—</li>}
        {lines.map((line) => (
          <li key={line.key} className="flex justify-between gap-4 px-4 py-2.5 text-[13px]">
            <span className="text-ink-soft">{line.name}</span>
            <span className="font-medium tabular-nums text-ink">{formatMoney(line.amount)}</span>
          </li>
        ))}
      </ul>
      <div className={`flex justify-between gap-4 border-t border-line px-4 py-3 text-[13px] font-bold ${totalTone}`}>
        <span>{totalLabel}</span>
        <span className="tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

function maskAccount(value) {
  const raw = String(value || "").replace(/\s/g, "");
  if (!raw) return "";
  if (/[x*]/i.test(raw)) return raw;
  return `${"*".repeat(Math.max(raw.length - 4, 6))}${raw.slice(-4)}`;
}

function bankText(accounts) {
  if (!accounts?.length) return "—";
  const account = accounts.find((row) => row.is_primary) || accounts[0];
  const masked = maskAccount(account.account_number);
  return account.bank_name ? `${account.bank_name} - ${masked}` : masked || "—";
}

function statementLines(payslip) {
  const detail = payslip?.calculation_detail || {};
  const lines = Array.isArray(detail.lines) ? detail.lines : [];
  const named = (type) => lines.filter((line) => line.type === type).map((line) => ({
    key: line.componentId || line.name,
    name: line.name,
    amount: line.amount,
  }));
  if (lines.length) {
    return {
      earnings: named("Earning"),
      deductions: [
        ...named("Deduction"),
        ...(detail.advanceRecoveries || []).map((recovery) => ({
          key: `advance-${recovery.advanceId}`,
          name: "Advance recovery",
          amount: recovery.amount,
        })),
      ],
      employer: named("Employer Contribution"),
      gross: payslip.gross_pay,
      deductionsTotal: payslip.total_deductions,
      net: payslip.net_salary,
      notes: detail.notes || [],
    };
  }
  if (!payslip) return { earnings: [], deductions: [], employer: [], gross: null, deductionsTotal: null, net: null, notes: [] };
  const earningColumns = [
    ["basic", "Basic Salary", payslip.basic_pay],
    ["hra", "House Rent Allowance (HRA)", payslip.hra],
    ["da", "Dearness Allowance (DA)", payslip.da],
    ["other-earn", "Other earnings", payslip.other_earnings],
  ];
  const deductionColumns = [
    ["pf", "Provident Fund (PF)", payslip.pf_employee],
    ["esic", "ESIC Contribution", payslip.esic_employee],
    ["pt", "Professional Tax (PT)", payslip.professional_tax],
    ["tds", "Income Tax (TDS)", payslip.tds],
    ["other-ded", "Other deductions", payslip.other_deductions],
  ];
  const present = (rows) => rows.filter(([, , amount]) => Number(amount)).map(([key, name, amount]) => ({ key, name, amount }));
  return {
    earnings: present(earningColumns),
    deductions: present(deductionColumns),
    employer: [],
    gross: payslip.gross_pay,
    deductionsTotal: payslip.total_deductions,
    net: payslip.net_salary,
    notes: detail.notes || [],
  };
}

/** Printable statement. Identity comes from the employee record; amounts come only from a stored payslip. */
function PayslipStatement({ companyName, period, employee, bankAccounts, payslip }) {
  const money = statementLines(payslip);
  const lopValue = payslip?.working_days != null
    ? `${payslip.lop_days ?? 0} / ${payslip.working_days} Working Days`
    : payslip?.lop_days ?? "—";
  const info = [
    ["Employee ID", employee?.employeeCode || payslip?.employee_code || "—"],
    ["Employee name", employee?.name || payslip?.employee_name || "—"],
    ["Designation", employee?.designation || payslip?.designation || "—"],
    ["Department", employee?.department || payslip?.department || "—"],
    ["PF number", "—"],
    ["UAN number", "—"],
    ["Bank account", bankText(bankAccounts)],
    ["LWP / LOP days", lopValue],
  ];

  return (
    <article className="rounded-lg border border-line bg-surface p-5 sm:p-7 print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <img src={LOGO_SRC} alt="" className="size-12 rounded-md object-cover" />
          <div>
            <p className="text-lg font-bold text-ink">{companyName || "Company"}</p>
            <p className="text-xs text-muted">Human Resources &amp; Payroll Division</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-bold uppercase tracking-wide text-navy">Payslip statement</p>
          <p className="mt-0.5 text-xs text-muted">{period || "—"}</p>
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
        {info.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-1 break-words text-[13px] font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <StatementTable title="Earnings" lines={money.earnings} totalLabel="Total Earnings" total={money.gross} totalTone="bg-success-muted text-success" />
        <StatementTable title="Deductions" lines={money.deductions} totalLabel="Total Deductions" total={money.deductionsTotal} totalTone="bg-danger-soft text-danger" />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-line-soft px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Net salary (take home)</p>
          {money.net != null && <p className="mt-1 text-[13px] italic text-ink-soft">In words: {rupeesInWords(money.net)}</p>}
        </div>
        <p className="flex items-baseline gap-2 text-ink-soft">
          <span className="text-sm font-medium">Net Pay:</span>
          <span className="text-2xl font-bold tabular-nums text-navy">{formatMoney(money.net)}</span>
        </p>
      </div>

      {!payslip && (
        <p className="mt-4 text-xs text-muted print:hidden">No payslip is stored for this employee and month. Earnings and deductions appear after the month is processed in Payroll Processing.</p>
      )}
      {money.employer.length > 0 && (
        <p className="mt-4 text-xs text-muted">Employer contributions (not deducted): {money.employer.map((line) => `${line.name} ${formatMoney(line.amount)}`).join(", ")}</p>
      )}
      {money.notes.length > 0 && <p className="mt-2 text-xs text-placeholder">{money.notes.join(" ")}</p>}
    </article>
  );
}

export function Payslips({ companyId, role, companyName, employees = [] }) {
  const manager = canManage(role);
  const runs = useApi(manager ? withQuery("/api/payroll/runs", { companyId }) : null);
  const payslips = useApi(withQuery("/api/payroll/payslips", { companyId }));
  const [employeeId, setEmployeeId] = useState("");
  const [period, setPeriod] = useState("");
  const [notice, setNotice] = useState(null);
  const rows = payslips.data?.payslips || [];
  const people = manager ? employees : [];
  const chosenEmployee = people.some((employee) => String(employee.id) === employeeId)
    ? employeeId
    : people[0] ? String(people[0].id) : "";
  const person = people.find((employee) => String(employee.id) === chosenEmployee) || null;

  const monthOptions = [];
  const seenMonths = new Set();
  for (const run of runs.data?.runs || []) {
    const key = `${run.pay_period_year}-${run.pay_period_month}`;
    if (seenMonths.has(key)) continue;
    seenMonths.add(key);
    monthOptions.push({ key, label: periodLabel(run) });
  }
  for (const slip of rows) {
    const key = `${slip.pay_period_year}-${slip.pay_period_month}`;
    if (seenMonths.has(key)) continue;
    seenMonths.add(key);
    monthOptions.push({ key, label: `${MONTH_NAMES[slip.pay_period_month - 1]} ${slip.pay_period_year}` });
  }
  monthOptions.sort((a, b) => b.key.localeCompare(a.key, undefined, { numeric: true }));
  const chosenPeriod = monthOptions.length === 0
    ? period
    : monthOptions.some((month) => month.key === period) ? period : monthOptions[0].key;
  const [year, month] = chosenPeriod ? chosenPeriod.split("-").map(Number) : [null, null];
  const selected = rows.find((slip) => (
    (!manager || String(slip.employee_id) === chosenEmployee) &&
    slip.pay_period_year === year &&
    slip.pay_period_month === month
  )) || null;
  const profileEmployeeId = person?.id || (selected ? String(selected.employee_id) : "");
  const profile = useApi(profileEmployeeId ? withQuery(`/api/employees/${profileEmployeeId}/profile`, { companyId }) : null);
  const periodText = monthOptions.find((monthOption) => monthOption.key === chosenPeriod)?.label
    || (year && month ? `${MONTH_NAMES[month - 1]} ${year}` : "");

  function openPrint() {
    setNotice(null);
    window.print();
  }

  function show(row) {
    setEmployeeId(String(row.employee_id));
    setPeriod(`${row.pay_period_year}-${row.pay_period_month}`);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="space-y-5">
      <div className="print:hidden">
        <PageHeader title="Employee Payslip" subtitle="Manage and generate monthly employee salary payslips" />
      </div>
      <div className="print:hidden space-y-3">
        {payslips.error && <Notice notice={{ type: "error", message: payslips.error }} />}
        {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-line bg-surface p-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          {manager && (
            <Field label="Employee">
              <select value={chosenEmployee} onChange={(event) => { setEmployeeId(event.target.value); setNotice(null); }} className={`${compactInputClass} min-w-56`}>
                {people.length === 0 && <option value="">No employees yet</option>}
                {people.map((employee) => (
                  <option key={employee.id} value={String(employee.id)}>{employee.name} ({employee.employeeCode || employee.id})</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Payslip Month">
            {monthOptions.length > 0 ? (
              <select value={chosenPeriod} onChange={(event) => { setPeriod(event.target.value); setNotice(null); }} className={`${compactInputClass} min-w-44`}>
                {monthOptions.map((monthOption) => <option key={monthOption.key} value={monthOption.key}>{monthOption.label}</option>)}
              </select>
            ) : (
              <input type="month" value={period} onChange={(event) => { setPeriod(event.target.value); setNotice(null); }} className={`${compactInputClass} min-w-44`} />
            )}
          </Field>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={openPrint} className={secondaryButton}>
            <Printer size={16} aria-hidden="true" /> Print
          </button>
          <button type="button" onClick={openPrint} className={slateButton}>
            <Download size={16} aria-hidden="true" /> Download PDF
          </button>
        </div>
      </div>

      {payslips.loading ? (
        <Panel><p className="py-6 text-center text-[13px] text-muted" role="status">Loading payslips…</p></Panel>
      ) : (
        <PayslipStatement
          companyName={companyName}
          period={periodText}
          employee={person}
          bankAccounts={profile.data?.bankAccounts}
          payslip={selected}
        />
      )}

      {rows.length > 0 && <Panel title={`All payslips (${rows.length})`} padded={false} className="print:hidden">
        <DataTable
          loading={payslips.loading}
          error={payslips.error}
          rows={rows}
          empty="No payslips have been generated yet."
          columns={[
            { key: "period", label: "Pay month", render: (r) => `${MONTH_NAMES[r.pay_period_month - 1]} ${r.pay_period_year}` },
            { key: "employee_name", label: "Employee", className: "font-semibold" },
            { key: "employee_code", label: "Code" },
            { key: "department", label: "Department" },
            { key: "gross_pay", label: "Gross", render: (r) => formatMoney(r.gross_pay) },
            { key: "total_deductions", label: "Deductions", render: (r) => formatMoney(r.total_deductions) },
            { key: "net_salary", label: "Net", className: "font-semibold text-navy", render: (r) => formatMoney(r.net_salary) },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "view", label: "", render: (r) => <button type="button" onClick={() => show(r)} aria-label={`View payslip for ${r.employee_name}`} className={`${linkButton} text-link`}>View</button> },
          ]}
        />
      </Panel>}
    </section>
  );
}

const emptyAdvanceForm = { department: "", employeeId: "", months: "", purpose: "" };
const ADVANCE_MONTHS = [1, 2, 3];
const monthsLabel = (months) => (months ? `${months} month${months > 1 ? "s" : ""}` : "—");
const advanceLabel = (row) => (row.amount != null ? formatMoney(row.amount) : `${monthsLabel(row.requested_months)} request`);

export function EmployeeAdvances({ companyId, role, employees, departments, ownEmployeeId }) {
  const manager = canManage(role);
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAdvanceForm);
  const advances = useApi(withQuery("/api/payroll/advances", { companyId, status }));
  const action = useAction();
  const confirm = useConfirm();
  const allRows = advances.data?.advances || [];
  const rows = department ? allRows.filter((r) => r.department === department) : allRows;
  const sum = (filter, key) => rows.filter(filter).reduce((s, r) => s + (r[key] || 0), 0);

  async function submit(event) {
    event.preventDefault();
    const result = await action.run(() =>
      sendJson("POST", "/api/payroll/advances", { companyId, employeeId: manager ? form.employeeId : undefined, months: Number(form.months), purpose: form.purpose })
    );
    if (result) { setShowForm(false); setForm(emptyAdvanceForm); advances.reload(); }
  }

  async function review(row, verb) {
    const body = { action: verb };
    if (verb === "approve") {
      if (row.amount == null) {
        const amount = await confirm.ask({
          title: "Approve advance",
          message: `${row.employee_name} requested an advance repaid over ${monthsLabel(row.requested_months)}. Enter the approved amount.`,
          confirmLabel: "Next",
          input: { label: "Approved advance amount (₹)", type: "number", min: "1", step: "0.01", required: true, defaultValue: "" },
        });
        if (amount === null) return;
        body.amount = Number(amount);
      }
      const input = await confirm.ask({
        title: "Approve advance",
        message: `Approve ${formatMoney(row.amount ?? body.amount)} for ${row.employee_name}? The EMI is recovered through monthly payroll.`,
        confirmLabel: "Approve",
        input: { label: "Monthly EMI to recover (₹)", type: "number", min: "1", step: "0.01", required: true, defaultValue: row.emi_amount ?? "" },
      });
      if (input === null) return;
      body.emiAmount = Number(input);
    } else {
      const confirmed = await confirm.ask({
        title: verb === "reject" ? "Reject advance" : "Close advance",
        message: `${verb === "reject" ? "Reject" : "Close"} the ${advanceLabel(row)} advance for ${row.employee_name}?`,
        confirmLabel: verb === "reject" ? "Reject" : "Close advance",
        danger: verb === "reject",
      });
      if (!confirmed) return;
    }
    const result = await action.run(() => sendJson("PATCH", withQuery(`/api/payroll/advances/${row.id}`, { companyId }), body));
    if (result) advances.reload();
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Employee Advances" subtitle="Salary advances recovered through monthly payroll EMI">
        {manager && <DepartmentFilter departments={departments} value={department} onChange={setDepartment} />}
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={compactInputClass}>
          <option value="">All statuses</option>
          {["Pending", "Active", "Closed", "Rejected"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button type="button" onClick={() => setShowForm(true)} className={primaryButton}>+ Request Advance</button>
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <StatGrid stats={[
        { label: "Outstanding balance", value: formatMoney(sum((r) => r.status === "Active", "balance")) },
        { label: "Pending approval", value: rows.filter((r) => r.status === "Pending").length, tone: "text-warning-strong" },
        { label: "Active advances", value: rows.filter((r) => r.status === "Active").length },
        { label: "Total recovered", value: formatMoney(sum((r) => r.status === "Active" || r.status === "Closed", "amount") - sum((r) => r.status === "Active" || r.status === "Closed", "balance")) },
      ]} />
      <Panel title="Advances" padded={false}>
        <DataTable
          loading={advances.loading}
          error={advances.error}
          rows={rows}
          empty="No advances."
          columns={[
            { key: "employee_name", label: "Employee", className: "font-semibold" },
            { key: "department", label: "Department", wrap: true, render: (r) => r.department || "—" },
            { key: "amount", label: "Amount", render: (r) => formatMoney(r.amount) },
            { key: "requested_months", label: "Months", render: (r) => monthsLabel(r.requested_months) },
            { key: "created_at", label: "Requested", render: (r) => formatDate(r.created_at) },
            { key: "purpose", label: "Purpose", render: (r) => r.purpose || "—" },
            { key: "emi_amount", label: "EMI", render: (r) => formatMoney(r.emi_amount) },
            { key: "balance", label: "Balance", render: (r) => formatMoney(r.balance) },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ...(manager ? [{
              key: "actions", label: "Actions", render: (r) => (
                <span className="flex gap-3">
                  {r.status === "Pending" && ownEmployeeId && String(r.employee_id) === String(ownEmployeeId) && <AwaitingApprover />}
                  {r.status === "Pending" && String(r.employee_id) !== String(ownEmployeeId) && (
                    <>
                      <button type="button" disabled={action.busy} onClick={() => review(r, "approve")} className={`${linkButton} text-success`}>Approve</button>
                      <button type="button" disabled={action.busy} onClick={() => review(r, "reject")} className={`${linkButton} text-danger`}>Reject</button>
                    </>
                  )}
                  {r.status === "Active" && <button type="button" disabled={action.busy} onClick={() => review(r, "close")} className={`${linkButton} text-ink-soft`}>Close</button>}
                  {!["Pending", "Active"].includes(r.status) && "—"}
                </span>
              ),
            }] : []),
          ]}
        />
      </Panel>
      {showForm && (
        <Modal title="New advance" onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="space-y-4">
            <Notice notice={action.notice} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {manager && (
                <>
                  <Field label="Department">
                    <DepartmentSelect
                      departments={departments}
                      value={form.department}
                      onChange={(department) => {
                        const keep = employeesInDepartment(employees, department).some((e) => String(e.id) === String(form.employeeId));
                        setForm({ ...form, department, employeeId: keep ? form.employeeId : "" });
                      }}
                    />
                  </Field>
                  <Field label="Employee" required><EmployeeSelect employees={employeesInDepartment(employees, form.department)} value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} required /></Field>
                </>
              )}
              <Field label="Number of months" required className="sm:col-span-2">
                <select required value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })} className={inputClass}>
                  <option value="">Select months</option>
                  {ADVANCE_MONTHS.map((m) => <option key={m} value={m}>{monthsLabel(m)}</option>)}
                </select>
              </Field>
              <Field label="Purpose" className="sm:col-span-2"><textarea rows={3} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={inputClass} /></Field>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Submitting…" : "Submit"}</button>
            </div>
          </form>
        </Modal>
      )}
      {confirm.dialog}
    </section>
  );
}

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
  { kind: "PF", name: "PF Monthly Statement", page: "PF" },
  { kind: "ESIC", name: "ESIC Monthly Statement", page: "ESIC" },
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
