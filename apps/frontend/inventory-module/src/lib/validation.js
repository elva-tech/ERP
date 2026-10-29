const DECIMAL = /^\d+(\.\d+)?$/;
const MONEY = /^\d+(\.\d{1,2})?$/;

/** True for a decimal string strictly greater than zero ("0.5", "12"). */
export function isPositiveDecimal(value) {
  const text = String(value ?? "").trim();
  return DECIMAL.test(text) && /[1-9]/.test(text);
}

/** True for a non-negative amount with at most two decimal places. */
export function isMoneyAmount(value) {
  return MONEY.test(String(value ?? "").trim());
}

export function isBlank(value) {
  return String(value ?? "").trim() === "";
}

function toScaled(value, scale) {
  const text = String(value ?? "").trim();
  if (!DECIMAL.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > scale) return null;
  return BigInt(`${whole}${fraction.padEnd(scale, "0")}`);
}

/**
 * True when decimal string `value` is greater than decimal string `limit` (compared without floating point).
 * Used only to give early feedback; the backend enforces the same limit.
 */
export function exceedsDecimal(value, limit, scale = 3) {
  const a = toScaled(value, scale);
  const b = toScaled(limit, scale);
  return a !== null && b !== null && a > b;
}
