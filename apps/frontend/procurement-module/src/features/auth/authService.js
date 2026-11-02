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

const CLIENT_STORAGE_PREFIX = "procurement.";

/**
 * Removes everything this module keeps in the browser for the signed-in user (e.g. notification state).
 * Authentication itself is a backend cookie, so there is no token to clear on the client.
 */
export function clearClientSession(storages = [globalThis.localStorage, globalThis.sessionStorage]) {
  for (const storage of storages) {
    try {
      if (!storage) continue;
      const keys = [];
      for (let i = 0; i < storage.length; i += 1) keys.push(storage.key(i));
      keys.filter((key) => key?.startsWith(CLIENT_STORAGE_PREFIX)).forEach((key) => storage.removeItem(key));
    } catch {
      // Storage can be blocked by the browser; there is nothing further to clear then.
    }
  }
}
