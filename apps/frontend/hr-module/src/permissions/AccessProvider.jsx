import { createContext, useContext, useMemo } from "react";
import {
  canApproveInbox,
  canMutateWorkspace,
  canPerformAction,
  canViewRoute,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  normalizeAccessPayload,
} from "./access";

const AccessContext = createContext(null);

export function AccessProvider({
  access,
  children,
  permissionsReady = true,
}) {
  const normalized = useMemo(
    () => normalizeAccessPayload(access),
    [access],
  );

  const value = useMemo(
    () => ({
      ...normalized,
      ready: permissionsReady && normalized.permissionCodes.length > 0,
      hasPermission: (code) => hasPermission(normalized.permissionCodes, code),
      hasAnyPermission: (codes) =>
        hasAnyPermission(normalized.permissionCodes, codes),
      hasAllPermissions: (codes) =>
        hasAllPermissions(normalized.permissionCodes, codes),
      canViewRoute: (routeId) =>
        canViewRoute(normalized.permissionCodes, routeId),
      canPerform: (code) =>
        canPerformAction(normalized.permissionCodes, code),
      canMutateWorkspace: () => canMutateWorkspace(normalized.permissionCodes),
      canApproveInbox: () => canApproveInbox(normalized.permissionCodes),
    }),
    [normalized, permissionsReady],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within AccessProvider.");
  }
  return context;
}

/** Safe variant for modules that render before access is mounted. */
export function useOptionalAccess() {
  return useContext(AccessContext);
}