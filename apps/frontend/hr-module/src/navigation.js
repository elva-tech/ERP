import { canManage, isAdmin } from "./modules/helpers";
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

// Access levels: all, manager, admin, self, approver.
// Backend authorization remains authoritative.
export function canAccess(
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

/** Accessible pages, including hidden pages used by profile navigation. */
export function accessibleSectionsFor(context) {
  return menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canAccess(item.access, context),
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