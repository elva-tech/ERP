import { Pencil, Plus } from "lucide-react";
import { formatDate, linkButton, secondaryButton } from "../../helpers";
import { DataTable, Notice, Panel, StatusBadge } from "../../ui";
import { HISTORY_FIELDS } from "../constants";
import { historySummary } from "../utils";
import { DetailGrid, SectionForm } from "../shared";
import { useSectionEditor } from "../useSectionEditor";
export function EmploymentTab({ companyId, data, manager, reload, onEdit }) {
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
          ["Reporting manager", data.reportingManager ? `${data.reportingManager.name} Â· ${data.reportingManager.designation}` : null],
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
                <p className="mt-1 text-sm text-ink-soft">{historySummary(h) || "â€”"}</p>
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
