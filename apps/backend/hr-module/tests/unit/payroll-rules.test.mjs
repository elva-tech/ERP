import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateStructure,
  computeLop,
  missingPolicyDecisions,
  round2,
  roundNetPay,
} from "../../lib/rules/payroll-rules.mjs";

// Synthetic structure: amounts and percentages are arbitrary test inputs,
// not statutory rates.
const line = (name, component_type, calculation_type, extra = {}) => ({
  component_id: name,
  name,
  component_type,
  calculation_type,
  percentage_of: null,
  amount: null,
  percentage: null,
  is_statutory: false,
  ...extra,
});

const structure = [
  line("Basic", "Earning", "Percentage", { percentage_of: "CTC", percentage: 50 }),
  line("HRA", "Earning", "Percentage", { percentage_of: "Basic", percentage: 40 }),
  line("Special", "Earning", "Fixed", { amount: 1000 }),
  line("Fund Deduction", "Deduction", "Percentage", { percentage_of: "Basic", percentage: 10 }),
  line("Flat Deduction", "Deduction", "Fixed", { amount: 200 }),
  line("Employer Share", "Employer Contribution", "Percentage", { percentage_of: "Basic", percentage: 10 }),
];

test("round2 rounds half away from zero", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(-1.005), -1.01);
  assert.equal(round2(2.344), 2.34);
  assert.equal(round2(0.285), 0.29);
  assert.equal(round2(1234567.125), 1234567.13);
  assert.equal(round2(0), 0);
});

test("calculateStructure without proration", () => {
  const calc = calculateStructure(structure, 120000); // monthly CTC 10000
  assert.equal(calc.monthlyCtc, 10000);
  const amount = (n) => calc.lines.find((l) => l.name === n).amount;
  assert.equal(amount("Basic"), 5000);
  assert.equal(amount("HRA"), 2000);
  assert.equal(calc.gross, 8000);
  assert.equal(calc.deductions, 700);
  assert.equal(calc.employer, 500);
  assert.equal(calc.net, 7300);
});

test("proration applies once to root earnings; derived lines follow their base", () => {
  const calc = calculateStructure(structure, 120000, { earningsFactor: 0.5 });
  const amount = (n) => calc.lines.find((l) => l.name === n).amount;
  assert.equal(amount("Basic"), 2500); // 5000 * 0.5
  assert.equal(amount("HRA"), 1000); // 40% of prorated Basic, not prorated twice
  assert.equal(amount("Special"), 500); // fixed earning prorated
  assert.equal(amount("Fund Deduction"), 250); // follows prorated Basic
  assert.equal(amount("Flat Deduction"), 200); // fixed deduction unchanged
  assert.equal(calc.net, 4000 - 450);
});

test("calculateStructure reports configuration errors", () => {
  assert.match(calculateStructure([line("X", "Earning", "Percentage", { percentage_of: "Gross", percentage: 5 })], 1).error, /cannot be a percentage of Gross/);
  assert.match(calculateStructure([line("X", "Earning", "Fixed")], 1).error, /needs a fixed monthly amount/);
  const circular = [
    line("A", "Earning", "Percentage", { percentage_of: "B", percentage: 1 }),
    line("B", "Earning", "Percentage", { percentage_of: "A", percentage: 1 }),
  ];
  assert.match(calculateStructure(circular, 1).error, /Circular/);
});

test("computeLop: disabled, calendar basis, fixed basis, cap and half days", () => {
  assert.deepEqual(computeLop({ mode: "none", daysInMonth: 31 }).factor, 1);
  const cal = computeLop({ mode: "unpaid_leave", basis: "calendar_days", daysInMonth: 30, unpaidLeaveDays: 3, absenceDays: 2 });
  assert.equal(cal.lopDays, 3); // absence ignored in this mode
  assert.equal(cal.paidDays, 27);
  assert.equal(cal.factor, 27 / 30);
  const abs = computeLop({ mode: "unpaid_leave_and_absence", basis: "fixed_days", fixedDays: 26, daysInMonth: 31, unpaidLeaveDays: 1, absenceDays: 1.5 });
  assert.equal(abs.basisDays, 26);
  assert.equal(abs.lopDays, 2.5);
  assert.equal(abs.factor, 23.5 / 26);
  const capped = computeLop({ mode: "unpaid_leave", basis: "fixed_days", fixedDays: 26, daysInMonth: 31, unpaidLeaveDays: 31 });
  assert.equal(capped.lopDays, 26);
  assert.equal(capped.factor, 0);
  assert.throws(() => computeLop({ mode: "unpaid_leave", basis: "fixed_days", fixedDays: null, daysInMonth: 30 }));
});

test("roundNetPay modes and adjustment", () => {
  assert.deepEqual(roundNetPay(1234.5, "none"), { net: 1234.5, adjustment: 0 });
  assert.deepEqual(roundNetPay(1234.5, "nearest_rupee"), { net: 1235, adjustment: 0.5 });
  assert.deepEqual(roundNetPay(1234.49, "nearest_rupee"), { net: 1234, adjustment: -0.49 });
  assert.deepEqual(roundNetPay(1234.01, "round_up_rupee"), { net: 1235, adjustment: 0.99 });
  assert.deepEqual(roundNetPay(1234, "round_up_rupee"), { net: 1234, adjustment: 0 });
});

test("missingPolicyDecisions lists only required, applicable settings", () => {
  const empty = missingPolicyDecisions({});
  assert.ok(empty.includes("Loss-of-pay mode"));
  assert.ok(empty.includes("PF"));
  assert.ok(!empty.includes("Night-shift punch window"));
  const complete = {
    lop_mode: "unpaid_leave",
    lop_day_basis: "fixed_days",
    lop_fixed_days: 26,
    net_pay_rounding: "none",
    pf_treatment: "not_applicable",
    esic_treatment: "not_applicable",
    professional_tax_treatment: "configured_components",
    tds_treatment: "configured_components",
    overtime_pay_treatment: "not_paid",
    leave_day_counting: "calendar_days",
  };
  assert.deepEqual(missingPolicyDecisions(complete), []);
  assert.deepEqual(missingPolicyDecisions({ ...complete, lop_fixed_days: null }), ["LOP fixed days"]);
  assert.deepEqual(missingPolicyDecisions({ ...complete, lop_mode: "none", lop_day_basis: null, lop_fixed_days: null }), []);
});
