import { useState } from "react";
import {
  createEmployeeProfileSection,
  deleteEmployeeProfileSection,
  updateEmployeeProfileSection,
} from "../../services/employees";
import { useAction } from "../helpers";
import { useConfirm } from "../useConfirm";
export function useSectionEditor({ companyId, employeeId, path, onSaved }) {
  const [editing, setEditing] = useState(null);
  const action = useAction();
  const confirm = useConfirm();
  const save = (body) =>
    editing?.row
      ? updateEmployeeProfileSection(employeeId, companyId, path, editing.row.id, body)
      : createEmployeeProfileSection(employeeId, companyId, path, body);
  const remove = async (row, label) => {
    if (!(await confirm.ask({ title: `Delete ${label}`, message: `Delete this ${label}? This cannot be undone.`, confirmLabel: "Delete", danger: true }))) return;
    const result = await action.run(() => deleteEmployeeProfileSection(employeeId, companyId, path, row.id));
    if (result) onSaved();
  };
  return { editing, setEditing, save, remove, action, dialog: confirm.dialog };
}
