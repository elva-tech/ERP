import { useState } from "react";
import { sendJson, withQuery } from "../../api";
import {
  canManage,
  compactInputClass,
  employeesInDepartment,
  formatDate,
  formatMoney,
  inputClass,
  linkButton,
  primaryButton,
  secondaryButton,
  submitButton,
  useAction,
  useApi,
} from "../helpers";
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
} from "../ui";
import { useConfirm } from "../useConfirm";
const emptyAdvanceForm = { department: "", employeeId: "", months: "", purpose: "" };
const ADVANCE_MONTHS = [1, 2, 3];
const monthsLabel = (months) => (months ? `${months} month${months > 1 ? "s" : ""}` : "â€”");
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
          input: { label: "Approved advance amount (â‚¹)", type: "number", min: "1", step: "0.01", required: true, defaultValue: "" },
        });
        if (amount === null) return;
        body.amount = Number(amount);
      }
      const input = await confirm.ask({
        title: "Approve advance",
        message: `Approve ${formatMoney(row.amount ?? body.amount)} for ${row.employee_name}? The EMI is recovered through monthly payroll.`,
        confirmLabel: "Approve",
        input: { label: "Monthly EMI to recover (â‚¹)", type: "number", min: "1", step: "0.01", required: true, defaultValue: row.emi_amount ?? "" },
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
            { key: "department", label: "Department", wrap: true, render: (r) => r.department || "â€”" },
            { key: "amount", label: "Amount", render: (r) => formatMoney(r.amount) },
            { key: "requested_months", label: "Months", render: (r) => monthsLabel(r.requested_months) },
            { key: "created_at", label: "Requested", render: (r) => formatDate(r.created_at) },
            { key: "purpose", label: "Purpose", render: (r) => r.purpose || "â€”" },
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
                  {!["Pending", "Active"].includes(r.status) && "â€”"}
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
              <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Submittingâ€¦" : "Submit"}</button>
            </div>
          </form>
        </Modal>
      )}
      {confirm.dialog}
    </section>
  );
}
