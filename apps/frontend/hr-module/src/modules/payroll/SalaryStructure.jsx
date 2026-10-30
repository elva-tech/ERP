import { useState } from "react";
import { apiRequest, sendJson, withQuery } from "../../api";
import MasterCrud from "../MasterCrud";
import {
  canManage,
  employeesInDepartment,
  formatDate,
  formatMoney,
  inputClass,
  linkButton,
  primaryButton,
  secondaryButton,
  todayLocal,
  useAction,
  useApi,
} from "../helpers";
import {
  DepartmentSelect,
  EmployeeSelect,
  Field,
  Modal,
  Notice,
  StatusBadge,
} from "../ui";
import { ManagerOnly } from "./shared";
import { PAYROLL_RULES_NOTE } from "./constants";
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
    <Modal title={`Configure structure â€” ${structure.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
        <p className="text-xs text-muted">Fixed components use a monthly amount. Percentage components use the percentage of the base set on the component (CTC = annual CTC Ã· 12, Gross, or another component).</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11.5px] font-semibold text-muted">
              <tr><th className="px-3 py-2">Component</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Calculation</th><th className="px-3 py-2">Value</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody>
              {lines.loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">Loadingâ€¦</td></tr>
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
              { key: "ctc", label: "Annual salary range", render: (r) => (r.ctc_min || r.ctc_max ? `${formatMoney(r.ctc_min)} â€“ ${formatMoney(r.ctc_max)}` : "â€”") },
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
                <Field label="Minimum annual salary (â‚¹)"><input type="number" min="0" value={f.ctcMin} onChange={(e) => set({ ...f, ctcMin: e.target.value })} className={inputClass} /></Field>
                <Field label="Maximum annual salary (â‚¹)"><input type="number" min="0" value={f.ctcMax} onChange={(e) => set({ ...f, ctcMax: e.target.value })} className={inputClass} /></Field>
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
                <Field label="Annual CTC (â‚¹)" required><input type="number" min="1" step="0.01" required value={f.ctcAnnual} onChange={(e) => set({ ...f, ctcAnnual: e.target.value })} className={inputClass} /></Field>
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
