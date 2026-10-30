import { withQuery } from "../../../api";
import { formatDate, formatMoney, useApi } from "../../helpers";
import { DataTable, Notice, Panel, StatusBadge } from "../../ui";
import { ProfileStats } from "../shared";
import { profilePath } from "../utils";
export function SalaryTab({ companyId, employeeId }) {
  const salary = useApi(profilePath(employeeId, "/salary", companyId));
  const payslips = useApi(withQuery("/api/payroll/payslips", { companyId, employeeId }));
  const data = salary.data;
  const b = data?.breakdown;
  const lineColumns = [
    { key: "name", label: "Component", className: "font-semibold" },
    { key: "calculation", label: "Basis", render: (l) => (l.calculation === "Percentage" ? `${l.percentage}% of ${l.percentageOf}` : "Fixed") },
    { key: "amount", label: "Monthly amount", render: (l) => formatMoney(l.amount) },
  ];

  if (salary.loading) return <Panel><p className="text-sm text-muted">Loading salary details…</p></Panel>;
  if (salary.error) return <Notice notice={{ type: "error", message: salary.error }} />;

  return (
    <div className="space-y-5">
      {!data.current ? (
        <Notice notice={{ type: "info", message: "No salary assignment is in effect today." }} />
      ) : b?.error ? (
        <Notice notice={{ type: "error", message: `The assigned salary structure cannot be calculated: ${b.error}` }} />
      ) : (
        <>
          <ProfileStats stats={[
            { label: "Annual CTC", value: formatMoney(b.annualCtc) },
            { label: "Monthly CTC", value: formatMoney(b.monthlyCtc) },
            { label: "Gross earnings", value: formatMoney(b.gross) },
            { label: "Deductions", value: formatMoney(b.totalDeductions), tone: "text-danger" },
            { label: "Net pay", value: formatMoney(b.net), tone: "text-success" },
            { label: "Employer contributions", value: formatMoney(b.employer) },
          ]} />
          <Notice notice={{ type: "info", message: `Structure "${data.current.structure_name}" effective ${formatDate(data.current.effective_from)}. Indicative monthly amounts before loss of pay, advance recovery and rounding; payslips are the record of what was paid.` }} />
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            <Panel title="Earnings" padded={false}><DataTable rows={b.earnings} rowKey={(l) => l.componentId} empty="No earnings configured." columns={lineColumns} /></Panel>
            <Panel title="Deductions" padded={false}><DataTable rows={b.deductions} rowKey={(l) => l.componentId} empty="No deductions configured." columns={lineColumns} /></Panel>
          </div>
          {b.employerContributions.length > 0 && <Panel title="Employer contributions (not deducted from pay)" padded={false}><DataTable rows={b.employerContributions} rowKey={(l) => l.componentId} columns={lineColumns} /></Panel>}
        </>
      )}
      <Panel title="Salary assignments" padded={false}>
        <DataTable
          rows={data.assignments}
          empty="No salary structure assigned."
          columns={[
            { key: "structure_name", label: "Structure", className: "font-semibold" },
            { key: "ctc_annual", label: "Annual CTC", render: (r) => formatMoney(r.ctc_annual) },
            { key: "effective_from", label: "From", render: (r) => formatDate(r.effective_from) },
            { key: "effective_to", label: "To", render: (r) => (r.effective_to ? formatDate(r.effective_to) : "Ongoing") },
            { key: "is_current", label: "", render: (r) => (r.is_current ? <StatusBadge status="Active" /> : "") },
          ]}
        />
      </Panel>
      <Panel title="Payslips" padded={false}>
        <DataTable
          loading={payslips.loading}
          error={payslips.error}
          rows={payslips.data?.payslips || []}
          empty="No payslips available."
          columns={[
            { key: "period", label: "Period", render: (p) => `${String(p.pay_period_month).padStart(2, "0")}/${p.pay_period_year}` },
            { key: "gross_pay", label: "Gross", render: (p) => formatMoney(p.gross_pay) },
            { key: "total_deductions", label: "Deductions", render: (p) => formatMoney(p.total_deductions) },
            { key: "net_salary", label: "Net", className: "font-semibold text-navy", render: (p) => formatMoney(p.net_salary) },
            { key: "run_status", label: "Run status", render: (p) => <StatusBadge status={p.run_status} /> },
          ]}
        />
      </Panel>
    </div>
  );
}
