export const DEFAULT_ROUTE_ID = "dashboard";

function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

/** Parse the application hash into a stable route ID and optional profile ID. */
export function parseRouteHash(hash) {
  const normalized = String(hash || "")
    .replace(/^#/, "")
    .replace(/^\/+/, "");

  if (!normalized) {
    return { routeId: DEFAULT_ROUTE_ID, employeeId: null };
  }

  const [rawRouteId, rawEmployeeId] = normalized.split("/");
  const routeId = decodeSegment(rawRouteId) || DEFAULT_ROUTE_ID;
  const employeeId =
    routeId === "employee-profile" && rawEmployeeId
      ? decodeSegment(rawEmployeeId) || null
      : null;

  return { routeId, employeeId };
}

/** Build a refresh-safe URL using stable route IDs rather than menu labels. */
export function createRouteHash(routeId, { employeeId = null } = {}) {
  const base = `#/${encodeURIComponent(routeId || DEFAULT_ROUTE_ID)}`;

  return routeId === "employee-profile" && employeeId !== null && employeeId !== undefined
    ? `${base}/${encodeURIComponent(String(employeeId))}`
    : base;
}
