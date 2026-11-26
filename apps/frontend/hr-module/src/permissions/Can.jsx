import { useAccess } from "./AccessProvider";

/**
 * Renders children only when the active access context grants a permission.
 * pattern (Angular *ngIf="user_role==1"): use a catalog variable here and
 * the same string in backend permissionCodes — e.g. <Can permission={HR.payroll.processing.view}>…</Can>
 * UI hiding is not authorization; APIs remain authoritative.
 */
export function Can({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}) {
  const access = useAccess();

  let allowed = true;
  if (permission) {
    allowed = access.hasPermission(permission);
  } else if (anyOf?.length) {
    allowed = access.hasAnyPermission(anyOf);
  } else if (allOf?.length) {
    allowed = access.hasAllPermissions(allOf);
  } else {
    allowed = false;
  }

  if (!allowed) return fallback;
  return children;
}