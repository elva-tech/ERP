/**
 * Formatting utilities for Agreement Store
 */

export function displayText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

/**
 * Format date to standard enterprise format: "15-Jan-2024" or tenant locale
 */
export function formatDate(value, fallback = "—") {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Format monetary amount with Indian Rupee formatting (e.g., ₹48,50,00,000.00 or ₹12,45,000)
 */
export function formatInr(value, options = {}) {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/,/g, ""));
  if (Number.isNaN(num)) return "—";

  const { fractionDigits = 2, currency = "₹" } = options;
  const isNegative = num < 0;
  const abs = Math.abs(num);

  const parts = abs.toFixed(fractionDigits).split(".");
  let intPart = parts[0];
  const decPart = parts[1];

  // Indian numbering: last 3 digits, then groups of 2
  if (intPart.length > 3) {
    const last3 = intPart.substring(intPart.length - 3);
    const other = intPart.substring(0, intPart.length - 3);
    const withCommas = other.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    intPart = `${withCommas},${last3}`;
  }

  const sign = isNegative ? "-" : "";
  const decimals = fractionDigits > 0 ? `.${decPart}` : "";
  return `${sign}${currency} ${intPart}${decimals}`;
}

/**
 * Compact Indian Currency representation (e.g. ₹12.45 Cr, ₹85 L, ₹45 K)
 */
export function formatInrCompact(value, options = {}) {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/,/g, ""));
  if (Number.isNaN(num)) return "—";

  const { currency = "₹", fractionDigits = 2 } = options;
  const isNegative = num < 0;
  const abs = Math.abs(num);

  let formatted = "";
  if (abs >= 10000000) {
    // Crore (1 Cr = 1,00,00,000)
    const cr = abs / 10000000;
    formatted = `${cr.toFixed(fractionDigits).replace(/\.?0+$/, "")} Cr`;
  } else if (abs >= 100000) {
    // Lakh (1 L = 1,00,000)
    const lk = abs / 100000;
    formatted = `${lk.toFixed(fractionDigits).replace(/\.?0+$/, "")} L`;
  } else if (abs >= 1000) {
    // Thousand
    const k = abs / 1000;
    formatted = `${k.toFixed(fractionDigits).replace(/\.?0+$/, "")} K`;
  } else {
    formatted = abs.toFixed(fractionDigits).replace(/\.?0+$/, "");
  }

  return `${isNegative ? "-" : ""}${currency}${formatted}`;
}

/**
 * Parse monetary input into clean numeric string
 */
export function sanitizeMoneyInput(value) {
  if (!value) return "";
  return String(value).replace(/[^0-9.]/g, "");
}

