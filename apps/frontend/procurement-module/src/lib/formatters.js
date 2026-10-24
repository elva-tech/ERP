const EMPTY_VALUE = "—";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function displayText(value) {
  return value === null || value === undefined || value === "" ? EMPTY_VALUE : String(value);
}

/** "2026-01-15" -> "15 Jan 2026". Calendar dates are rendered without timezone shifting. */
export function formatDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate ?? ""));
  if (!match) return EMPTY_VALUE;
  const [, year, month, day] = match;
  const monthLabel = MONTHS[Number(month) - 1];
  return monthLabel ? `${day} ${monthLabel} ${year}` : EMPTY_VALUE;
}

/** ISO timestamp -> "14 Jan 2026, 11:30 PM" in the viewer's timezone. */
export function formatDateTime(isoTimestamp) {
  if (!isoTimestamp) return EMPTY_VALUE;
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return DATE_TIME_FORMATTER.format(date).replace(/\b(am|pm)\b/, (meridiem) => meridiem.toUpperCase());
}

const DECIMAL_PATTERN = /^(-)?(\d+)(?:\.(\d+))?$/;

function groupIndian(integerDigits) {
  if (integerDigits.length <= 3) return integerDigits;
  const lastThree = integerDigits.slice(-3);
  const rest = integerDigits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${lastThree}`;
}

/**
 * Formats a backend decimal string as Indian-grouped rupees without binary floating point.
 * "4520000.00" -> "₹45,20,000"; fraction digits are kept only when non-zero.
 * @param {string | null | undefined} amount
 * @param {{ fractionDigits?: number }} [options]
 */
export function formatInr(amount, options = {}) {
  if (amount === null || amount === undefined || amount === "") return EMPTY_VALUE;
  const match = DECIMAL_PATTERN.exec(String(amount).trim());
  if (!match) return EMPTY_VALUE;
  const [, sign, integerPart, fractionPart = ""] = match;
  const integerDigits = integerPart.replace(/^0+(?=\d)/, "");
  const { fractionDigits } = options;
  let fraction = fractionPart;
  if (fractionDigits !== undefined) {
    fraction = fractionPart.padEnd(fractionDigits, "0").slice(0, fractionDigits);
  } else if (/^0*$/.test(fraction)) {
    fraction = "";
  }
  return `${sign ?? ""}₹${groupIndian(integerDigits)}${fraction ? `.${fraction}` : ""}`;
}

const CRORE = 10_000_000n;
const LAKH = 100_000n;

function toScaledBigInt(amount, scale) {
  const match = DECIMAL_PATTERN.exec(String(amount).trim());
  if (!match) return null;
  const [, sign, integerPart, fractionPart = ""] = match;
  const digits = `${integerPart}${fractionPart.padEnd(scale, "0").slice(0, scale)}`;
  const value = BigInt(digits);
  return sign ? -value : value;
}

/**
 * Display-only compact rupee formatting using integer arithmetic.
 * "125000000.00" -> "₹12.5 Cr"; "2730000" with unit "lakh" -> "₹27.30 Lakhs".
 * @param {string | null | undefined} amount
 * @param {{ unit?: "auto" | "cr" | "lakh", fractionDigits?: number, lakhLabel?: string }} [options]
 */
export function formatInrCompact(amount, options = {}) {
  if (amount === null || amount === undefined || amount === "") return EMPTY_VALUE;
  const scaled = toScaledBigInt(amount, 2);
  if (scaled === null) return EMPTY_VALUE;
  const { unit = "auto", fractionDigits = 1, lakhLabel = "Lakhs" } = options;
  const absolute = scaled < 0n ? -scaled : scaled;
  const rupees = absolute / 100n;
  const resolvedUnit = unit === "auto" ? (rupees >= CRORE ? "cr" : rupees >= LAKH ? "lakh" : "none") : unit;
  if (resolvedUnit === "none") return formatInr(amount);

  const divisor = (resolvedUnit === "cr" ? CRORE : LAKH) * 100n;
  const precision = 10n ** BigInt(fractionDigits);
  const rounded = (absolute * precision + divisor / 2n) / divisor;
  const whole = rounded / precision;
  const fraction = (rounded % precision).toString().padStart(fractionDigits, "0");
  const label = resolvedUnit === "cr" ? "Cr" : lakhLabel;
  const sign = scaled < 0n ? "-" : "";
  return `${sign}₹${whole}${fractionDigits > 0 ? `.${fraction}` : ""} ${label}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === "") return EMPTY_VALUE;
  return `${value}%`;
}

export { EMPTY_VALUE };
