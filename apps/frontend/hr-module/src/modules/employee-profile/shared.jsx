import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { sendJson } from "../../api";
import {
  formatDate,
  inputClass,
  secondaryButton,
  submitButton,
  useAction,
} from "../helpers";
import { Field, Modal, Notice, StatusBadge } from "../ui";
import { GENDERS, EMPLOYMENT_TYPES } from "./constants";
import { initials, profilePath } from "./utils";
export function ProfileStats({ stats }) {
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

export function DetailGrid({ items }) {
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
export function SectionForm({ title, fields, initial, onSubmit, onClose }) {
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
          <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Savingâ€¦" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Rows of one section with add/edit/delete, using the section API. */
export function SummaryCard({ data, photoUrl, canUploadPhoto, onPhotoSelected, onPhotoError, uploading }) {
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
            <dd className="min-w-0 break-words text-right font-medium text-ink">{value || <span className="font-normal text-placeholder">â€”</span>}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function EmploymentEditModal({ companyId, employee, employees, onClose }) {
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
          <button type="submit" disabled={action.busy} className={submitButton}>{action.busy ? "Savingâ€¦" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
