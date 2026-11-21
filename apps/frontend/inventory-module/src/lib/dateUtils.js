/**
 * Date utility functions for timezone-safe date range comparisons and validation.
 */

const MONTH_NAMES = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Parses a YYYY-MM-DD input date string to local day boundary in ms.
 * Avoids UTC timezone shifts by constructing local Date directly.
 * @param {string} dateStr YYYY-MM-DD
 * @param {boolean} isEndOfDay If true, returns 23:59:59.999; if false, returns 00:00:00.000
 * @returns {number|null}
 */
export function parseBoundaryMs(dateStr, isEndOfDay = false) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.trim().split("-");
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return isEndOfDay
        ? new Date(year, month, day, 23, 59, 59, 999).getTime()
        : new Date(year, month, day, 0, 0, 0, 0).getTime();
    }
  }
  const d = new Date(dateStr);
  const time = d.getTime();
  if (isNaN(time)) return null;
  return isEndOfDay ? new Date(d.setHours(23, 59, 59, 999)).getTime() : new Date(d.setHours(0, 0, 0, 0)).getTime();
}

/**
 * Robustly parses various ERP record date formats to timestamp ms:
 * - ISO string: "2026-10-31" or "2026-10-31T14:30:00.000Z"
 * - Human date: "11 Sep 2026" or "31 Oct 2026"
 * - Numeric timestamp: 1793404800000
 */
export function parseRecordDateToMs(recordDate) {
  if (!recordDate) return null;
  if (typeof recordDate === "number") return isNaN(recordDate) ? null : recordDate;
  if (recordDate instanceof Date) return isNaN(recordDate.getTime()) ? null : recordDate.getTime();

  const str = String(recordDate).trim();
  if (!str) return null;

  // Match "DD MMM YYYY" (e.g. 11 Sep 2026)
  const humanMatch = str.match(/^(\d{1,2})[\s\-\./]+([A-Za-z]{3})[\s\-\./]+(\d{4})$/);
  if (humanMatch) {
    const day = Number(humanMatch[1]);
    const monthKey = humanMatch[2].toLowerCase();
    const year = Number(humanMatch[3]);
    if (monthKey in MONTH_NAMES && !isNaN(day) && !isNaN(year)) {
      // Use noon to avoid any boundary / daylight-savings jitter
      return new Date(year, MONTH_NAMES[monthKey], day, 12, 0, 0, 0).getTime();
    }
  }

  // Match "YYYY-MM-DD"
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    return new Date(year, month, day, 12, 0, 0, 0).getTime();
  }

  const d = new Date(str);
  const time = d.getTime();
  return isNaN(time) ? null : time;
}

/**
 * Validates whether start date is chronologically on or before end date.
 */
export function isValidDateRange(startDate, endDate) {
  if (!startDate || !endDate) return true;
  const startMs = parseBoundaryMs(startDate, false);
  const endMs = parseBoundaryMs(endDate, true);
  if (startMs === null || endMs === null) return true;
  return startMs <= endMs;
}

/**
 * Checks whether a given record date is within [startDate, endDate] (inclusive).
 * - Correctly supports same-day ranges (startDate === endDate)
 * - Safely rejects inverted ranges (startDate > endDate returns false)
 * - Safely rejects invalid or missing dates
 * - Prevents timezone boundary day-shift bugs
 */
export function isWithinDateRange(recordDate, startDate, endDate) {
  if (!startDate && !endDate) return true;

  // An inverted range is strictly invalid; do not return true
  if (startDate && endDate && !isValidDateRange(startDate, endDate)) {
    return false;
  }

  if (!recordDate) return false;
  const recordMs = parseRecordDateToMs(recordDate);
  if (recordMs === null) return false;

  if (startDate) {
    const startMs = parseBoundaryMs(startDate, false);
    if (startMs !== null && recordMs < startMs) return false;
  }

  if (endDate) {
    const endMs = parseBoundaryMs(endDate, true);
    if (endMs !== null && recordMs > endMs) return false;
  }

  return true;
}
