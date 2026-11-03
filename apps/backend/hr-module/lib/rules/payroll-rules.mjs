/**
 * Pure payroll rules (no database access) so they can be unit tested.
 *
 * Nothing here contains statutory rates (PF, ESIC, PT, TDS). Those amounts
 * come only from salary components the company configures. Rules:
 * - Fixed components are monthly amounts.
 * - Percentage components are a percentage of "CTC" (annual CTC / 12),
 *   "Gross" (deductions/contributions only) or another component of the same
 *   structure (matched by name, case-insensitive).
 * - Every line is rounded to 2 decimals, half away from zero.
 * - Loss-of-pay proration (only when an approved policy enables it)
 *   multiplies Fixed and %-of-CTC earnings by paidDays / basisDays.
 *   Components derived from a prorated component follow it through their
 *   base; fixed deductions and contributions are not prorated.
 */

export function round2(value) {
  // toPrecision(15) removes binary noise such as 1.005 * 100 = 100.49999999999999.
  return (Math.sign(value) * Math.round(Number((Math.abs(value) * 100).toPrecision(15)))) / 100;
}

/**
 * lines: [{ component_id, name, component_type, calculation_type, percentage_of, amount, percentage, is_statutory }]
 * Returns { lines, gross, deductions, employer, net, monthlyCtc } or { error }.
 */
