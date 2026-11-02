import { useState } from "react";
import { apiRequest, sendJson, withQuery } from "../api";
import { canManage, isAdmin, linkButton, primaryButton, secondaryButton, useAction, useApi } from "./helpers";
import { DataTable, Modal, Notice, PageHeader, Panel } from "./ui";
import { useConfirm } from "./useConfirm";

/** Generic list + modal form for simple company master records. */
export default function MasterCrud({ title, subtitle, companyId, role, path, query = {}, onChanged, listKey, itemKey, columns, fields, emptyForm, toForm, toPayload, deleteRoleCheck, extraActions }) {
  const manager = canManage(role);
  const list = useApi(withQuery(path, { companyId, ...query }));
  const refresh = () => {
    list.reload();
    onChanged?.();
  };
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const action = useAction();
  const confirm = useConfirm();

  function open(row) {
    setEditing(row || {});
    setForm(row ? toForm(row) : emptyForm);
  }

  async function submit(event) {
    event.preventDefault();
    const payload = toPayload(form);
    const result = await action.run(() =>
      editing?.id
        ? sendJson("PATCH", withQuery(`${path}/${editing.id}`, { companyId }), payload)
        : sendJson("POST", path, { companyId, ...payload })
    );
    if (result) { setEditing(null); refresh(); }
  }

  async function remove(row) {
    if (!(await confirm.ask({ title: `Delete ${itemKey}`, message: `Delete this ${itemKey}? This cannot be undone.`, confirmLabel: "Delete", danger: true }))) return;
    const result = await action.run(() => apiRequest(withQuery(`${path}/${row.id}`, { companyId }), { method: "DELETE" }));
    if (result) refresh();
  }

  return (
    <section className="space-y-5">
      <PageHeader title={title} subtitle={subtitle}>
        {manager && <button type="button" onClick={() => open(null)} className={primaryButton}>+ Add {itemKey}</button>}
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <Panel title={`${list.data?.[listKey]?.length ?? 0} ${title.toLowerCase()}`} padded={false}>
        <DataTable
          loading={list.loading}
          error={list.error}
          rows={list.data?.[listKey] || []}
          columns={[
            ...columns,
            ...(manager ? [{
              key: "actions", label: "Actions", render: (row) => (
                <span className="flex gap-3">
                  {extraActions?.(row, refresh)}
                  <button type="button" onClick={() => open(row)} className={`${linkButton} text-brand-600`}>Edit</button>
                  {(deleteRoleCheck ? deleteRoleCheck(role) : isAdmin(role)) && <button type="button" onClick={() => remove(row)} className={`${linkButton} text-red-600`}>Delete</button>}
                </span>
              ),
            }] : []),
          ]}
        />
      </Panel>
      {editing && (
        <Modal title={`${editing.id ? "Edit" : "Add"} ${itemKey}`} onClose={() => setEditing(null)}>
          <form onSubmit={submit} className="space-y-4">
            <Notice notice={action.notice} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{fields(form, setForm)}</div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={action.busy} className={primaryButton}>{action.busy ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}
      {confirm.dialog}
    </section>
  );
}
