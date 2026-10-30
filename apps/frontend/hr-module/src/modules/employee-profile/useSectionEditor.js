import { useState } from "react";
import { apiRequest, sendJson } from "../../api";
import { useAction } from "../helpers";
import { useConfirm } from "../useConfirm";
import { profilePath } from "./utils";
export function useSectionEditor({ companyId, employeeId, path, onSaved }) {
  const [editing, setEditing] = useState(null);
  const action = useAction();
  const confirm = useConfirm();
  const save = (body) =>
    editing?.row
      ? sendJson("PATCH", profilePath(employeeId, `/${path}/${editing.row.id}`, companyId), body)
      : sendJson("POST", profilePath(employeeId, `/${path}`, companyId), body);
  const remove = async (row, label) => {
    if (!(await confirm.ask({ title: `Delete ${label}`, message: `Delete this ${label}? This cannot be undone.`, confirmLabel: "Delete", danger: true }))) return;
    const result = await action.run(() => apiRequest(profilePath(employeeId, `/${path}/${row.id}`, companyId), { method: "DELETE" }));
    if (result) onSaved();
  };
  return { editing, setEditing, save, remove, action, dialog: confirm.dialog };
}
