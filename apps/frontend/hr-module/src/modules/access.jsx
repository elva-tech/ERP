import { useState } from "react";
import { Copy, Link2, MailPlus } from "lucide-react";
import { apiRequest, sendJson, withQuery } from "../api";
import {
  ROLE_LABELS,
  employeesInDepartment,
  formatDate,
  inputClass,
  isAdmin,
  linkButton,
  submitButton,
  secondaryButton,
  useAction,
  useApi,
} from "./helpers";
import { DataTable, DepartmentSelect, Field, Notice, PageHeader, Panel, StatGrid, StatusBadge } from "./ui";
import { useConfirm } from "./useConfirm";

const STATE_LABELS = { pending: "Pending", accepted: "Accepted", expired: "Expired", revoked: "Revoked" };
const emptyInvite = { email: "", role: "employee", employeeId: "" };

/**
 * Company access management: invite new hires by one-time link, change roles
 * and suspend or reactivate access in this company. The server enforces every
 * rule shown here (role limits, no self-changes, last active admin).
 */
export function UsersAccess({ companyId, role, employees = [], departments = [], currentUserId }) {
  const admin = isAdmin(role);
  const members = useApi(withQuery("/api/members", { companyId, includeSuspended: 1 }));
  const invitations = useApi(withQuery("/api/invitations", { companyId }));
  const [form, setForm] = useState(emptyInvite);
  const [department, setDepartment] = useState("");
  const [issued, setIssued] = useState(null);
  const [copied, setCopied] = useState(false);
  const action = useAction();
  const confirm = useConfirm();

  const memberRows = members.data?.members || [];
  const invitationRows = invitations.data?.invitations || [];
  const grantableRoles = admin ? ["employee", "hr_manager", "company_admin"] : ["employee"];
  const assignableRoles = ["hr_manager", "company_admin"];
  const openInviteEmployeeIds = new Set(
    invitationRows.filter((i) => i.state === "pending" && i.employee_id).map((i) => i.employee_id)
  );
  const linkableEmployees = employeesInDepartment(employees, department).filter(
    (e) => e.status === "Active" && !e.userId && (!openInviteEmployeeIds.has(String(e.id)) || String(e.id) === form.employeeId)
  );
  const isSelf = (m) => String(m.user_id) === String(currentUserId);
  const canChangeStatus = (m) => !isSelf(m) && (admin || m.role === "employee");
  const canRevoke = (i) => i.state === "pending" || i.state === "expired" ? admin || i.role === "employee" : false;

  function chooseEmployee(employeeId) {
    const employee = employees.find((e) => String(e.id) === employeeId);
    setForm((current) => ({ ...current, employeeId, email: employee?.email || current.email }));
  }

  async function invite(event) {
    event.preventDefault();
    setIssued(null);
    setCopied(false);
    const result = await action.run(() =>
      sendJson("POST", withQuery("/api/invitations", { companyId }), {
        email: form.email.trim(),
        role: form.role,
        employeeId: form.employeeId || undefined,
      })
    );
    if (!result) return;
    setIssued({
      link: `${window.location.origin}${window.location.pathname}#invite=${result.token}`,
      email: result.invitation.email,
      expiresAt: result.invitation.expires_at,
    });
    setForm(emptyInvite);
    invitations.reload();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(issued.link);
      setCopied(true);
    } catch {
      action.setNotice({ type: "error", message: "Copy failed. Select the link and copy it manually." });
    }
  }

  async function revoke(row) {
    const ok = await confirm.ask({
      title: "Revoke invitation",
      message: `Revoke the invitation for ${row.email}? The link stops working immediately.`,
      confirmLabel: "Revoke",
      danger: true,
    });
    if (!ok) return;
    const result = await action.run(() =>
      apiRequest(withQuery(`/api/invitations/${row.id}`, { companyId }), { method: "DELETE" })
    );
    if (result) invitations.reload();
  }

  async function changeMember(member, change, prompt) {
    const ok = await confirm.ask(prompt);
    if (!ok) return;
    const result = await action.run(() =>
      sendJson("PATCH", withQuery(`/api/members/${member.user_id}`, { companyId }), change)
    );
    if (result) members.reload();
  }

  const suspend = (m) =>
    changeMember(m, { status: "suspended" }, {
      title: "Suspend access",
      message: `Suspend ${m.full_name}'s access to this company? They are signed out of this company immediately; their access to any other company is not affected.`,
      confirmLabel: "Suspend",
      danger: true,
    });
  const reactivate = (m) =>
    changeMember(m, { status: "active" }, {
      title: "Reactivate access",
      message: `Restore ${m.full_name}'s access to this company as ${ROLE_LABELS[m.role] || m.role}?`,
      confirmLabel: "Reactivate",
    });
  const changeRole = (m, nextRole) =>
    changeMember(m, { role: nextRole }, {
      title: "Change role",
      message: `Change ${m.full_name} from ${ROLE_LABELS[m.role]} to ${ROLE_LABELS[nextRole]}?`,
      confirmLabel: "Change role",
    });

  const activeCount = memberRows.filter((m) => m.membership_status === "active").length;
  const suspendedCount = memberRows.length - activeCount;
  const pendingInvites = invitationRows.filter((i) => i.state === "pending").length;

  return (
    <section className="space-y-5">
      <PageHeader title="Users & Access" subtitle="Invite new hires and manage who can sign in to this company" />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      <StatGrid
        stats={[
          { label: "Active members", value: members.data ? activeCount : "…" },
          { label: "Suspended", value: members.data ? suspendedCount : "…", tone: "text-warning-strong" },
          { label: "Pending invitations", value: invitations.data ? pendingInvites : "…" },
        ]}
      />

      <Panel
        title="Invite a new member"
        subtitle={
          admin
            ? "The invitee receives a one-time link, chooses their own password and joins this company only."
            : "HR managers can invite employees. The invitee chooses their own password and joins this company only."
        }
      >
        <form onSubmit={invite} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1.2fr_0.8fr_auto] xl:items-end">
          <Field label="Department">
            <DepartmentSelect
              departments={departments}
              value={department}
              onChange={(next) => {
                setDepartment(next);
                if (!employeesInDepartment(employees, next).some((e) => String(e.id) === form.employeeId)) setForm((current) => ({ ...current, employeeId: "" }));
              }}
            />
          </Field>
          <Field label="Employee record (optional)">
            <select value={form.employeeId} onChange={(e) => chooseEmployee(e.target.value)} className={inputClass}>
              <option value="">{linkableEmployees.length ? "No linked record" : "No linked record (no eligible employees)"}</option>
              {linkableEmployees.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.name} ({e.employeeCode})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              required
              maxLength={255}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Role" required>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
              {grantableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" disabled={action.busy} className={submitButton}>
            <MailPlus size={16} aria-hidden="true" /> Create link
          </button>
        </form>

        {issued && (
          <div className="mt-5 rounded-xl border border-brand/30 bg-brand-soft p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy">
              <Link2 size={16} aria-hidden="true" /> Invitation link for {issued.email}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              This link is shown only once. Share it with the invitee directly; it works once and expires on{" "}
              {formatDate(issued.expiresAt)}. Creating a new invitation for the same person replaces it.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={issued.link} onFocus={(e) => e.target.select()} className={`${inputClass} font-mono text-xs`} aria-label="Invitation link" />
              <button type="button" onClick={copyLink} className={secondaryButton}>
                <Copy size={16} aria-hidden="true" /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Members" subtitle="Suspending access affects this company only. The last active company admin cannot be removed." padded={false}>
        <DataTable
          loading={members.loading}
          error={members.error}
          rows={memberRows}
          rowKey={(m) => m.user_id}
          empty="No members yet."
          columns={[
            {
              key: "full_name",
              label: "Member",
              render: (m) => (
                <div>
                  <p className="font-semibold">
                    {m.full_name} {isSelf(m) && <span className="text-xs font-normal text-muted">(you)</span>}
                  </p>
                  <p className="text-xs text-muted">{m.email}</p>
                </div>
              ),
            },
            {
              key: "role",
              label: "Role",
              render: (m) =>
                admin && !isSelf(m) ? (
                  <select
                    aria-label={`Role for ${m.full_name}`}
                    value={m.role}
                    disabled={action.busy}
                    onChange={(e) => changeRole(m, e.target.value)}
                    className={`${inputClass} w-40 py-1.5`}
                  >
                    {!assignableRoles.includes(m.role) && (
                      <option value={m.role} disabled>
                        {ROLE_LABELS[m.role] || m.role}
                      </option>
                    )}
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  ROLE_LABELS[m.role] || m.role
                ),
            },
            {
              key: "employee",
              label: "Employee record",
              render: (m) =>
                m.employee_id ? (
                  <div>
                    <p>{m.employee_name}</p>
                    <p className="text-xs text-muted">
                      {m.employee_code} · {m.employee_status}
                    </p>
                  </div>
                ) : (
                  <span className="text-placeholder">Not linked</span>
                ),
            },
            {
              key: "status",
              label: "Access",
              render: (m) => <StatusBadge status={m.membership_status === "active" ? "Active" : "Suspended"} />,
            },
            {
              key: "actions",
              label: "",
              render: (m) =>
                canChangeStatus(m) &&
                (m.membership_status === "active" ? (
                  <button type="button" disabled={action.busy} onClick={() => suspend(m)} className={`${linkButton} text-danger`}>
                    Suspend
                  </button>
                ) : m.employee_id && m.employee_status !== "Active" ? (
                  <span className="text-xs text-muted">Activate the employee record to restore access</span>
                ) : (
                  <button type="button" disabled={action.busy} onClick={() => reactivate(m)} className={`${linkButton} text-success`}>
                    Reactivate
                  </button>
                )),
            },
          ]}
        />
      </Panel>

      <Panel title="Invitations" subtitle="The 100 most recent invitations. Links are never shown again after creation." padded={false}>
        <DataTable
          loading={invitations.loading}
          error={invitations.error}
          rows={invitationRows}
          empty="No invitations yet."
          columns={[
            { key: "email", label: "Email" },
            { key: "role", label: "Role", render: (i) => ROLE_LABELS[i.role] || i.role },
            { key: "employee_name", label: "Employee record", render: (i) => i.employee_name || <span className="text-placeholder">—</span> },
            {
              key: "created_at",
              label: "Invited",
              render: (i) => (
                <div>
                  <p>{formatDate(i.created_at)}</p>
                  <p className="text-xs text-muted">{i.invited_by_name}</p>
                </div>
              ),
            },
            { key: "expires_at", label: "Expires", render: (i) => formatDate(i.expires_at) },
            { key: "state", label: "Status", render: (i) => <StatusBadge status={STATE_LABELS[i.state] || i.state} /> },
            {
              key: "actions",
              label: "",
              render: (i) =>
                canRevoke(i) && (
                  <button type="button" disabled={action.busy} onClick={() => revoke(i)} className={`${linkButton} text-danger`}>
                    Revoke
                  </button>
                ),
            },
          ]}
        />
      </Panel>
      {confirm.dialog}
    </section>
  );
}
