import { sendJson } from "../api";
import { formatDate, linkButton, secondaryButton, useAction, useApi } from "./helpers";
import { DataTable, Notice, PageHeader, Panel } from "./ui";
import { useConfirm } from "./useConfirm";

/** Platform administrators review self-registered companies awaiting approval. */
export function PlatformAdminConsole() {
  const pending = useApi("/api/admin/companies/pending");
  const action = useAction();
  const confirm = useConfirm();

  async function decide(company, decision) {
    const verb = decision === "approve" ? "Approve" : "Reject";
    const confirmed = await confirm.ask({
      title: `${verb} company`,
      message: `${verb} "${company.company_name}"? ${decision === "approve" ? "Its administrator will be able to sign in." : "Its administrator will not be able to sign in."}`,
      confirmLabel: verb,
      danger: decision !== "approve",
    });
    if (!confirmed) return;
    const result = await action.run(() => sendJson("PATCH", `/api/companies/${company.company_id}/approval`, { decision }));
    if (result) pending.reload();
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
      <PageHeader title="Company Registrations" subtitle="Self-registered companies waiting for platform approval">
        <button type="button" onClick={pending.reload} className={secondaryButton}>↻ Refresh</button>
      </PageHeader>
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <Panel title="Pending companies" padded={false}>
        <DataTable
          loading={pending.loading}
          error={pending.error}
          rows={pending.data?.companies || []}
          rowKey={(c) => c.company_id}
          empty="No companies are waiting for approval."
          columns={[
            { key: "company_name", label: "Company", className: "font-semibold" },
            { key: "admin", label: "Administrator", render: (c) => <div><p>{c.admin_name}</p><p className="text-xs text-slate-500">{c.admin_email}</p></div> },
            { key: "registered_at", label: "Registered", render: (c) => formatDate(c.registered_at) },
            { key: "actions", label: "", render: (c) => (
              <div className="flex gap-3">
                <button type="button" disabled={action.busy} onClick={() => decide(c, "approve")} className={`${linkButton} text-emerald-700`}>Approve</button>
                <button type="button" disabled={action.busy} onClick={() => decide(c, "reject")} className={`${linkButton} text-red-600`}>Reject</button>
              </div>
            ) },
          ]}
        />
      </Panel>
      {confirm.dialog}
    </main>
  );
}
