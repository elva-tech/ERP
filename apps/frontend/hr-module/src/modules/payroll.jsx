import { useState } from "react";
import { apiRequest, sendJson, withQuery } from "../api";
import MasterCrud from "./MasterCrud";
import {
  MONTH_NAMES,
  canManage,
  currentMonth,
  downloadCsv,
  formatDate,
  formatMoney,
  inputClass,
  isAdmin,
  linkButton,
  primaryButton,
  secondaryButton,
  todayLocal,
  useAction,
  useApi,
} from "./helpers";
import {
  AwaitingApprover,
  DataTable,
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
        <p className="text-xs text-slate-500">Fixed components use a monthly amount. Percentage components use the percentage of the base set on the component (CTC = annual CTC ÷ 12, Gross, or another component).</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f0f2f3] text-xs text-slate-600">
              <tr><th className="px-3 py-2">Component</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Calculation</th><th className="px-3 py-2">Value</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody>
              {lines.loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>
              ) : current.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No components yet. Add components below.</td></tr>
              ) : current.map((line, index) => {
                const c = byId.get(line.componentId);
                return (
                  <tr key={line.componentId} className="border-t border-slate-200">
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
                    <td className="px-3 py-2"><button type="button" onClick={() => setDraft(current.filter((_, i) => i !== index))} className={`${linkButton} text-red-600`}>Remove</button></td>
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
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Preview with annual CTC"><input type="number" min="1" value={previewCtc} onChange={(e) => setPreviewCtc(e.target.value)} className={`${inputClass} w-44`} /></Field>
            <button type="button" disabled={action.busy || draft !== null} onClick={runPreview} className={secondaryButton}>Calculate preview</button>
            {draft !== null && <span className="text-xs text-amber-700">Save changes before previewing.</span>}
          </div>
          {preview && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {preview.lines.map((l) => <tr key={l.componentId} className="border-t border-slate-100"><td className="py-1.5">{l.name}</td><td className="py-1.5 text-slate-500">{l.type}</td><td className="py-1.5 text-right">{formatMoney(l.amount)}</td></tr>)}
                  <tr className="border-t border-slate-300 font-semibold"><td className="py-1.5">Gross</td><td /><td className="py-1.5 text-right">{formatMoney(preview.gross)}</td></tr>
                  <tr className="font-semibold"><td className="py-1.5">Deductions</td><td /><td className="py-1.5 text-right">{formatMoney(preview.deductions)}</td></tr>
                  <tr className="font-semibold text-brand-600"><td className="py-1.5">Net (before advance recovery)</td><td /><td className="py-1.5 text-right">{formatMoney(preview.net)}</td></tr>
                  <tr className="text-slate-500"><td className="py-1.5">Employer contributions</td><td /><td className="py-1.5 text-right">{formatMoney(preview.employer)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function SalaryStructure({ companyId, role, employees }) {
  const [tab, setTab] = useState("Structures");
  const [configuring, setConfiguring] = useState(null);
  const structures = useApi(canManage(role) ? withQuery("/api/payroll/structures", { companyId }) : null);
  const activeStructures = (structures.data?.structures || []).filter((s) => s.status === "Active");

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
            extraActions={(row) => <button type="button" onClick={() => setConfiguring(row)} className={`${linkButton} text-emerald-700`}>Configure</button>}
            columns={[
              { key: "name", label: "Structure", className: "font-semibold" },
              { key: "ctc", label: "CTC range (annual)", render: (r) => (r.ctc_min || r.ctc_max ? `${formatMoney(r.ctc_min)} – ${formatMoney(r.ctc_max)}` : "—") },
              { key: "component_count", label: "Components" },
              { key: "assignment_count", label: "Assignments" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            emptyForm={{ name: "", description: "", ctcMin: "", ctcMax: "", status: "Active" }}
            toForm={(r) => ({ name: r.name, description: r.description || "", ctcMin: r.ctc_min ?? "", ctcMax: r.ctc_max ?? "", status: r.status })}
            toPayload={(f) => ({ ...f, ctcMin: f.ctcMin === "" ? null : Number(f.ctcMin), ctcMax: f.ctcMax === "" ? null : Number(f.ctcMax) })}
            fields={(f, set) => (
              <>
                <Field label="Name" required className="sm:col-span-2"><input required value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} className={inputClass} /></Field>
                <Field label="Minimum annual CTC"><input type="number" min="0" value={f.ctcMin} onChange={(e) => set({ ...f, ctcMin: e.target.value })} className={inputClass} /></Field>
                <Field label="Maximum annual CTC"><input type="number" min="0" value={f.ctcMax} onChange={(e) => set({ ...f, ctcMax: e.target.value })} className={inputClass} /></Field>
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
            emptyForm={{ employeeId: "", structureId: "", ctcAnnual: "", effectiveFrom: todayLocal(), effectiveTo: "" }}
            toForm={(r) => ({ employeeId: String(r.employee_id), structureId: String(r.structure_id), ctcAnnual: r.ctc_annual, effectiveFrom: r.effective_from, effectiveTo: r.effective_to || "" })}
            toPayload={(f) => ({ ...f, ctcAnnual: Number(f.ctcAnnual), effectiveTo: f.effectiveTo || null })}
            fields={(f, set) => (
              <>
                <Field label="Employee" required className="sm:col-span-2"><EmployeeSelect employees={employees} value={f.employeeId} onChange={(v) => set({ ...f, employeeId: v })} required /></Field>
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
  { key: "net_salary", label: "Net", className: "font-semibold text-brand-600", render: (r) => formatMoney(r.net_salary) },
];

export function PayrollProcessing({ companyId, role }) {
  const runs = useApi(canManage(role) ? withQuery("/api/payroll/runs", { companyId }) : null);
  const [selectedId, setSelectedId] = useState("");
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
          <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
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
              { key: "view", label: "", render: (r) => <button type="button" onClick={() => { setSelectedId(String(r.id)); setSkipped([]); setWarnings([]); }} className={`${linkButton} text-brand-600`}>{selected?.id === r.id ? "Selected" : "View"}</button> },
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
                {isAdmin(role) && <button type="button" disabled={action.busy} onClick={() => act("cancel")} className={`${secondaryButton} text-red-600`}>Cancel run</button>}
              </>
            )}
            padded={false}
          >
            {selected.status === "Draft" && selected.is_provisional && selected.payslip_count > 0 && (
              <div className="border-b border-slate-200 p-4"><Notice notice={{ type: "error", message: "Provisional run: no approved payroll policy was in force when it was processed, so loss of pay and rounding were not applied. Approve the policy under Payroll Policy, then reprocess before finalizing." }} /></div>
            )}
            {warnings.map((w) => (
              <div key={w} className="border-b border-slate-200 p-4"><Notice notice={{ type: "info", message: w }} /></div>
            ))}
            {skipped.length > 0 && (
              <div className="border-b border-slate-200 p-4"><Notice notice={{ type: "info", message: `Skipped (no salary assignment for this month): ${skipped.map((s) => s.name).join(", ")}` }} /></div>
            )}
            <DataTable loading={detail.loading} error={detail.error} rows={detail.data?.payslips || []} empty="No payslips yet. Process the run to generate them." columns={payslipColumns} />
          </Panel>
        )}
        {confirm.dialog}
      </section>
    </ManagerOnly>
  );
}

function PayslipView({ payslip, companyName, onClose }) {
  const detail = payslip.calculation_detail || {};
  const lines = detail.lines || [];
  const section = (type) => lines.filter((l) => l.type === type);
  return (
    <Modal title={`Payslip — ${payslip.employee_name}`} onClose={onClose} wide>
      <div className="space-y-4 text-sm print:text-xs">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="font-bold">{companyName || "ELVA TECH"}</p>
            <p className="text-slate-500">Pay period: {MONTH_NAMES[payslip.pay_period_month - 1]} {payslip.pay_period_year}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{payslip.employee_name} ({payslip.employee_code})</p>
            <p className="text-slate-500">{payslip.department} · {payslip.designation}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {["Earning", "Deduction"].map((type) => (
            <div key={type} className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 font-bold">{type === "Earning" ? "Earnings" : "Deductions"}</p>
              {section(type).map((l) => <div key={l.componentId} className="flex justify-between py-0.5"><span>{l.name}</span><span>{formatMoney(l.amount)}</span></div>)}
              {type === "Deduction" && (detail.advanceRecoveries || []).map((a) => <div key={a.advanceId} className="flex justify-between py-0.5"><span>Advance recovery</span><span>{formatMoney(a.amount)}</span></div>)}
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold"><span>Total</span><span>{formatMoney(type === "Earning" ? payslip.gross_pay : payslip.total_deductions)}</span></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between rounded-lg bg-brand-50 p-3 text-base font-bold text-brand-600"><span>Net pay</span><span>{formatMoney(payslip.net_salary)}</span></div>
        {section("Employer Contribution").length > 0 && <p className="text-xs text-slate-500">Employer contributions (not deducted): {section("Employer Contribution").map((l) => `${l.name} ${formatMoney(l.amount)}`).join(", ")}</p>}
        <p className="text-xs text-slate-400">{(detail.notes || []).join(" ")}</p>
        <div className="flex justify-end gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className={secondaryButton}>Print</button>
          <button type="button" onClick={onClose} className={primaryButton}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

export function Payslips({ companyId, role, companyName }) {
  const manager = canManage(role);
  const runs = useApi(manager ? withQuery("/api/payroll/runs", { companyId }) : null);
  const [runId, setRunId] = useState("");
  const payslips = useApi(withQuery("/api/payroll/payslips", { companyId, runId }));
  const [viewing, setViewing] = useState(null);
  const rows = payslips.data?.payslips || [];

  return (
    <section className="space-y-5">
      <PageHeader title="Payslips" subtitle={manager ? "Payslips generated by payroll runs" : "Your finalized payslips"}>
        {manager && (
          <select value={runId} onChange={(e) => setRunId(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">All runs</option>
            {(runs.data?.runs || []).map((r) => <option key={r.id} value={r.id}>{periodLabel(r)} ({r.status})</option>)}
          </select>
        )}
      </PageHeader>
      <Panel title={`${rows.length} payslip(s)`} padded={false}>
        <DataTable
          loading={payslips.loading}
          error={payslips.error}
          rows={rows}
          empty={manager ? "No payslips yet." : "No finalized payslips available yet."}
          columns={[
            { key: "period", label: "Pay month", render: (r) => `${MONTH_NAMES[r.pay_period_month - 1]} ${r.pay_period_year}` },
            { key: "employee_name", label: "Employee", className: "font-semibold" },
            { key: "employee_code", label: "Code" },
            { key: "department", label: "Department" },
            { key: "gross_pay", label: "Gross", render: (r) => formatMoney(r.gross_pay) },
            { key: "total_deductions", label: "Deductions", render: (r) => formatMoney(r.total_deductions) },
            { key: "net_salary", label: "Net", className: "font-semibold text-brand-600", render: (r) => formatMoney(r.net_salary) },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "view", label: "", render: (r) => <button type="button" onClick={() => setViewing(r)} className={`${linkButton} text-brand-600`}>View</button> },
          ]}
        />
      </Panel>
      {viewing && <PayslipView payslip={viewing} companyName={companyName} onClose={() => setViewing(null)} />}
    </section>
  );
}

export function EmployeeAdvances({ companyId, role, employees, ownEmployeeId }) {
  const manager = canManage(role);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", amount: "", emiAmount: "", purpose: "" });
  const advances = useApi(withQuery("/api/payroll/advances", { companyId, status }));
  const action = useAction();
  const confirm = useConfirm();
  const rows = advances.data?.advances || [];
  const sum = (filter, key) => rows.filter(filter).reduce((s, r) => s + (r[key] || 0), 0);

  async function submit(event) {
    event.preventDefault();
    const result = await action.run(() =>
      sendJson("POST", "/api/payroll/advances", { companyId, employeeId: manager ? form.employeeId : undefined, amount: Number(form.amount), emiAmount: form.emiAmount === "" ? undefined : Number(form.emiAmount), purpose: form.purpose })
    );
    if (result) { setShowForm(false); setForm({ employeeId: "", amount: "", emiAmount: "", purpose: "" }); advances.reload(); }
  }

  async function review(row, verb) {
    let emiAmount;
    if (verb === "approve") {
      const input = await confirm.ask({
        title: "Approve advance",
        message: `Approve ${formatMoney(row.amount)} for ${row.employee_name}? The EMI is recovered through monthly payroll.`,
        confirmLabel: "Approve",
        input: { label: "Monthly EMI to recover (₹)", type: "number", min: "1", step: "0.01", required: true, defaultValue: row.emi_amount ?? "" },
      });
      if (input === null) return;
      emiAmount = Number(input);
    } else {
      const confirmed = await confirm.ask({
        title: verb === "reject" ? "Reject advance" : "Close advance",
        message: `${verb === "reject" ? "Reject" : "Close"} the ${formatMoney(row.amount)} advance for ${row.employee_name}?`,
        confirmLabel: verb === "reject" ? "Reject" : "Close advance",
        danger: verb === "reject",
      });
      if (!confirmed) return;
    }
    const result = await action.run(() => sendJson("PATCH", withQuery(`/api/payroll/advances/${row.id}`, { companyId }), { action: verb, emiAmount }));
    if (result) advances.reload();
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Employee Advances" subtitle="Salary advances recovered through monthly payroll EMI">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["Pending", "Active", "Closed", "Rejected"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button type="button" onClick={() => setShowForm(true)} className={primaryButton}>+ Request Advance</button>
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <StatGrid stats={[
        { label: "Outstanding balance", value: formatMoney(sum((r) => r.status === "Active", "balance")) },
        { label: "Pending approval", value: rows.filter((r) => r.status === "Pending").length, tone: "text-amber-600" },
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
            { key: "amount", label: "Amount", render: (r) => formatMoney(r.amount) },
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
                      <button type="button" disabled={action.busy} onClick={() => review(r, "approve")} className={`${linkButton} text-emerald-700`}>Approve</button>
                      <button type="button" disabled={action.busy} onClick={() => review(r, "reject")} className={`${linkButton} text-red-600`}>Reject</button>
                    </>
                  )}
                  {r.status === "Active" && <button type="button" disabled={action.busy} onClick={() => review(r, "close")} className={`${linkButton} text-slate-600`}>Close</button>}
                  {!["Pending", "Active"].includes(r.status) && "—"}
                </span>
              ),
            }] : []),
          ]}
        />
      </Panel>
      {showForm && (
        <Modal title="Request advance" onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="space-y-4">
            <Notice notice={action.notice} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {manager && <Field label="Employee" required className="sm:col-span-2"><EmployeeSelect employees={employees} value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} required /></Field>}
              <Field label="Amount (₹)" required><input type="number" min="1" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} /></Field>
              <Field label="Proposed monthly EMI (₹)"><input type="number" min="1" step="0.01" value={form.emiAmount} onChange={(e) => setForm({ ...form, emiAmount: e.target.value })} className={inputClass} /></Field>
              <Field label="Purpose" className="sm:col-span-2"><textarea rows={3} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={inputClass} /></Field>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={action.busy} className={primaryButton}>{action.busy ? "Submitting…" : "Submit"}</button>
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

export function StatutoryReport({ companyId, role, kind = "ALL" }) {
  const view = STATUTORY_VIEWS[kind];
  const runs = useApi(canManage(role) ? withQuery("/api/payroll/runs", { companyId }) : null);
  const [runId, setRunId] = useState("");
  const runList = (runs.data?.runs || []).filter((r) => r.status !== "Cancelled");
  const effectiveRunId = runId || (runList[0] ? String(runList[0].id) : "");
  const report = useApi(effectiveRunId ? withQuery("/api/payroll/statutory", { companyId, runId: effectiveRunId }) : null);
  const rows = report.data?.rows || [];
  const totals = report.data?.totals || {};
  const columns = [
    { key: "employee_name", label: "Employee", className: "font-semibold" },
    { key: "employee_code", label: "Code" },
    ...view.columns.map((key) => ({ key, label: COLUMN_LABELS[key], render: (r) => formatMoney(r[key]) })),
  ];

  return (
    <ManagerOnly role={role}>
      <section className="space-y-5">
        <PageHeader title={view.title} subtitle={view.subtitle}>
          <select value={effectiveRunId} onChange={(e) => setRunId(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
            {runList.length === 0 && <option value="">No payroll runs</option>}
            {runList.map((r) => <option key={r.id} value={r.id}>{periodLabel(r)} ({r.status})</option>)}
          </select>
          <button type="button" disabled={!rows.length} onClick={() => downloadCsv(`${view.title.replace(/\s+/g, "-").toLowerCase()}-${effectiveRunId}.csv`, columns.map((c) => ({ key: c.key, label: c.label })), rows)} className={secondaryButton}>Export CSV</button>
        </PageHeader>
        <Notice notice={{ type: "info", message: report.data?.note || "Amounts reflect company-configured salary components. Statutory rates, wage ceilings, eligibility and filing formats (ECR, ESIC challan) must be confirmed by the payroll accountant." }} />
        <StatGrid stats={view.columns.map((key) => ({ label: COLUMN_LABELS[key], value: formatMoney(totals[key] ?? 0) }))} />
        <Panel title={report.data?.run ? `${periodLabel(report.data.run)} — ${report.data.run.status}` : "Report"} padded={false}>
          <DataTable loading={report.loading} error={report.error} rowKey={(r) => r.employee_id} rows={rows} empty="No payslips for this run." columns={columns} />
        </Panel>
      </section>
    </ManagerOnly>
  );
}
