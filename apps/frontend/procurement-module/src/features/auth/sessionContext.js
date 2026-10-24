import { createContext, useContext } from "react";

/**
 * @typedef {Object} SessionState
 * @property {"loading" | "authenticated" | "unauthenticated" | "unavailable"} status
 * @property {import("./authService.js").ProcurementSession | null} session
 * @property {import("../../lib/apiClient.js").ApiError | null} error
 * @property {() => void} reload Fetches the session again (used after signing in).
 * @property {() => void} markSignedOut Treats the session as ended (used after signing out).
 */

/** @type {import("react").Context<SessionState>} */
export const SessionContext = createContext({
  status: "loading",
  session: null,
  error: null,
  reload: () => {},
  markSignedOut: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

/**
 * Frontend visibility only. The backend must still authorize every request.
 * When the session is not loaded, nothing is hidden so access-denied states come from the API.
 */
export function canAccessRoute(session, routeKey) {
  if (!session || !Array.isArray(session.navigation)) return true;
  return session.navigation.includes(routeKey);
}

export function hasPermission(session, permission) {
  if (!session || !Array.isArray(session.permissions)) return true;
  return session.permissions.includes(permission);
}
