import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { apiBlob, apiRequest, sendJson, withQuery } from "../api";
import {
  formatDate,
  formatMinutes,
  formatMoney,
  inputClass,
  linkButton,
  monthBounds,
  currentMonth,
  submitButton,
  secondaryButton,
  useAction,
  useApi,
} from "./helpers";
import { DataTable, Field, Modal, Notice, Panel, StatusBadge } from "./ui";
import { useConfirm } from "./useConfirm";

const TABS = ["Personal Info", "Employment", "Documents", "Salary", "Attendance", "Leave"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Consultant"];
const DOCUMENT_CATEGORIES = ["Identity", "Address Proof", "Education", "Employment", "Payroll", "Photo", "Other"];
const HISTORY_EVENTS = ["Joined", "Promotion", "Transfer", "Role Change", "Status Change", "Previous Employment", "Other"];

const ADDRESS_FIELDS = [
  { key: "addressType", column: "address_type", label: "Address type", type: "select", options: ["Current", "Permanent"], required: true },
  { key: "line1", column: "line1", label: "Address line 1", required: true, wide: true },
  { key: "line2", column: "line2", label: "Address line 2", wide: true },
  { key: "city", column: "city", label: "City", required: true },
  { key: "state", column: "state", label: "State" },
  { key: "postalCode", column: "postal_code", label: "Postal code" },
  { key: "country", column: "country", label: "Country" },
];
const CONTACT_FIELDS = [
  { key: "name", column: "name", label: "Name", required: true },
  { key: "relationship", column: "relationship", label: "Relationship", required: true },
  { key: "phone", column: "phone", label: "Phone", required: true, type: "tel" },
  { key: "alternatePhone", column: "alternate_phone", label: "Alternate phone", type: "tel" },
  { key: "email", column: "email", label: "Email", type: "email" },
  { key: "isPrimary", column: "is_primary", label: "Primary contact", type: "checkbox" },
];
const BANK_FIELDS = [
  { key: "accountHolderName", column: "account_holder_name", label: "Account holder name", required: true },
  { key: "bankName", column: "bank_name", label: "Bank name", required: true },
  { key: "branch", column: "branch", label: "Branch" },
  { key: "accountNumber", column: "account_number", label: "Account number", required: true },
  { key: "ifscCode", column: "ifsc_code", label: "IFSC code", required: true },
  { key: "accountType", column: "account_type", label: "Account type", type: "select", options: ["Savings", "Current", "Salary"] },
  { key: "isPrimary", column: "is_primary", label: "Primary salary account", type: "checkbox" },
];
const HISTORY_FIELDS = [
  { key: "eventType", column: "event_type", label: "Event", type: "select", options: HISTORY_EVENTS, required: true },
  { key: "effectiveDate", column: "effective_date", label: "Effective date", type: "date", required: true },
  { key: "organization", column: "organization", label: "Organization (for previous employment)" },
  { key: "department", column: "department", label: "Department" },
  { key: "designation", column: "designation", label: "Designation / position" },
  { key: "notes", column: "notes", label: "Notes", type: "textarea", wide: true },
];

const profilePath = (employeeId, suffix, companyId, params = {}) =>
  withQuery(`/api/employees/${encodeURIComponent(employeeId)}${suffix}`, { companyId, ...params });

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ProfileStats({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 rounded-lg border border-line bg-surface p-4">
          <p className="text-[11px] font-bold uppercase text-muted">{stat.label}</p>
          <p className={`mt-2 break-words text-xl font-bold ${stat.tone || "text-navy"}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

function DetailGrid({ items }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 border-b border-line-soft pb-3">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-ink">{value || <span className="font-normal text-placeholder">Not provided</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Generic add/edit form for one profile section row. */
function SectionForm({ title, fields, initial, onSubmit, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, initial ? initial[f.column] ?? (f.type === "checkbox" ? false : "") : f.type === "checkbox" ? false : f.options?.[0] && f.required ? f.options[0] : ""]))
  );
  const action = useAction();

  async function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? Boolean(values[f.key]) : values[f.key] === "" ? null : values[f.key]]));
    const result = await action.run(() => onSubmit(body));
    if (result) onClose(true);
  }

  return (
    <Modal title={title} onClose={() => onClose(false)}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) =>
            f.type === "checkbox" ? (
              <label key={f.key} className="flex items-center gap-2 text-sm font-medium text-ink-soft sm:col-span-2">
                <input type="checkbox" checked={Boolean(values[f.key])} onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })} className="h-4 w-4 accent-brand" />
                {f.label}
              </label>
            ) : (
              <Field key={f.key} label={f.label} required={f.required} className={f.wide ? "sm:col-span-2" : ""}>
                {f.type === "select" ? (
                  <select required={f.required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className={inputClass}>
                    {!f.required && <option value="">Not specified</option>}
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea rows={3} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className={inputClass} />
                ) : (
                  <input type={f.type || "text"} required={f.required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className={inputClass} />
                )}
              </Field>
            )
          )}
        </div>
        <Notice notice={action.notice?.type === "error" ? action.notice : null} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={() => onClose(false)} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Rows of one section with add/edit/delete, using the section API. */
function useSectionEditor({ companyId, employeeId, path, onSaved }) {
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

function SummaryCard({ data, photoUrl, canUploadPhoto, onPhotoSelected, onPhotoError, uploading }) {
  const e = data.employee;
  const fileInput = useRef(null);
  const full = data.access !== "directory";
  return (
    <aside className="h-fit rounded-xl border border-line bg-surface p-5 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:gap-6 lg:sticky lg:top-24 lg:block">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {photoUrl ? (
            <img src={photoUrl} alt={`${e.name} profile`} onError={onPhotoError} className="h-28 w-28 rounded-full border-4 border-surface object-cover shadow" />
          ) : (
            <div aria-label={`${e.name} initials`} className="flex h-28 w-28 items-center justify-center rounded-full bg-brand text-3xl font-bold text-surface shadow">
              {initials(e.name)}
            </div>
          )}
          {canUploadPhoto && (
            <>
              <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} aria-label="Change profile photo" title="Change profile photo" className="absolute bottom-1 right-1 rounded-full border border-line bg-surface p-2 text-ink-soft shadow hover:bg-surface-muted disabled:opacity-60">
                <Camera size={15} />
              </button>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onPhotoSelected(file); }} />
            </>
          )}
        </div>
        <h3 className="mt-4 text-xl font-bold text-ink">{e.name}</h3>
        <p className="text-sm text-muted">{e.designation}</p>
        <p className="mt-1 text-xs font-semibold text-navy">{e.employee_code}</p>
        <div className="mt-3"><StatusBadge status={e.status} /></div>
      </div>
      <dl className="mt-5 space-y-3 border-t border-line-soft pt-4 text-sm md:mt-0 md:border-t-0 md:pt-0 lg:mt-5 lg:border-t lg:pt-4">
        {[
          ["Department", e.department],
          ["Designation", e.designation],
          ...(full
            ? [
                ["Date of joining", e.date_of_joining ? formatDate(e.date_of_joining) : null],
                ["Employment type", e.employment_type],
                ["Work location", e.work_location],
                ["Reporting manager", data.reportingManager ? `${data.reportingManager.name} (${data.reportingManager.employee_code})` : null],
                ["Email", e.email],
                ["Phone", e.phone],
              ]
            : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-ink">{value || <span className="font-normal text-placeholder">—</span>}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function EmploymentEditModal({ companyId, employee, employees, onClose }) {
  const [values, setValues] = useState({
    dateOfJoining: employee.date_of_joining || "",
    dateOfBirth: employee.date_of_birth || "",
    gender: employee.gender || "",
    employmentType: employee.employment_type || "",
    workLocation: employee.work_location || "",
    reportingManagerId: employee.reporting_manager_id ? String(employee.reporting_manager_id) : "",
  });
  const action = useAction();
  const managers = employees.filter((x) => String(x.id) !== String(employee.id) && (x.status === "Active" || String(x.id) === values.reportingManagerId));

  async function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]));
    const result = await action.run(() => sendJson("PATCH", profilePath(employee.id, "", companyId), body));
    if (result) onClose(true);
  }

  return (
    <Modal title="Edit personal & employment details" onClose={() => onClose(false)}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date of joining"><input type="date" value={values.dateOfJoining} onChange={(e) => setValues({ ...values, dateOfJoining: e.target.value })} className={inputClass} /></Field>
          <Field label="Date of birth"><input type="date" value={values.dateOfBirth} onChange={(e) => setValues({ ...values, dateOfBirth: e.target.value })} className={inputClass} /></Field>
          <Field label="Gender">
            <select value={values.gender} onChange={(e) => setValues({ ...values, gender: e.target.value })} className={inputClass}>
              <option value="">Not specified</option>
              {GENDERS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Employment type">
            <select value={values.employmentType} onChange={(e) => setValues({ ...values, employmentType: e.target.value })} className={inputClass}>
              <option value="">Not specified</option>
              {EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Work location" className="sm:col-span-2"><input value={values.workLocation} maxLength={200} onChange={(e) => setValues({ ...values, workLocation: e.target.value })} className={inputClass} /></Field>
          <Field label="Reporting manager" className="sm:col-span-2">
            <select value={values.reportingManagerId} onChange={(e) => setValues({ ...values, reportingManagerId: e.target.value })} className={inputClass}>
              <option value="">None</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.employeeCode})</option>)}
            </select>
          </Field>
        </div>
        <p className="text-xs text-muted">Department, designation and status are edited from the Employee Directory; those changes are recorded in the employment history automatically.</p>
        <Notice notice={action.notice?.type === "error" ? action.notice : null} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={() => onClose(false)} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function PersonalTab({ companyId, data, manager, canSelfEdit, reload, onEdit }) {
  const e = data.employee;
  const addresses = useSectionEditor({ companyId, employeeId: e.id, path: "addresses", onSaved: reload });
  const contacts = useSectionEditor({ companyId, employeeId: e.id, path: "emergency-contacts", onSaved: reload });
  const bank = useSectionEditor({ companyId, employeeId: e.id, path: "bank-accounts", onSaved: reload });
  const canEdit = manager || canSelfEdit;
  const closeWith = (editor) => (saved) => { editor.setEditing(null); if (saved) reload(); };

  return (
    <div className="space-y-5">
      <Panel title="Personal details" actions={manager && <button type="button" onClick={onEdit} className={secondaryButton}><Pencil size={14} className="mr-1 inline" />Edit</button>}>
        <DetailGrid items={[
          ["Full name", e.name],
          ["Date of birth", e.date_of_birth ? formatDate(e.date_of_birth) : null],
          ["Gender", e.gender],
          ["Email", e.email],
          ["Phone", e.phone],
        ]} />
      </Panel>

      <Panel title="Addresses">
        <Notice notice={addresses.action.notice?.type === "error" ? addresses.action.notice : null} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {["Current", "Permanent"].map((type) => {
            const row = data.addresses.find((a) => a.address_type === type);
            return (
              <div key={type} className="rounded-lg border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink-soft">{type} address</p>
                  {canEdit && (
                    <div className="flex gap-3">
                      <button type="button" onClick={() => addresses.setEditing({ row: row || null, type })} className={`${linkButton} text-link`}>{row ? "Edit" : "Add"}</button>
                      {row && <button type="button" onClick={() => addresses.remove(row, "address")} className={`${linkButton} text-danger`}>Delete</button>}
                    </div>
                  )}
                </div>
                {row ? (
                  <address className="mt-2 text-sm not-italic leading-6 text-ink-soft">
                    {row.line1}{row.line2 ? <><br />{row.line2}</> : null}<br />
                    {[row.city, row.state, row.postal_code].filter(Boolean).join(", ")}{row.country ? <><br />{row.country}</> : null}
                  </address>
                ) : (
                  <p className="mt-2 text-sm text-placeholder">Not provided</p>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Emergency contacts" padded={false} actions={canEdit && <button type="button" onClick={() => contacts.setEditing({ row: null })} className={secondaryButton}><Plus size={14} className="mr-1 inline" />Add contact</button>}>
        <div className="px-5 pt-3"><Notice notice={contacts.action.notice?.type === "error" ? contacts.action.notice : null} /></div>
        <DataTable
          rows={data.contacts}
          empty="No emergency contacts recorded."
          columns={[
            { key: "name", label: "Name", className: "font-semibold" },
            { key: "relationship", label: "Relationship" },
            { key: "phone", label: "Phone" },
            { key: "alternate_phone", label: "Alternate", render: (r) => r.alternate_phone || "—" },
            { key: "email", label: "Email", render: (r) => r.email || "—" },
            { key: "is_primary", label: "Primary", render: (r) => (r.is_primary ? <StatusBadge status="Primary" /> : "—") },
            ...(canEdit ? [{ key: "actions", label: "", render: (r) => (
              <div className="flex gap-3">
                <button type="button" onClick={() => contacts.setEditing({ row: r })} className={`${linkButton} text-link`}>Edit</button>
                <button type="button" onClick={() => contacts.remove(r, "contact")} className={`${linkButton} text-danger`}>Delete</button>
              </div>
            ) }] : []),
          ]}
        />
      </Panel>

      <Panel title="Bank details" subtitle={manager ? "Used for salary credit." : "Account numbers are masked. Contact HR to change bank details."} padded={false} actions={manager && <button type="button" onClick={() => bank.setEditing({ row: null })} className={secondaryButton}><Plus size={14} className="mr-1 inline" />Add account</button>}>
        <div className="px-5 pt-3"><Notice notice={bank.action.notice?.type === "error" ? bank.action.notice : null} /></div>
        <DataTable
          rows={data.bankAccounts}
          empty="No bank account recorded."
          columns={[
            { key: "bank_name", label: "Bank", className: "font-semibold" },
            { key: "account_holder_name", label: "Account holder" },
            { key: "account_number", label: "Account number" },
            { key: "ifsc_code", label: "IFSC" },
            { key: "branch", label: "Branch", render: (r) => r.branch || "—" },
            { key: "account_type", label: "Type", render: (r) => r.account_type || "—" },
            { key: "is_primary", label: "Primary", render: (r) => (r.is_primary ? <StatusBadge status="Primary" /> : "—") },
            ...(manager ? [{ key: "actions", label: "", render: (r) => (
              <div className="flex gap-3">
                <button type="button" onClick={() => bank.setEditing({ row: r })} className={`${linkButton} text-link`}>Edit</button>
                <button type="button" onClick={() => bank.remove(r, "bank account")} className={`${linkButton} text-danger`}>Delete</button>
              </div>
            ) }] : []),
          ]}
        />
      </Panel>

      {addresses.editing && (
        <SectionForm
          title={`${addresses.editing.row ? "Edit" : "Add"} address`}
          fields={ADDRESS_FIELDS}
          initial={addresses.editing.row || { address_type: addresses.editing.type }}
          onSubmit={addresses.save}
          onClose={closeWith(addresses)}
        />
      )}
      {contacts.editing && <SectionForm title={`${contacts.editing.row ? "Edit" : "Add"} emergency contact`} fields={CONTACT_FIELDS} initial={contacts.editing.row} onSubmit={contacts.save} onClose={closeWith(contacts)} />}
      {bank.editing && <SectionForm title={`${bank.editing.row ? "Edit" : "Add"} bank account`} fields={BANK_FIELDS} initial={bank.editing.row} onSubmit={bank.save} onClose={closeWith(bank)} />}
      {addresses.dialog}
      {contacts.dialog}
      {bank.dialog}
    </div>
  );
}

function historySummary(h) {
  if (h.source === "system") {
    if (h.event_type === "Status Change") return `Status: ${h.previous_status} → ${h.new_status}`;
    const parts = [];
    if ((h.previous_designation || "") !== (h.designation || "")) parts.push(`Designation: ${h.previous_designation || "—"} → ${h.designation}`);
    if ((h.previous_department || "") !== (h.department || "")) parts.push(`Department: ${h.previous_department || "—"} → ${h.department}`);
    return parts.join(" · ");
  }
  return [h.designation, h.department, h.organization].filter(Boolean).join(" · ");
}

function EmploymentTab({ companyId, data, manager, reload, onEdit }) {
  const e = data.employee;
  const history = useSectionEditor({ companyId, employeeId: e.id, path: "history", onSaved: reload });
  return (
    <div className="space-y-5">
      <Panel title="Employment details" actions={manager && <button type="button" onClick={onEdit} className={secondaryButton}><Pencil size={14} className="mr-1 inline" />Edit</button>}>
        <DetailGrid items={[
          ["Employee code", e.employee_code],
          ["Department", e.department],
          ["Designation", e.designation],
          ["Employment type", e.employment_type],
          ["Work location", e.work_location],
          ["Date of joining", e.date_of_joining ? formatDate(e.date_of_joining) : null],
          ["Reporting manager", data.reportingManager ? `${data.reportingManager.name} · ${data.reportingManager.designation}` : null],
          ["Status", e.status],
          ...(manager ? [["Linked login", data.login ? `${data.login.email}${data.login.role ? ` (${data.login.role.replace("_", " ")})` : ""}` : "Not linked"]] : []),
        ]} />
      </Panel>

      <Panel title="Direct reports" padded={false}>
        <DataTable
          rows={data.directReports}
          empty="No one reports to this employee."
          columns={[
            { key: "name", label: "Name", className: "font-semibold" },
            { key: "employee_code", label: "Code" },
            { key: "designation", label: "Designation" },
            { key: "department", label: "Department" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </Panel>

      <Panel title="Employment history" subtitle="Changes made in this system are recorded automatically; HR can add earlier positions." actions={manager && <button type="button" onClick={() => history.setEditing({ row: null })} className={secondaryButton}><Plus size={14} className="mr-1 inline" />Add entry</button>}>
        <Notice notice={history.action.notice?.type === "error" ? history.action.notice : null} />
        {data.history.length === 0 ? (
          <p className="text-sm text-muted">No employment history recorded yet.</p>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-line pl-5">
            {data.history.map((h) => (
              <li key={h.id} className="relative">
                <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ${h.source === "system" ? "bg-brand" : "bg-warning-strong"}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{h.event_type}</p>
                  <span className="text-xs text-muted">{formatDate(h.effective_date)}</span>
                  <span className="rounded bg-line-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">{h.source === "system" ? "Recorded by system" : "Manual entry"}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{historySummary(h) || "—"}</p>
                {h.notes && <p className="mt-1 text-xs text-muted">{h.notes}</p>}
                {manager && h.source === "manual" && (
                  <div className="mt-1 flex gap-3">
                    <button type="button" onClick={() => history.setEditing({ row: h })} className={`${linkButton} text-link`}>Edit</button>
                    <button type="button" onClick={() => history.remove(h, "history entry")} className={`${linkButton} text-danger`}>Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </Panel>
      {history.editing && (
        <SectionForm
          title={`${history.editing.row ? "Edit" : "Add"} history entry`}
          fields={HISTORY_FIELDS}
          initial={history.editing.row}
          onSubmit={history.save}
          onClose={(saved) => { history.setEditing(null); if (saved) reload(); }}
        />
      )}
      {history.dialog}
    </div>
  );
}

function DocumentsTab({ companyId, employeeId, manager, isOwn, onPhotoChanged }) {
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

function SalaryTab({ companyId, employeeId }) {
  const salary = useApi(profilePath(employeeId, "/salary", companyId));
  const payslips = useApi(withQuery("/api/payroll/payslips", { companyId, employeeId }));
  const data = salary.data;
  const b = data?.breakdown;
  const lineColumns = [
    { key: "name", label: "Component", className: "font-semibold" },
    { key: "calculation", label: "Basis", render: (l) => (l.calculation === "Percentage" ? `${l.percentage}% of ${l.percentageOf}` : "Fixed") },
    { key: "amount", label: "Monthly amount", render: (l) => formatMoney(l.amount) },
  ];

  if (salary.loading) return <Panel><p className="text-sm text-muted">Loading salary details…</p></Panel>;
  if (salary.error) return <Notice notice={{ type: "error", message: salary.error }} />;

  return (
    <div className="space-y-5">
      {!data.current ? (
        <Notice notice={{ type: "info", message: "No salary assignment is in effect today." }} />
      ) : b?.error ? (
        <Notice notice={{ type: "error", message: `The assigned salary structure cannot be calculated: ${b.error}` }} />
      ) : (
        <>
          <ProfileStats stats={[
            { label: "Annual CTC", value: formatMoney(b.annualCtc) },
            { label: "Monthly CTC", value: formatMoney(b.monthlyCtc) },
            { label: "Gross earnings", value: formatMoney(b.gross) },
            { label: "Deductions", value: formatMoney(b.totalDeductions), tone: "text-danger" },
            { label: "Net pay", value: formatMoney(b.net), tone: "text-success" },
            { label: "Employer contributions", value: formatMoney(b.employer) },
          ]} />
          <Notice notice={{ type: "info", message: `Structure "${data.current.structure_name}" effective ${formatDate(data.current.effective_from)}. Indicative monthly amounts before loss of pay, advance recovery and rounding; payslips are the record of what was paid.` }} />
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            <Panel title="Earnings" padded={false}><DataTable rows={b.earnings} rowKey={(l) => l.componentId} empty="No earnings configured." columns={lineColumns} /></Panel>
            <Panel title="Deductions" padded={false}><DataTable rows={b.deductions} rowKey={(l) => l.componentId} empty="No deductions configured." columns={lineColumns} /></Panel>
          </div>
          {b.employerContributions.length > 0 && <Panel title="Employer contributions (not deducted from pay)" padded={false}><DataTable rows={b.employerContributions} rowKey={(l) => l.componentId} columns={lineColumns} /></Panel>}
        </>
      )}
      <Panel title="Salary assignments" padded={false}>
        <DataTable
          rows={data.assignments}
          empty="No salary structure assigned."
          columns={[
            { key: "structure_name", label: "Structure", className: "font-semibold" },
            { key: "ctc_annual", label: "Annual CTC", render: (r) => formatMoney(r.ctc_annual) },
            { key: "effective_from", label: "From", render: (r) => formatDate(r.effective_from) },
            { key: "effective_to", label: "To", render: (r) => (r.effective_to ? formatDate(r.effective_to) : "Ongoing") },
            { key: "is_current", label: "", render: (r) => (r.is_current ? <StatusBadge status="Active" /> : "") },
          ]}
        />
      </Panel>
      <Panel title="Payslips" padded={false}>
        <DataTable
          loading={payslips.loading}
          error={payslips.error}
          rows={payslips.data?.payslips || []}
          empty="No payslips available."
          columns={[
            { key: "period", label: "Period", render: (p) => `${String(p.pay_period_month).padStart(2, "0")}/${p.pay_period_year}` },
            { key: "gross_pay", label: "Gross", render: (p) => formatMoney(p.gross_pay) },
            { key: "total_deductions", label: "Deductions", render: (p) => formatMoney(p.total_deductions) },
            { key: "net_salary", label: "Net", className: "font-semibold text-navy", render: (p) => formatMoney(p.net_salary) },
            { key: "run_status", label: "Run status", render: (p) => <StatusBadge status={p.run_status} /> },
          ]}
        />
      </Panel>
    </div>
  );
}

function AttendanceTab({ companyId, employeeId }) {
  const initial = monthBounds(currentMonth());
  const [range, setRange] = useState({ from: initial.from, to: initial.to });
  const valid = range.from && range.to && range.from <= range.to;
  const records = useApi(valid ? withQuery("/api/attendance/records", { companyId, employeeId, from: range.from, to: range.to, limit: 1000 }) : null);
  const s = records.data?.summary || {};

  return (
    <div className="space-y-5">
      <Panel title="Date range">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From"><input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={inputClass} /></Field>
          <Field label="To"><input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={inputClass} /></Field>
        </div>
        {!valid && <p className="mt-3 text-sm text-danger">Choose a start date on or before the end date.</p>}
      </Panel>
      <ProfileStats stats={[
        { label: "Present", value: s.Present ?? 0, tone: "text-success" },
        { label: "Late", value: s.Late ?? 0, tone: "text-warning-strong" },
        { label: "Half day", value: s["Half Day"] ?? 0, tone: "text-warning-strong" },
        { label: "Absent", value: s.Absent ?? 0, tone: "text-danger" },
        { label: "Missing punch", value: s["Missing Punch"] ?? 0, tone: "text-danger" },
        { label: "Overtime", value: formatMinutes(records.data?.overtimeMinutes ?? 0) },
      ]} />
      <Panel title="Attendance history" padded={false}>
        <DataTable
          loading={records.loading}
          error={records.error}
          rows={records.data?.records || []}
          empty="No attendance recorded in this period."
          columns={[
            { key: "attendance_date", label: "Date", render: (r) => formatDate(r.attendance_date) },
            { key: "shift_name", label: "Shift", render: (r) => r.shift_name || "—" },
            { key: "check_in_time", label: "In", render: (r) => r.check_in_time || "—" },
            { key: "check_out_time", label: "Out", render: (r) => r.check_out_time || "—" },
            { key: "working_minutes", label: "Worked", render: (r) => formatMinutes(r.working_minutes) },
            { key: "overtime_minutes", label: "Overtime", render: (r) => (r.overtime_minutes ? formatMinutes(r.overtime_minutes) : "—") },
            { key: "status", label: "Status", render: (r) => <span className="inline-flex items-center gap-2"><StatusBadge status={r.status} />{r.is_regularized && <span className="text-[10px] font-semibold uppercase text-info">Regularized</span>}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}

function LeaveTab({ companyId, employeeId }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const balances = useApi(withQuery("/api/leave/balances", { companyId, employeeId, year }));
  const requests = useApi(withQuery("/api/leave/requests", { companyId, employeeId }));
  const rows = balances.data?.balances || [];
  const total = (key) => rows.reduce((sum, r) => sum + Number(r[key] || 0), 0);
  const history = useMemo(
    () => (requests.data?.requests || []).filter((r) => r.from_date?.startsWith(String(year))).sort((a, b) => b.from_date.localeCompare(a.from_date)),
    [requests.data, year]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Leave year"><input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())} className={`${inputClass} w-32`} /></Field>
      </div>
      <ProfileStats stats={[
        { label: "Entitled (incl. carry-forward)", value: total("allocated") + total("carry_forward") },
        { label: "Used", value: total("used"), tone: "text-ink-soft" },
        { label: "Pending", value: total("pending"), tone: "text-warning-strong" },
        { label: "Available", value: total("available"), tone: "text-success" },
      ]} />
      {balances.loading ? (
        <Panel><p className="text-sm text-muted">Loading balances…</p></Panel>
      ) : balances.error ? (
        <Notice notice={{ type: "error", message: balances.error }} />
      ) : rows.length === 0 ? (
        <Notice notice={{ type: "info", message: "No active leave types configured for this year." }} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.leave_type_id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink">{r.leave_type_name}</p>
                <span className="text-[10px] font-semibold uppercase text-placeholder">{r.is_paid ? "Paid" : "Unpaid"}</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-navy">{r.available}<span className="ml-1 text-sm font-medium text-muted">available</span></p>
              <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-ink-soft">
                <dt>Allocated</dt><dd className="text-right font-semibold">{r.allocated}{r.is_default_allocation ? " (default)" : ""}</dd>
                <dt>Carried forward</dt><dd className="text-right font-semibold">{r.carry_forward}</dd>
                <dt>Used</dt><dd className="text-right font-semibold">{r.used}</dd>
                <dt>Pending</dt><dd className="text-right font-semibold">{r.pending}</dd>
              </dl>
            </div>
          ))}
        </div>
      )}
      <Panel title={`Leave history (${year})`} padded={false}>
        <DataTable
          loading={requests.loading}
          error={requests.error}
          rows={history}
          empty="No leave requests in this year."
          columns={[
            { key: "leave_type_name", label: "Leave type", className: "font-semibold" },
            { key: "from_date", label: "From", render: (r) => formatDate(r.from_date) },
            { key: "to_date", label: "To", render: (r) => formatDate(r.to_date) },
            { key: "days", label: "Days" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "reviewed_by_name", label: "Reviewed by", render: (r) => r.reviewed_by_name || "—" },
          ]}
        />
      </Panel>
    </div>
  );
}

/**
 * 360-degree employee profile. Data comes only from the authorised APIs:
 * HR managers/admins and the employee see the full profile; colleagues see
 * directory fields only (enforced by the backend).
 */
export function EmployeeProfile({ companyId, employeeId, ownEmployeeId, employees = [], onBack, onEmployeeUpdated }) {
  const [tab, setTab] = useState("Personal Info");
  const [editing, setEditing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const profile = useApi(employeeId ? profilePath(employeeId, "/profile", companyId) : null);
  const photoAction = useAction();
  const data = profile.data;
  const photoId = data?.photoDocumentId;

  useEffect(() => {
    if (!photoId) return undefined;
    let url = "";
    let cancelled = false;
    apiBlob(profilePath(employeeId, `/documents/${photoId}`, companyId))
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPhotoUrl(url);
        setPhotoError("");
      })
      .catch((error) => { if (!cancelled) setPhotoError(error.message); });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setPhotoUrl("");
    };
  }, [photoId, employeeId, companyId]);

  if (!employeeId) return <Notice notice={{ type: "info", message: "Select an employee from the directory to view their profile." }} />;
  if (profile.loading && !data) return <Panel><p className="text-sm text-muted">Loading profile…</p></Panel>;
  if (profile.error) {
    return (
      <div className="space-y-3">
        <Notice notice={{ type: "error", message: profile.error }} />
        <button type="button" onClick={profile.reload} className={secondaryButton}>Retry</button>
      </div>
    );
  }
  if (!data) return null;

  const manager = data.access === "manager";
  const self = data.access === "self";
  const isOwn = self || (Boolean(ownEmployeeId) && String(ownEmployeeId) === String(employeeId));
  const refresh = () => { profile.reload(); onEmployeeUpdated?.(); };

  async function uploadPhoto(file) {
    const body = new FormData();
    body.append("file", file);
    body.append("category", "Photo");
    body.append("title", "Profile photo");
    const result = await photoAction.run(() => apiRequest(profilePath(employeeId, "/documents", companyId), { method: "POST", body }), "Photo updated.");
    if (result) profile.reload();
  }

  return (
    <section className="space-y-5">
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center rounded-md text-sm font-semibold text-link hover:underline">
          ← Back to Employee Directory
        </button>
      )}
      <Notice notice={photoAction.notice} onClose={() => photoAction.setNotice(null)} />
      {photoError && <Notice notice={{ type: "error", message: `Profile photo could not be loaded: ${photoError}` }} />}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SummaryCard
          data={data}
          photoUrl={photoUrl}
          canUploadPhoto={manager || self}
          onPhotoSelected={uploadPhoto}
          onPhotoError={() => { setPhotoUrl(""); setPhotoError("the stored file is not a displayable image. Upload a new photo."); }}
          uploading={photoAction.busy}
        />
        <div className="min-w-0 space-y-4">
          {data.access === "directory" ? (
            <Notice notice={{ type: "info", message: "Only directory details are shown for colleagues. Personal, salary, attendance, leave and document records are visible to HR and the employee." }} />
          ) : (
            <>
              <div role="tablist" aria-label="Profile sections" className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                {TABS.map((name) => (
                  <button
                    key={name}
                    role="tab"
                    type="button"
                    aria-selected={tab === name}
                    onClick={() => setTab(name)}
                    className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${tab === name ? "bg-brand text-surface" : "border border-line bg-surface text-ink-soft hover:bg-surface-muted"}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div role="tabpanel" aria-label={tab}>
                {tab === "Personal Info" && <PersonalTab companyId={companyId} data={data} manager={manager} canSelfEdit={self} reload={profile.reload} onEdit={() => setEditing(true)} />}
                {tab === "Employment" && <EmploymentTab companyId={companyId} data={data} manager={manager} reload={profile.reload} onEdit={() => setEditing(true)} />}
                {tab === "Documents" && <DocumentsTab companyId={companyId} employeeId={employeeId} manager={manager} isOwn={isOwn} onPhotoChanged={profile.reload} />}
                {tab === "Salary" && <SalaryTab companyId={companyId} employeeId={employeeId} />}
                {tab === "Attendance" && <AttendanceTab companyId={companyId} employeeId={employeeId} />}
                {tab === "Leave" && <LeaveTab companyId={companyId} employeeId={employeeId} />}
              </div>
            </>
          )}
        </div>
      </div>
      {editing && (
        <EmploymentEditModal
          companyId={companyId}
          employee={data.employee}
          employees={employees}
          onClose={(saved) => { setEditing(false); if (saved) refresh(); }}
        />
      )}
    </section>
  );
}
