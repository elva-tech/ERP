import {
  buildMembershipAccessContext,
  ROUTE_VIEW_PERMISSION,
} from "./hrms-permission-catalog.js";

export {
  HRMS_APPLICATION,
  ALL_PERMISSION_CODES,
  ROUTE_VIEW_PERMISSION,
  resolveMembershipPermissions,
  buildMembershipAccessContext,
} from "./hrms-permission-catalog.js";

export function canViewRoute(permissionCodes, routeId) {
  const required = ROUTE_VIEW_PERMISSION[routeId];
  if (!required) return false;
  return permissionCodes.includes(required);
}