export function calculateStructure(lines, ctcAnnual, { earningsFactor = 1 } = {}) {
  const byName = new Map(lines.map((line) => [line.name.toLowerCase(), line]));
  const values = new Map();
  const visiting = new Set();
  const monthlyCtc = Number(ctcAnnual) / 12;

  const earnings = lines.filter((l) => l.component_type === "Earning");

  function gross() {
    return earnings.reduce((sum, line) => sum + resolve(line), 0);
  }

  function resolve(line) {
    const key = line.name.toLowerCase();
    if (values.has(key)) return values.get(key);
    if (visiting.has(key)) throw new Error(`Circular percentage reference involving "${line.name}".`);
    visiting.add(key);

    let amount;
    let root = false;
    if (line.calculation_type === "Fixed") {
      if (line.amount == null) throw new Error(`"${line.name}" needs a fixed monthly amount.`);
      amount = Number(line.amount);
      root = true;
    } else {
      if (line.percentage == null) throw new Error(`"${line.name}" needs a percentage.`);
      const baseName = String(line.percentage_of || "").trim().toLowerCase();
      let base;
      if (baseName === "ctc") {
        base = monthlyCtc;
        root = true;
      } else if (baseName === "gross") {
        if (line.component_type === "Earning") {
          throw new Error(`Earning "${line.name}" cannot be a percentage of Gross.`);
        }
        base = gross();
      } else if (byName.has(baseName)) base = resolve(byName.get(baseName));
      else throw new Error(`"${line.name}" refers to "${line.percentage_of}", which is not in this structure.`);
      amount = (base * Number(line.percentage)) / 100;
    }

    if (root && line.component_type === "Earning") amount *= earningsFactor;
    amount = round2(amount);
    visiting.delete(key);
    values.set(key, amount);
    return amount;
  }

  try {
    const computed = lines.map((line) => ({
      componentId: String(line.component_id),
      name: line.name,
      type: line.component_type,
      calculation: line.calculation_type,
      percentageOf: line.percentage_of || null,
      percentage: line.percentage == null ? null : Number(line.percentage),
      isStatutory: Boolean(line.is_statutory),
      amount: resolve(line),
    }));
    const sum = (type) => round2(computed.filter((l) => l.type === type).reduce((s, l) => s + l.amount, 0));
    const grossPay = sum("Earning");
    const deductions = sum("Deduction");
    return {
      lines: computed,
      gross: grossPay,
      deductions,
      employer: sum("Employer Contribution"),
      net: round2(grossPay - deductions),
      monthlyCtc: round2(monthlyCtc),
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Loss-of-pay days and the earnings factor for one employee and month.
 * mode: none | unpaid_leave | unpaid_leave_and_absence
 * basis: calendar_days (days in the month) | fixed_days (fixedDays)
 * unpaidLeaveDays / absenceDays: already counted for the month (absence may
 * include 0.5 for half days). The total is capped at the basis days.
 */
export function computeLop({ mode, basis, fixedDays, daysInMonth, unpaidLeaveDays = 0, absenceDays = 0 }) {
  if (!mode || mode === "none") {
    return { basisDays: daysInMonth, lopDays: 0, paidDays: daysInMonth, factor: 1, applied: false };
  }
  const basisDays = basis === "fixed_days" ? Number(fixedDays) : daysInMonth;
  if (!Number.isFinite(basisDays) || basisDays <= 0) throw new Error("LOP basis days are not configured.");
  const raw = unpaidLeaveDays + (mode === "unpaid_leave_and_absence" ? absenceDays : 0);
  const lopDays = Math.min(Math.max(raw, 0), basisDays);
  const paidDays = basisDays - lopDays;
  return { basisDays, lopDays, paidDays, factor: paidDays / basisDays, applied: true };
}

/** Rounds net pay; returns the rounded net and the adjustment (rounded - original). */
export function roundNetPay(net, mode) {
  let rounded = net;
  if (mode === "nearest_rupee") rounded = Math.sign(net) * Math.round(Math.abs(net) + Number.EPSILON);
  else if (mode === "round_up_rupee") rounded = Math.ceil(net - 1e-9);
  rounded = round2(rounded);
  return { net: rounded, adjustment: round2(rounded - net) };
}

export const POLICY_FIELDS = {
  lopMode: { column: "lop_mode", label: "Loss-of-pay mode", values: ["none", "unpaid_leave", "unpaid_leave_and_absence"] },
  lopDayBasis: { column: "lop_day_basis", label: "LOP day basis", values: ["calendar_days", "fixed_days"] },
  lopFixedDays: { column: "lop_fixed_days", label: "LOP fixed days", int: [1, 31] },
  netPayRounding: { column: "net_pay_rounding", label: "Net pay rounding", values: ["none", "nearest_rupee", "round_up_rupee"] },
  pfTreatment: { column: "pf_treatment", label: "PF", values: ["configured_components", "not_applicable"] },
  esicTreatment: { column: "esic_treatment", label: "ESIC", values: ["configured_components", "not_applicable"] },
  professionalTaxTreatment: { column: "professional_tax_treatment", label: "Professional tax", values: ["configured_components", "not_applicable"] },
  tdsTreatment: { column: "tds_treatment", label: "TDS", values: ["configured_components", "not_applicable"] },
  overtimePayTreatment: { column: "overtime_pay_treatment", label: "Overtime pay", values: ["not_paid", "configured_components"] },
  leaveDayCounting: { column: "leave_day_counting", label: "Leave day counting", values: ["calendar_days", "exclude_weekly_offs_and_holidays"] },
  nightShiftWindowMinutes: { column: "night_shift_window_minutes", label: "Night-shift punch window", int: [0, 720], optional: true },
};

/** Lists the decisions still missing before a policy can be approved. */
export function missingPolicyDecisions(policy) {
  const missing = [];
  for (const [key, spec] of Object.entries(POLICY_FIELDS)) {
    if (spec.optional) continue;
    const value = policy?.[spec.column];
    if (key === "lopDayBasis" && (!policy?.lop_mode || policy.lop_mode === "none")) continue;
    if (key === "lopFixedDays" && policy?.lop_day_basis !== "fixed_days") continue;
    if (key === "lopFixedDays" && (!policy?.lop_mode || policy.lop_mode === "none")) continue;
    if (value === null || value === undefined || value === "") missing.push(spec.label);
  }
  return missing;
}
