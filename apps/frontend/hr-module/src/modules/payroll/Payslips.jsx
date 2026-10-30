import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { withQuery } from "../../api";
import { LOGO_SRC } from "../../shell";
import {
  MONTH_NAMES,
  canManage,
  compactInputClass,
  formatMoney,
  linkButton,
  secondaryButton,
  slateButton,
  useApi,
} from "../helpers";
import {
  DataTable,
  Field,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
} from "../ui";
import { periodLabel } from "./constants";
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
