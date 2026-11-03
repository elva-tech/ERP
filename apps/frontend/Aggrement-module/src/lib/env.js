/**
 * Environment configuration manager for Agreement Store.
 * Centralizes detection of Mock Mode vs. Real API Mode.
 *
 * NOTE: Production tenant authorization is derived exclusively from the
 * authenticated backend session cookie/JWT. Frontend environment variables
 * must never be used to establish or override tenant authorization in production.
 */

export function getApiMode() {
  const mode = import.meta.env?.VITE_API_MODE;
  return typeof mode === "string" ? mode.trim().toLowerCase() : "mock";
}

export function isMockMode() {
  return getApiMode() === "mock";
}

export function getApiBaseUrl() {
  const url = import.meta.env?.VITE_API_BASE_URL;
  return typeof url === "string" ? url.trim().replace(/\/+$/, "") : "";
}

/**
 * Fallback financial year label if not provided by organization configuration.
 */
export function getDefaultFinancialYear() {
  return "FY 2026-27";
}
