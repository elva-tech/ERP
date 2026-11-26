
import { useAccess } from "../../permissions/AccessProvider";
import { HR } from "../../permissions/catalog";
import { Notice } from "../ui";

export function PermissionOnly({ permission, children, message }) {
  const access = useAccess();
  if (!access.canPerform(permission)) {
    return (
      <Notice
        notice={{
          type: "info",
          message: message || "You do not have permission to use this page.",
        }}
      />
    );
  }

  return children;
}

/** @deprecated use PermissionOnly with HR.payroll.processing.view */
export function ManagerOnly({ role: _role, children, message, permission = HR.payroll.processing.view }) {
  return (
    <PermissionOnly permission={permission} message={message}>
      {children}
    </PermissionOnly>
  );
}