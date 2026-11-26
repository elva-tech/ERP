import { canManage, isAdmin } from "./modules/helpers";
import { ROUTE_VIEW_PERMISSION } from "./permissions/catalog";
import { canViewRoute } from "./permissions/access";
import { routeSections } from "./routes";

export const menuSections = routeSections.map((section) => ({
  title: section.title,
  items: section.items.map(({ id, label, icon, access, hidden }) => ({
    id,
    label,
    icon,
    access,
    hidden,
  })),
}));

/**
 * Legacy access levels (all, manager, admin, self, approver).
 * Used only when the backend has not yet returned permission codes.
 * Backend authorization remains authoritative.
 */
export function canAccessLegacy(
  access,
  { role, ownEmployeeId, isApprovalDelegate },
) {
  if (access === "all") return true;
  if (access === "manager") return canManage(role);
  if (access === "admin") return isAdmin(role);
  if (access === "self") return Boolean(ownEmployeeId);
  if (access === "approver") {
    return canManage(role) || isApprovalDelegate;
  }

  return false;
}

/** Returns whether a menu item is visible for the active access context. */
export function canAccessItem(
  item,
  { permissionCodes, role, ownEmployeeId, isApprovalDelegate },
) {
  if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
    return canViewRoute(permissionCodes, item.id);
  }

  return canAccessLegacy(item.access, {
    role,
    ownEmployeeId,
    isApprovalDelegate,
  });
}

/** @deprecated Use canAccessItem — kept for existing tests. */
export function canAccess(access, context) {
  return canAccessLegacy(access, context);
}

function buildNavigationContext(context) {
  return {
    permissionCodes: context.permissionCodes || [],
    role: context.role,
    ownEmployeeId: context.ownEmployeeId,
    isApprovalDelegate: context.isApprovalDelegate,
  };
}

/** Accessible pages, including hidden pages used by profile navigation. */
export function accessibleSectionsFor(context) {
  const navigationContext = buildNavigationContext(context);

  return menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canAccessItem(item, navigationContext),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/** Pages exposed in the sidebar and global search. */
export function visibleSectionsFor(context) {
  return accessibleSectionsFor(context)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.hidden),
    }))
    .filter((section) => section.items.length > 0);
}

export { ROUTE_VIEW_PERMISSION };