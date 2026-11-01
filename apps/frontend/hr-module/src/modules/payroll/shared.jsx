
import { canManage } from "../helpers";
import { Notice } from "../ui";

export function ManagerOnly({ role, children, message }) {
  if (!canManage(role)) {
    return (
      <Notice
        notice={{
          type: "info",
          message:
            message ||
            "This page is available to HR managers and company admins.",
        }}
      />
    );
  }

  return children;
}
