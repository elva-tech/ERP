import { useState } from "react";
import { ChevronDown, CircleUserRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { apiRequest } from "../api";
import { ROLE_LABELS, inputClass, primaryButton, submitButton, secondaryButton } from "./helpers";
import { toEmployeeRecord, upsertById } from "./records";
import { Avatar, DataTable, EmployeeSelect, Field, FormError, Modal, PageHeader, Panel, SearchField, StatusBadge } from "./ui";
import { useConfirm } from "./useConfirm";

const rowIconButton = "inline-flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-line-soft";

/** Toolbar dropdown rendered as a "Label: value" pill. */
function FilterPill({ label, value, onChange, children }) {
  return (
    <label className="relative inline-flex h-9 items-center rounded-md border border-line bg-surface-muted pl-3 text-[13px] text-ink-soft focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft">
      <span className="font-medium">{label}:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Filter by ${label.toLowerCase()}`}
        className="h-full cursor-pointer appearance-none bg-transparent pl-1.5 pr-8 font-semibold text-ink outline-none"
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-muted" aria-hidden="true" />
    </label>
  );
}

const emptyEmployeeForm = {
  employeeCode: "",
  name: "",
  department: "",
  designation: "",
  email: "",
  phone: "",
  userId: "",
  dateOfJoining: "",
  employmentType: "",
  workLocation: "",
  reportingManagerId: "",
};

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Consultant"];

/**
 * Employee records live in App so the shell search and other pages share them.
 * onError/onSuccess show the page-level banners in App ("" clears them).
 */
export function EmployeeDirectory({ companyId, canWrite, employees, setEmployees, departments, designations, members, refresh, onOpenProfile, onError, onSuccess }) {
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyEmployeeForm);
  const [formError, setFormError] = useState("");

  const [statusFilter, setStatusFilter] = useState("Active");

  const query = search.toLowerCase();
  const filtered = employees.filter((employee) => {
    const matchesSearch = `${employee.employeeCode} ${employee.name} ${employee.email} ${employee.phone} ${employee.department} ${employee.designation}`
      .toLowerCase()
      .includes(query);
    return (
      matchesSearch &&
      (departmentFilter === "All" || employee.department === departmentFilter) &&
      (statusFilter === "All" || employee.status === statusFilter)
    );
  });
  const scopeLabel = departmentFilter === "All" ? "" : departmentFilter;

  const departmentNames = departments.map((department) => department.name);
  const activeDepartmentNames = departments
    .filter((department) => department.status === "Active" || department.name === form.department)
    .map((department) => department.name);
  const activeDesignationTitles = designations
    .filter((designation) => designation.status === "Active" || designation.title === form.designation)
    .map((designation) => designation.title);
  const linkableMembers = members.filter(
    (member) => !member.employee_id || (editing && String(member.employee_id) === String(editing.id))
  );
  const reportingManagerOptions = employees.filter(
    (employee) =>
      String(employee.id) !== String(editing?.id) &&
      (employee.status === "Active" || String(employee.id) === form.reportingManagerId)
  );

  function set(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  function openForm(employee = null) {
    setEditing(employee);
    setForm(
      employee
        ? {
            employeeCode: employee.employeeCode,
            name: employee.name,
            department: employee.department,
            designation: employee.designation,
            email: employee.email,
            phone: employee.phone,
            userId: employee.userId || "",
            dateOfJoining: employee.dateOfJoining || "",
            employmentType: employee.employmentType || "",
            workLocation: employee.workLocation || "",
            reportingManagerId: employee.reportingManagerId || "",
          }
        : { ...emptyEmployeeForm }
    );
    setFormError("");
    setShowForm(true);
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setFormError("");

    if (!companyId) {
      setFormError("Select an active company before saving.");
      return;
    }

    const payload = {
      companyId,
      name: form.name.trim(),
      department: form.department.trim(),
      designation: form.designation.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      status: editing?.status || "Active",
      userId: form.userId || null,
      dateOfJoining: form.dateOfJoining || null,
      employmentType: form.employmentType || null,
      workLocation: form.workLocation.trim() || null,
      reportingManagerId: form.reportingManagerId || null,
    };

    if (!payload.name || !payload.department || !payload.designation || !payload.email) {
      setFormError("Complete all required employee fields.");
      return;
    }

    try {
      const result = editing
        ? await apiRequest(`/api/employees/${encodeURIComponent(editing.id)}?companyId=${encodeURIComponent(companyId)}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiRequest("/api/employees", { method: "POST", body: JSON.stringify(payload) });

      setEmployees((previous) => upsertById(previous, toEmployeeRecord(result.employee)));
      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyEmployeeForm });
      refresh();
    } catch (error) {
      setFormError(error.message || "Unable to save employee.");
    }
  }

  async function toggleStatus(employee) {
    if (!companyId) return;

    const status = employee.status === "Active" ? "Inactive" : "Active";
    onError("");
    onSuccess("");

    if (status === "Inactive") {
      const ok = await confirm.ask({
        title: "Deactivate employee",
        message: employee.userId
          ? `${employee.name} has a login for this company. Deactivating the record also suspends that access here (other companies are not affected). Reactivating the record later does not restore access; use Users & Access for that.`
          : `Deactivate ${employee.name}? The record is kept and can be reactivated later.`,
        confirmLabel: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }

    try {
      const result = await apiRequest(`/api/employees/${encodeURIComponent(employee.id)}?companyId=${encodeURIComponent(companyId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setEmployees((previous) =>
        previous.map((item) => (String(item.id) === String(employee.id) ? { ...item, status: result.employee.status } : item))
      );
      if (result.accessSuspended) onSuccess(result.message);
      refresh();
    } catch (error) {
      onError(error.message || "Unable to update employee status.");
    }
  }

  const columns = [
    { key: "employeeCode", label: "Emp ID", className: "font-semibold text-ink", render: (employee) => employee.employeeCode || "—" },
    {
      key: "name",
      label: "Name",
      render: (employee) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={employee.name} size="sm" />
          <span className="font-medium text-ink">{employee.name}</span>
        </div>
      ),
    },
    { key: "department", label: "Department", className: "text-ink-soft", render: (employee) => employee.department || "—" },
    { key: "designation", label: "Designation", className: "text-ink-soft", render: (employee) => employee.designation || "—" },
    { key: "email", label: "Email", className: "text-ink-soft", render: (employee) => employee.email || "—" },
    { key: "phone", label: "Phone", className: "text-ink-soft", render: (employee) => employee.phone || "—" },
    { key: "status", label: "Status", render: (employee) => <StatusBadge status={employee.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (employee) => {
        const active = employee.status === "Active";
        const StatusIcon = active ? UserX : UserCheck;
        return (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenProfile(employee)}
              aria-label={`View ${employee.name} profile`}
              className="inline-flex h-7 items-center rounded-md bg-navy px-3 text-xs font-semibold text-surface transition-colors hover:bg-sidebar"
            >
              View
            </button>
            {canWrite && (
              <>
                <button type="button" onClick={() => openForm(employee)} title="Edit employee" aria-label={`Edit ${employee.name}`} className={rowIconButton}>
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(employee)}
                  title={active ? "Deactivate employee" : "Activate employee"}
                  aria-label={`${active ? "Deactivate" : "Activate"} ${employee.name}`}
                  className={`${rowIconButton} ${active ? "text-danger hover:bg-danger-soft" : "text-success hover:bg-success-muted"}`}
                >
                  <StatusIcon size={15} />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        title={scopeLabel ? `${scopeLabel} - Employee Directory` : "Employee Directory"}
        subtitle={scopeLabel ? `Manage and explore ${scopeLabel} department employees` : "Manage and explore company employees"}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill label="Dept" value={departmentFilter} onChange={setDepartmentFilter}>
            <option value="All">All</option>
            {departmentNames.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </FilterPill>
          <FilterPill label="Status" value={statusFilter} onChange={setStatusFilter}>
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </FilterPill>
          <SearchField label="Search employees" value={search} onChange={setSearch} placeholder="Search name, ID, email…" className="w-full sm:w-60" />
        </div>
        {canWrite && (
          <button type="button" onClick={() => openForm()} className={primaryButton}>
            <Plus size={16} aria-hidden="true" />
            Add Employee
          </button>
        )}
      </div>

      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={filtered}
          empty={employees.length ? "No employees match these filters." : "No employee records yet."}
        />
        {filtered.length > 0 && (
          <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
            Showing {filtered.length} of {employees.length} employees
          </p>
        )}
      </Panel>

      {showForm && (
        <Modal title={editing ? "Edit Employee" : "Add Employee"} onClose={() => setShowForm(false)}>
          <form onSubmit={saveEmployee} className="space-y-4">
            {editing ? (
              <Field label="Employee Code">
                <input disabled value={form.employeeCode || "—"} aria-describedby="employee-code-help" className={inputClass} />
                <p id="employee-code-help" className="mt-1.5 text-xs text-muted">Employee codes are assigned once and cannot be changed here.</p>
              </Field>
            ) : (
              <p className="rounded-md border border-info/30 bg-info-soft px-3 py-2 text-xs font-medium text-info">
                Employee code will be generated automatically.
              </p>
            )}
            <Field label="Full Name" required>
              <input required value={form.name} onChange={set("name")} placeholder="Enter full name" className={inputClass} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Department" required>
                <select required value={form.department} onChange={set("department")} className={inputClass}>
                  <option value="">Select Department</option>
                  {activeDepartmentNames.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </Field>
              <Field label="Designation" required>
                <select required value={form.designation} onChange={set("designation")} className={inputClass}>
                  <option value="">Select Designation</option>
                  {activeDesignationTitles.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Email Address" required>
              <input type="email" required value={form.email} onChange={set("email")} placeholder="name@company.com" className={inputClass} />
            </Field>
            <Field label="Phone Number" required>
              <input type="tel" required pattern="[0-9+() -]{7,20}" value={form.phone} onChange={set("phone")} placeholder="Enter phone number" className={inputClass} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date of Joining">
                <input type="date" value={form.dateOfJoining} onChange={set("dateOfJoining")} className={inputClass} />
              </Field>
              <Field label="Employment Type">
                <select value={form.employmentType} onChange={set("employmentType")} className={inputClass}>
                  <option value="">Not specified</option>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </Field>
              <Field label="Work Location">
                <input maxLength={200} value={form.workLocation} onChange={set("workLocation")} placeholder="Office or site" className={inputClass} />
              </Field>
              <Field label="Reporting Manager">
                <select value={form.reportingManagerId} onChange={set("reportingManagerId")} className={inputClass}>
                  <option value="">None</option>
                  {reportingManagerOptions.map((manager) => (
                    <option key={manager.id} value={manager.id}>{manager.name} ({manager.employeeCode})</option>
                  ))}
                </select>
              </Field>
            </div>

            <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted">
              Documents, photo, addresses, emergency contacts and bank details are managed from the employee's profile after saving.
            </p>

            <div>
              <Field label="Linked Login">
                <select aria-describedby="employee-login-help" value={form.userId} onChange={set("userId")} className={inputClass}>
                  <option value="">Not linked</option>
                  {linkableMembers.map((member) => (
                    <option key={member.user_id} value={String(member.user_id)}>
                      {member.full_name} ({member.email}) · {ROLE_LABELS[member.role] || member.role}
                    </option>
                  ))}
                </select>
              </Field>
              <p id="employee-login-help" className="mt-2 text-xs text-muted">
                The login that may see this employee's own attendance, leave and payslips. Choose it deliberately; matching emails are not linked automatically.
              </p>
            </div>

            <FormError message={formError} />

            <div className="flex justify-end gap-3 border-t border-line pt-4">
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" className={submitButton}>{editing ? "Save Changes" : "Add Employee"}</button>
            </div>
          </form>
        </Modal>
      )}
      {confirm.dialog}
    </section>
  );
}

/** "Employee Profile" without a selected employee: pick one to open. */
export function EmployeeProfilePicker({ employees, ownEmployeeId, onOpenProfile, onOpenOwnProfile }) {
  return (
    <section className="space-y-6">
      <PageHeader title="Employee Profile" subtitle="Choose an employee to open their 360° profile. What you can see depends on your role." />
      <Panel title="Select employee">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Employee" className="flex-1">
            <EmployeeSelect
              employees={employees}
              activeOnly={false}
              value=""
              onChange={(id) => {
                const employee = employees.find((e) => String(e.id) === String(id));
                if (employee) onOpenProfile(employee);
              }}
            />
          </Field>
          {ownEmployeeId && (
            <button type="button" onClick={onOpenOwnProfile} className={secondaryButton}>
              <CircleUserRound size={16} aria-hidden="true" /> Open my profile
            </button>
          )}
        </div>
        {employees.length === 0 && <p className="mt-4 text-[13px] text-muted">No employee records are available yet.</p>}
      </Panel>
    </section>
  );
}
