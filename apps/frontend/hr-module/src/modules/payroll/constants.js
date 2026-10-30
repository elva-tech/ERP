
import { MONTH_NAMES } from "../helpers";

export const PAYROLL_RULES_NOTE =
  "Payroll is calculated only from the configured salary components. No PF, ESIC, professional tax or TDS rates are built in. Loss of pay and net-pay rounding follow the approved Payroll Policy; without an approved policy, runs are provisional and cannot be finalized. Mid-month joining/leaving is not prorated. Confirm all statutory components with your payroll accountant before finalizing.";

export const periodLabel = (run) =>
  `${MONTH_NAMES[run.pay_period_month - 1]} ${run.pay_period_year}`;
