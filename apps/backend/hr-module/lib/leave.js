import { countLeaveDays } from "@/lib/rules/leave-days.mjs";

/**
 * Leave rules implemented here (documented so they can be confirmed with HR):
 * - Requested days = calendar days from fromDate to toDate inclusive, unless
 *   the approved company policy excludes weekly offs and holidays: then the
 *   employee's rostered weekly off and non-restricted company holidays (for
 *   all locations or the employee's work location) are not counted.
 * - A request must fall within a single calendar year (balances are yearly).
 * - Annual allocation defaults to the leave type's days_per_year until HR sets
 *   an explicit allocation for the employee/year.
 * - Available = allocated + carry_forward - used - other pending days.
 *   Paid leave types require enough available balance; unpaid types do not.
 * - Approving deducts from balance; cancelling an approved request restores it.
 */

export const LEAVE_REQUEST_SELECT = `SELECT
  lr.id, lr.company_id, lr.employee_id, e.name AS employee_name, e.employee_code,
  e.department, lt.name AS leave_type_name, lr.leave_type_id, lt.is_paid,
  to_char(lr.from_date, 'YYYY-MM-DD') AS from_date,
  to_char(lr.to_date, 'YYYY-MM-DD') AS to_date,
  lr.days::float8 AS days, lr.reason, lr.status, lr.review_note, lr.reviewed_at,
  u.full_name AS reviewed_by_name, lr.created_at, lr.updated_at
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
  JOIN leave_types lt ON lt.id = lr.leave_type_id
  LEFT JOIN users u ON u.id = lr.reviewed_by`;

/** Locks (or creates) the employee's balance row for the year and returns it. */
export async function lockBalance(client, { companyId, employeeId, leaveType, year }) {
  await client.query(
    `INSERT INTO leave_balances (company_id, employee_id, leave_type_id, year, allocated, used, carry_forward)
     VALUES ($1, $2, $3, $4, $5, 0, 0)
     ON CONFLICT (company_id, employee_id, leave_type_id, year) DO NOTHING`,
    [companyId, employeeId, leaveType.id, year, leaveType.days_per_year]
  );
  const result = await client.query(
    `SELECT id, allocated::float8 AS allocated, used::float8 AS used,
            carry_forward::float8 AS carry_forward
     FROM leave_balances
     WHERE company_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4
     FOR UPDATE`,
    [companyId, employeeId, leaveType.id, year]
  );
  return result.rows[0];
}

export async function pendingDays(client, { employeeId, leaveTypeId, year, excludeId = null }) {
  const result = await client.query(
    `SELECT COALESCE(SUM(days), 0)::float8 AS days FROM leave_requests
     WHERE employee_id = $1 AND leave_type_id = $2 AND status = 'Pending'
       AND EXTRACT(YEAR FROM from_date) = $3
       AND ($4::bigint IS NULL OR id <> $4::bigint)`,
    [employeeId, leaveTypeId, year, excludeId]
  );
  return result.rows[0].days;
}

export function available(balance) {
  return balance.allocated + balance.carry_forward - balance.used;
}

/**
 * Rostered weekly offs and applicable holidays for one employee and range.
 * Restricted (optional) holidays are not treated as days off automatically.
 */
export async function workCalendar(db, { companyId, employeeId, from, to }) {
  const rosters = await db.query(
    `SELECT to_char(r.effective_from, 'YYYY-MM-DD') AS f, to_char(r.effective_to, 'YYYY-MM-DD') AS t, s.weekly_off
     FROM rosters r JOIN shifts s ON s.id = r.shift_id
     WHERE r.company_id = $1 AND r.employee_id = $2
       AND r.effective_from <= $4::date AND (r.effective_to IS NULL OR r.effective_to >= $3::date)
     ORDER BY r.effective_from DESC, r.id DESC`,
    [companyId, employeeId, from, to]
  );
  const holidays = await db.query(
    `SELECT to_char(h.holiday_date, 'YYYY-MM-DD') AS d
     FROM holidays h
     WHERE h.company_id = $1 AND h.holiday_date BETWEEN $2::date AND $3::date
       AND h.type <> 'Restricted'
       AND (h.location IS NULL OR h.location = 'All Locations'
            OR h.location = (SELECT work_location FROM employees WHERE id = $4 AND company_id = $1))`,
    [companyId, from, to, employeeId]
  );
  return {
    weeklyOffFor: (date) =>
      rosters.rows.find((r) => r.f <= date && (!r.t || r.t >= date))?.weekly_off ?? null,
    holidays: new Set(holidays.rows.map((r) => r.d)),
  };
}

/** Counts leave days for an employee under the given counting mode. */
export async function leaveDaysFor(db, { companyId, employeeId, fromDate, toDate, mode }) {
  if (mode !== "exclude_weekly_offs_and_holidays") return countLeaveDays(fromDate, toDate);
  const calendar = await workCalendar(db, { companyId, employeeId, from: fromDate, to: toDate });
  return countLeaveDays(fromDate, toDate, { mode, ...calendar });
}
