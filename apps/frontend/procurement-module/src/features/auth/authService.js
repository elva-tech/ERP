import { apiRequest } from "../../lib/apiClient.js";

/**
 * PROPOSED: the session endpoints are owned by the ELVA identity/platform team and must be confirmed by them.
 * The session is carried by the backend (cookie); the frontend never reads or stores tokens.
 *
 * @typedef {Object} ProcurementSession
 * @property {{ id: string, displayName: string, roleLabel: string, avatarUrl?: string | null }} user
 * @property {{ id: string, name: string }} tenant
 * @property {string[]} permissions e.g. ["procurement.suppliers.read", "procurement.suppliers.create"]
 * @property {string[]} navigation Route keys the user may open, e.g. ["dashboard", "supplierMaster"]
 *
 * @typedef {Object} SignInRequest
 * @property {string} username   Employee ID or email, as typed.
 * @property {string} password   Sent as typed; never trimmed, logged or stored.
 * @property {boolean} rememberMe
 */

/** PROPOSED: GET /procurement/session */
export function getSession(signal) {
  return apiRequest("/procurement/session", { signal });
}

/** PROPOSED (identity team to confirm): POST /procurement/session starts a session. */
export function signIn({ username, password, rememberMe }) {
  return apiRequest("/procurement/session", { method: "POST", body: { username, password, rememberMe } });
}

/** PROPOSED (identity team to confirm): DELETE /procurement/session ends the current session. */
export function signOut() {
  return apiRequest("/procurement/session", { method: "DELETE" });
}
