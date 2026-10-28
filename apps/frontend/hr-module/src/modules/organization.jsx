import { useState } from "react";
import { BriefcaseBusiness, Building2, Pencil, Plus, Users } from "lucide-react";
import { apiRequest } from "../api";
import { iconButton, inputClass, linkButton, primaryButton, submitButton, secondaryButton } from "./helpers";
import { toDepartmentRecord, toDesignationRecord, upsertById } from "./records";
import { DataTable, Field, FormError, Modal, PageHeader, Panel, SearchField, StatGrid, StatusBadge } from "./ui";

const emptyDepartmentForm = { name: "", description: "", status: "Active" };
const emptyDesignationForm = { title: "", departmentIds: [], description: "", status: "Active" };

function companyQuery(companyId) {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

/** onError shows the page-level banner in App ("" clears it). */
export function Departments({ companyId, canWrite, departments, setDepartments, refresh, onError }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...emptyDepartmentForm });
  const [formError, setFormError] = useState("");

  const filtered = departments.filter((department) =>
    `${department.name} ${department.description}`.toLowerCase().includes(search.toLowerCase())
  );
  const assigned = departments.reduce((sum, d) => sum + Number(d.employees || 0), 0);

  function openForm(department = null) {
    setEditing(department);
    setForm(department ? { name: department.name, description: department.description, status: department.status } : { ...emptyDepartmentForm });
    setFormError("");
    setShowForm(true);
  }

  async function saveDepartment(event) {
    event.preventDefault();
    setFormError("");

    if (!companyId) {
      setFormError("Select an active company before saving.");
      return;
    }

    const name = form.name.trim();
    if (name.length < 2) {
      setFormError("Enter a department name with at least 2 characters.");
      return;
    }

    const description = form.description.trim();
    const status = form.status || "Active";

    try {
      const result = editing
        ? await apiRequest(`/api/departments/${encodeURIComponent(editing.id)}${companyQuery(companyId)}`, {
            method: "PATCH",
            body: JSON.stringify({ departmentName: name, description, status }),
          })
        : await apiRequest("/api/departments", {
            method: "POST",
            body: JSON.stringify({ companyId, departmentName: name, description, status }),
          });

      const saved = { ...toDepartmentRecord(result.department), employees: editing?.employees || 0 };
      setDepartments((previous) => upsertById(previous, saved));
      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyDepartmentForm });
      refresh();
    } catch (error) {
      setFormError(error.message || "Unable to save department.");
    }
  }

  async function toggleStatus(department) {
    if (!companyId) return;
    const status = department.status === "Active" ? "Inactive" : "Active";
    onError("");

    try {
      const result = await apiRequest(`/api/departments/${encodeURIComponent(department.id)}${companyQuery(companyId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setDepartments((previous) =>
        previous.map((item) => (String(item.id) === String(department.id) ? { ...item, status: result.department.status } : item))
      );
    } catch (error) {
      onError(error.message || "Unable to update department status.");
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Departments" subtitle="Manage organizational departments and team structure.">
        <SearchField label="Search departments" value={search} onChange={setSearch} placeholder="Search departments..." className="w-full sm:w-60" />
        {canWrite && (
          <button type="button" onClick={() => openForm()} className={primaryButton}>
            <Plus size={16} aria-hidden="true" /> Create Department
          </button>
        )}
      </PageHeader>

      <StatGrid
        stats={[
          { label: "Total Departments", value: departments.length, icon: Building2, iconTone: "brand" },
          { label: "Active Departments", value: departments.filter((d) => d.status === "Active").length, icon: Building2, iconTone: "green" },
          { label: "Assigned Employees", value: assigned, icon: Users, iconTone: "brand", note: "Employees linked to a department" },
          { label: "Average Team Size", value: departments.length ? Math.round(assigned / departments.length) : 0, icon: Users, iconTone: "slate", note: "Assigned employees per department" },
        ]}
      />

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((department) => (
            <article key={department.id} className="flex flex-col rounded-lg border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand" aria-hidden="true"><Building2 size={17} /></span>
                  <h4 className="truncate text-[15px] font-semibold text-ink">{department.name}</h4>
                </div>
                <StatusBadge status={department.status} />
              </div>
              <p className="mt-3 min-h-12 flex-1 text-[13px] leading-6 text-ink-soft">{department.description || "No department description provided."}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div>
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Users size={15} className="text-muted" aria-hidden="true" />
                    {department.employees} {Number(department.employees) === 1 ? "Employee" : "Employees"}
                  </p>
                  {department.created && <p className="mt-1 text-xs text-muted">Created: {department.created}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setSelected(department)} className={secondaryButton}>View Details</button>
                  {canWrite && (
                    <>
                      <button type="button" onClick={() => openForm(department)} aria-label={`Edit ${department.name}`} title="Edit department" className={iconButton}><Pencil size={15} /></button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(department)}
                        className={`rounded-md px-3 py-2 text-[13px] font-semibold ${department.status === "Active" ? "text-danger hover:bg-danger-soft" : "text-success hover:bg-success-muted"}`}
                      >
                        {department.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-surface p-10 text-center">
          <p className="font-semibold text-ink">{departments.length ? "No departments match your search." : "No departments yet."}</p>
          {!departments.length && canWrite && <p className="mt-1 text-[13px] text-muted">Create a department to start organising employees.</p>}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Edit Department" : "Create New Department"} onClose={() => setShowForm(false)}>
          <form onSubmit={saveDepartment} className="space-y-4">
            <Field label="Department Name" required>
              <input required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Quality Assurance" className={inputClass} />
            </Field>
            <Field label="Description">
              <textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Brief description of department responsibilities..." className={inputClass} />
            </Field>
            <Field label="Status" className="sm:w-48">
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={inputClass}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
            <FormError message={formError} />
            <div className="flex justify-end gap-3 border-t border-line pt-4">
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" className={submitButton}>{editing ? "Save Changes" : "Create Department"}</button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal title="Department Details" onClose={() => setSelected(null)}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-muted">Name</dt><dd className="font-semibold text-ink">{selected.name}</dd>
            <dt className="text-muted">Employees</dt><dd className="font-semibold text-ink">{selected.employees}</dd>
            <dt className="text-muted">Created</dt><dd className="font-semibold text-ink">{selected.created || "—"}</dd>
            <dt className="text-muted">Status</dt><dd><StatusBadge status={selected.status} /></dd>
            <dt className="text-muted">Description</dt><dd className="text-ink-soft">{selected.description || "No description provided."}</dd>
          </dl>
          <div className="mt-5 flex justify-end border-t border-line pt-4">
            <button type="button" onClick={() => setSelected(null)} className={primaryButton}>Close</button>
          </div>
        </Modal>
      )}
    </section>
  );
}

/** onError shows the page-level banner in App ("" clears it). */
export function Designations({ companyId, canWrite, designations, setDesignations, departments, refresh, onError }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyDesignationForm });
  const [formError, setFormError] = useState("");

  const filtered = designations.filter((designation) =>
    `${designation.title} ${designation.description} ${designation.departments.map((d) => d.name).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const departmentOptions = departments.filter(
    (department) => department.status === "Active" || form.departmentIds.includes(department.id)
  );

  function openForm(designation = null) {
    setEditing(designation);
    setForm(
      designation
        ? { title: designation.title, departmentIds: designation.departments.map((d) => d.id), description: designation.description, status: designation.status }
        : { ...emptyDesignationForm }
    );
    setFormError("");
    setShowForm(true);
  }

  async function saveDesignation(event) {
    event.preventDefault();
    setFormError("");

    const title = form.title.trim();
    if (!title || !companyId) {
      setFormError("Enter a designation and select an active company.");
      return;
    }

    const fields = {
      designationName: title,
      description: form.description.trim(),
      status: form.status || "Active",
      departmentIds: form.departmentIds,
    };

    try {
      const result = editing
        ? await apiRequest(`/api/designations/${encodeURIComponent(editing.id)}${companyQuery(companyId)}`, {
            method: "PATCH",
            body: JSON.stringify(fields),
          })
        : await apiRequest("/api/designations", { method: "POST", body: JSON.stringify({ companyId, ...fields }) });

      setDesignations((previous) => upsertById(previous, toDesignationRecord(result.designation)));
      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyDesignationForm });
      refresh();
    } catch (error) {
      setFormError(error.message || "Unable to save designation.");
    }
  }

  async function toggleStatus(designation) {
    if (!companyId) return;
    const status = designation.status === "Active" ? "Inactive" : "Active";
    onError("");

    try {
      const result = await apiRequest(`/api/designations/${encodeURIComponent(designation.id)}${companyQuery(companyId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setDesignations((previous) =>
        previous.map((record) => (String(record.id) === String(designation.id) ? { ...record, status: result.designation.status } : record))
      );
    } catch (error) {
      onError(error.message || "Unable to update designation status.");
    }
  }

  const columns = [
    {
      key: "title",
      label: "Designation",
      wrap: true,
      render: (item) => (
        <>
          <p className="font-semibold text-ink">{item.title}</p>
          <p className="mt-1 max-w-xs text-xs text-muted">{item.description || "No description provided."}</p>
        </>
      ),
    },
    {
      key: "departments",
      label: "Departments",
      wrap: true,
      render: (item) => (item.departments.length ? item.departments.map((d) => d.name).join(", ") : <span className="text-placeholder">Not linked</span>),
    },
    { key: "status", label: "Status", render: (item) => <StatusBadge status={item.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (item) =>
        canWrite ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openForm(item)} title="Edit designation" aria-label={`Edit ${item.title}`} className={iconButton}><Pencil size={14} /></button>
            <button type="button" onClick={() => toggleStatus(item)} className={`${linkButton} px-1 ${item.status === "Active" ? "text-danger" : "text-success"}`}>
              {item.status === "Active" ? "Deactivate" : "Activate"}
            </button>
          </div>
        ) : (
          <span className="text-xs text-placeholder">View only</span>
        ),
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader title="Designations" subtitle="Create and manage job titles and the departments they belong to.">
        {canWrite && (
          <button type="button" onClick={() => openForm()} className={primaryButton}>
            <Plus size={16} aria-hidden="true" /> Add Designation
          </button>
        )}
      </PageHeader>

      <StatGrid
        stats={[
          { label: "Total Designations", value: designations.length, icon: BriefcaseBusiness, iconTone: "brand" },
          { label: "Active", value: designations.filter((item) => item.status === "Active").length, icon: BriefcaseBusiness, iconTone: "green", tone: "text-success" },
          { label: "Inactive", value: designations.filter((item) => item.status === "Inactive").length, icon: BriefcaseBusiness, iconTone: "slate" },
        ]}
      />

      <Panel
        title="Designation Records"
        padded={false}
        actions={<SearchField label="Search designations" value={search} onChange={setSearch} placeholder="Search designations..." className="w-full sm:w-60" />}
      >
        <DataTable
          columns={columns}
          rows={filtered}
          empty={
            <>
              <span className="block font-semibold text-ink-soft">No designations found</span>
              <span className="mt-1 block">Add a designation to get started. No sample records have been added.</span>
            </>
          }
        />
      </Panel>

      {showForm && (
        <Modal title={editing ? "Edit Designation" : "Create New Designation"} onClose={() => setShowForm(false)}>
          <form onSubmit={saveDesignation} className="space-y-5">
            <Field label="Designation Title" required>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter designation title..." className={inputClass} />
            </Field>

            <fieldset>
              <legend className="text-xs font-semibold text-ink-soft">Assign to Departments</legend>
              <div className="mt-1.5 max-h-56 space-y-3 overflow-y-auto rounded-md border border-field-line bg-field p-4">
                {departmentOptions.length === 0 && <p className="text-[13px] text-muted">No departments yet. Create departments first to link them.</p>}
                {departmentOptions.map((department) => (
                  <label key={department.id} className="flex cursor-pointer items-center gap-3 text-[13px] text-ink">
                    <input
                      type="checkbox"
                      checked={form.departmentIds.includes(department.id)}
                      onChange={(e) => {
                        const departmentIds = e.target.checked
                          ? [...form.departmentIds, department.id]
                          : form.departmentIds.filter((id) => id !== department.id);
                        setForm({ ...form, departmentIds });
                      }}
                      className="size-4 accent-brand"
                    />
                    {department.name}
                    {department.status !== "Active" && <span className="text-xs text-placeholder">(inactive)</span>}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">Optional: link the departments that use this designation.</p>
            </fieldset>

            <Field label="Description">
              <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Provide role details and main responsibilities..." className={`${inputClass} resize-y`} />
            </Field>

            <label className="flex items-center justify-between gap-4 rounded-md border border-line px-4 py-3">
              <span>
                <span className="block text-[13px] font-semibold text-ink">Status</span>
                <span className="text-xs text-muted">{form.status === "Active" ? "Active" : "Inactive"} · toggle the designation state</span>
              </span>
              <input
                type="checkbox"
                checked={form.status === "Active"}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? "Active" : "Inactive" })}
                className="size-5 cursor-pointer accent-success"
              />
            </label>

            <FormError message={formError} />
            <div className="flex justify-end gap-3 border-t border-line pt-4">
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" className={submitButton}>{editing ? "Save Changes" : "Create Designation"}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
