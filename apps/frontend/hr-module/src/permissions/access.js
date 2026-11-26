import { ROUTE_VIEW_PERMISSION } from "./catalog";

function toSet(permissionCodes) {
  if (!permissionCodes) return new Set();
  if (permissionCodes instanceof Set) return permissionCodes;
  return new Set(permissionCodes);
}

export function hasPermission(permissionCodes, code) {
  if (!code) return false;
  return toSet(permissionCodes).has(code);
}

export function hasAnyPermission(permissionCodes, codes = []) {
  const granted = toSet(permissionCodes);
  return codes.some((code) => granted.has(code));
}

export function hasAllPermissions(permissionCodes, codes = []) {
  const granted = toSet(permissionCodes);
  return codes.every((code) => granted.has(code));
}

export function canViewRoute(permissionCodes, routeId) {
  const required = ROUTE_VIEW_PERMISSION[routeId];
  if (!required) return false;
  return hasPermission(permissionCodes, required);
}

export function canPerformAction(permissionCodes, code) {
  return hasPermission(permissionCodes, code);
}

/** True when the user may change master data (legacy manager write paths). */
export function canMutateWorkspace(permissionCodes) {
  return hasAnyPermission(permissionCodes, [
    "hr.organization.departments.manage",
    "hr.organization.designations.manage",
    "hr.employees.directory.edit",
    "hr.employees.directory.create",
    "hr.leave.types.manage",
    "hr.payroll.processing.manage",
    "hr.settings.users.manage",
  ]);
}

export function canApproveInbox(permissionCodes) {
  return hasAnyPermission(permissionCodes, [
    "hr.approvals.my.approve",
    "hr.leave.approvals.approve",
  ]);
}

export function normalizeAccessPayload(access) {
  if (!access || typeof access !== "object") {
    return {
      application: "hrms",
      permissionCodes: [],
      roles: [],
      actions: {},
      scopes: {},
    };
  }

  return {
    application: access.application || "hrms",
    companyId: access.companyId ? String(access.companyId) : "",
    companyName: access.companyName || "",
    roles: Array.isArray(access.roles) ? access.roles : [],
    permissionCodes: Array.isArray(access.permissionCodes)
      ? access.permissionCodes
      : [],
    actions:
      access.actions && typeof access.actions === "object" ? access.actions : {},
    scopes: access.scopes && typeof access.scopes === "object" ? access.scopes : {},
  };
}