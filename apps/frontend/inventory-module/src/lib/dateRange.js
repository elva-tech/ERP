const DAY_MS = 86_400_000;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Rolling windows, in days, ending on the reference date (both ends inclusive). */
export const ROLLING_PERIOD_DAYS = { "30d": 30, "60d": 60 };

const utcDay = (year, monthIndex, day) => {
  const time = Date.UTC(year, monthIndex, day);
  const check = new Date(time);
  // Date.UTC rolls 31 Feb over to March; reject it instead.
  return check.getUTCMonth() === monthIndex && check.getUTCDate() === day ? time : null;
};

/**
 * Parses the date formats used by the inventory records ("11 Sep 2026", "11 Sept 2026",
 * "2026-09-11", "2026-09-11T23:30:00Z", "11/09/2026") into a UTC midnight timestamp.
 * Only the calendar date is read, so the user's timezone can never move a record to another day.
 */
export function parseRecordDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : utcDay(value.getFullYear(), value.getMonth(), value.getDate());
  const text = String(value ?? "").trim();
  if (!text) return null;

  let match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(text);
  if (match) return utcDay(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  match = /^(\d{1,2})[\s-]+([A-Za-z]{3,})\.?,?[\s-]+(\d{4})$/.exec(text);
  if (match) {
    const monthIndex = MONTHS.indexOf(match[2].slice(0, 3).toLowerCase());
    return monthIndex < 0 ? null : utcDay(Number(match[3]), monthIndex, Number(match[1]));
  }

  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (match) return utcDay(Number(match[3]), Number(match[2]) - 1, Number(match[1]));

  return null;
}

/**
 * Resolves a period option to an inclusive `{ from, to }` pair of UTC-midnight timestamps.
 *   "all"     current financial period: 1 Apr – 31 Mar around the reference date
 *   "30d"/"60d"  the last N days, ending on (and including) the reference date
 *   "quarter" the previous completed calendar quarter (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec)
 * Returns null when no date restriction applies.
 */
export function resolveDateRange(period, referenceDate) {
  if (!period) return null;
  const reference = parseRecordDate(referenceDate);
  if (reference === null) return null;

  const days = ROLLING_PERIOD_DAYS[period];
  if (days) return { from: reference - (days - 1) * DAY_MS, to: reference };

  const ref = new Date(reference);
  const year = ref.getUTCFullYear();
  const month = ref.getUTCMonth();

  if (period === "all") {
    const startYear = month >= 3 ? year : year - 1;
    return { from: Date.UTC(startYear, 3, 1), to: Date.UTC(startYear + 1, 2, 31) };
  }

  if (period === "quarter") {
    const currentQuarterStart = month - (month % 3);
    // Month -3 / day 0 roll back across the year boundary correctly.
    return {
      from: Date.UTC(year, currentQuarterStart - 3, 1),
      to: Date.UTC(year, currentQuarterStart, 0),
    };
  }
  return null;
}

/** True when the record's date falls inside the period; records with unreadable dates are kept out. */
export function isWithinDateRange(recordDate, range) {
  if (!range) return true;
  const day = parseRecordDate(recordDate);
  return day !== null && day >= range.from && day <= range.to;
}

/** Today's calendar date in the user's own timezone, as "YYYY-MM-DD". */
export function getToday(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Filters records by a period option, measured from `today` (defaults to the real current date). */
export function filterByDatePeriod(records, period, { getDate = (record) => record.date, today = getToday() } = {}) {
  const range = resolveDateRange(period, today);
  return range ? records.filter((record) => isWithinDateRange(getDate(record), range)) : [...records];
}
