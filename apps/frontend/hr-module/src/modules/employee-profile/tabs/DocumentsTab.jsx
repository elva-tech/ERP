import { useState } from "react";
import { Download, Eye, Trash2 } from "lucide-react";
import { apiBlob, apiRequest, sendJson } from "../../../api";
import {
  formatDate,
  inputClass,
  linkButton,
  submitButton,
  useAction,
  useApi,
} from "../../helpers";
import { DataTable, Field, Notice, Panel, StatusBadge } from "../../ui";
import { DOCUMENT_CATEGORIES } from "../constants";
import { formatBytes, profilePath } from "../utils";
import { useConfirm } from "../../useConfirm";
export function DocumentsTab({ companyId, employeeId, manager, isOwn, onPhotoChanged }) {
  const docs = useApi(profilePath(employeeId, "/documents", companyId));
  const [form, setForm] = useState({ category: "Identity", title: "", file: null });
  const [fileKey, setFileKey] = useState(0);
  const action = useAction();
  const confirm = useConfirm();
  const maxBytes = docs.data?.maxBytes;

  async function upload(event) {
    event.preventDefault();
    if (!form.file) return;
    if (maxBytes && form.file.size > maxBytes) {
      action.setNotice({ type: "error", message: `Files must be at most ${formatBytes(maxBytes)}.` });
      return;
    }
    const body = new FormData();
    body.append("file", form.file);
    body.append("category", form.category);
    body.append("title", form.title.trim());
    const result = await action.run(() => apiRequest(profilePath(employeeId, "/documents", companyId), { method: "POST", body }), "Document uploaded. It is pending verification.");
    if (result) {
      setForm({ category: form.category, title: "", file: null });
      setFileKey((k) => k + 1);
      docs.reload();
      if (form.category === "Photo") onPhotoChanged();
    }
  }

  async function open(doc, download) {
    const result = await action.run(async () => {
      const blob = await apiBlob(profilePath(employeeId, `/documents/${doc.id}`, companyId, download ? { download: 1 } : {}));
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = doc.original_filename || "document";
        link.click();
      } else {
        window.open(url, "_blank", "noopener");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { message: download ? "Download started." : "Opened in a new tab." };
    });
    return result;
  }

  async function review(doc, verb) {
    let note = null;
    if (verb === "reject") {
      note = await confirm.ask({ title: "Reject document", message: `Reject "${doc.title}"? The employee will see the reason.`, confirmLabel: "Reject", danger: true, input: { label: "Reason for rejecting this document", required: true } });
      note = note?.trim();
      if (!note) return;
    }
    const result = await action.run(() => sendJson("PATCH", profilePath(employeeId, `/documents/${doc.id}`, companyId), { action: verb, note }));
    if (result) docs.reload();
  }

  async function remove(doc) {
    if (!(await confirm.ask({ title: "Remove document", message: `Remove "${doc.title}"? It will be hidden but kept for audit.`, confirmLabel: "Remove", danger: true }))) return;
    const result = await action.run(() => apiRequest(profilePath(employeeId, `/documents/${doc.id}`, companyId), { method: "DELETE" }));
    if (result) { docs.reload(); if (doc.category === "Photo") onPhotoChanged(); }
  }

  return (
    <div className="space-y-5">
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <Panel title="Upload document" subtitle={`PDF, PNG or JPEG${maxBytes ? `, up to ${formatBytes(maxBytes)}` : ""}. Files are stored privately and only HR and the employee can open them.`}>
        <form onSubmit={upload} className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr_1fr_auto] md:items-end">
          <Field label="Category" required>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
              {DOCUMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Title" required><input required minLength={2} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. PAN card" className={inputClass} /></Field>
          <Field label="File" required><input key={fileKey} required type="file" accept={form.category === "Photo" ? "image/png,image/jpeg" : "application/pdf,image/png,image/jpeg"} onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className={`${inputClass} py-1.5`} /></Field>
          <button type="submit" disabled={action.busy || !form.file} className={submitButton}>Upload</button>
        </form>
      </Panel>
      <Panel title="Documents" padded={false}>
        <DataTable
          loading={docs.loading}
          error={docs.error}
          rows={docs.data?.documents || []}
          empty="No documents uploaded."
          columns={[
            { key: "title", label: "Document", render: (d) => <div><p className="font-semibold text-ink">{d.title}</p><p className="text-xs text-muted">{d.original_filename} · {formatBytes(d.size_bytes)}</p></div> },
            { key: "category", label: "Category" },
            { key: "uploaded", label: "Uploaded", render: (d) => <div><p>{formatDate(d.created_at)}</p><p className="text-xs text-muted">{d.uploaded_by_name}</p></div> },
            { key: "verification_status", label: "Verification", render: (d) => <div><StatusBadge status={d.verification_status} />{d.verified_by_name && <p className="mt-1 text-xs text-muted">{d.verified_by_name}, {formatDate(d.verified_at)}</p>}{d.verification_note && <p className="mt-1 max-w-[220px] whitespace-normal text-xs text-muted">{d.verification_note}</p>}</div> },
            { key: "actions", label: "Actions", render: (d) => (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => open(d, false)} className={`${linkButton} text-link`}><Eye size={13} className="mr-0.5 inline" />View</button>
                <button type="button" onClick={() => open(d, true)} className={`${linkButton} text-link`}><Download size={13} className="mr-0.5 inline" />Download</button>
                {manager && !isOwn && d.verification_status !== "Verified" && <button type="button" onClick={() => review(d, "verify")} className={`${linkButton} text-success`}>Verify</button>}
                {manager && !isOwn && d.verification_status !== "Rejected" && <button type="button" onClick={() => review(d, "reject")} className={`${linkButton} text-warning-strong`}>Reject</button>}
                {manager && <button type="button" onClick={() => remove(d)} className={`${linkButton} text-danger`}><Trash2 size={13} className="mr-0.5 inline" />Remove</button>}
              </div>
            ) },
          ]}
        />
      </Panel>
      {manager && isOwn && <p className="text-xs text-muted">Your own documents must be verified by another HR manager or company admin.</p>}
      {confirm.dialog}
    </div>
  );
}
