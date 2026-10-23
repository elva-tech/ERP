/**
 * Leave day counting (pure). Two modes, chosen in the approved company policy:
 * - calendar_days: every date from fromDate to toDate inclusive.
 * - exclude_weekly_offs_and_holidays: skips dates that are the employee's
 *   rostered weekly off or a company holiday applicable to the employee.
 * Without an approved policy the system counts calendar days.
 */

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function formatDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function eachDate(fromDate, toDate) {
  const dates = [];
  for (let t = parseDate(fromDate); t <= parseDate(toDate); t += 86400000) dates.push(formatDate(t));
  return dates;
}

export function weekdayName(date) {
  return WEEKDAYS[new Date(parseDate(date)).getUTCDay()];
}

/**
 * options.weeklyOffFor(date) -> weekday name ("Sunday") or null for that date
 * options.holidays: Set of "YYYY-MM-DD"
 * Returns { days, excluded: [{ date, reason }] }.
 */
export function countLeaveDays(fromDate, toDate, { mode = "calendar_days", weeklyOffFor = () => null, holidays = new Set() } = {}) {
  const dates = eachDate(fromDate, toDate);
  if (mode !== "exclude_weekly_offs_and_holidays") return { days: dates.length, excluded: [] };

  const excluded = [];
  let days = 0;
  for (const date of dates) {
    const off = weeklyOffFor(date);
    if (off && String(off).trim().toLowerCase() === weekdayName(date)) {
      excluded.push({ date, reason: "Weekly off" });
    } else if (holidays.has(date)) {
      excluded.push({ date, reason: "Holiday" });
    } else {
      days += 1;
    }
  }
  return { days, excluded };
}
