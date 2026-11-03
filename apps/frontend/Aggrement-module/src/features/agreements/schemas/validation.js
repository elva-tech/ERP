/**
 * Runtime validation utilities for Agreement Store
 */

export function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Validates a positive decimal monetary string (up to 2 decimals)
 */
export function isMoneyAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0;
  }
  if (typeof value !== "string") return false;
  const trimmed = value.trim().replace(/,/g, "");
  if (trimmed === "") return false;
  // Non-negative integer or decimal with up to 2 decimal places
  return /^\d+(\.\d{1,2})?$/.test(trimmed);
}

/**
 * Compares two ISO date strings (YYYY-MM-DD).
 * Returns true if end >= start.
 */
export function isValidDateRange(startDate, endDate) {
  if (!startDate || !endDate) return true;
  return endDate >= startDate;
}

/**
 * Parse monetary string into integer paise (cents) to avoid floating point bugs
 */
export function toPaise(value) {
  if (value === null || value === undefined || value === "") return 0n;
  const clean = String(value).trim().replace(/,/g, "");
  const [whole, frac = ""] = clean.split(".");
  const paddedFrac = (frac + "00").slice(0, 2);
  try {
    return BigInt(whole || "0") * 100n + BigInt(paddedFrac);
  } catch {
    return 0n;
  }
}

/**
 * Format paise back to decimal string "12345.67"
 */
export function fromPaise(paise) {
  const p = BigInt(paise);
  const whole = p / 100n;
  const rem = (p % 100n).toString().padStart(2, "0");
  return `${whole}.${rem}`;
}

