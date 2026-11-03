import { Pencil, Plus } from "lucide-react";
import { formatDate, linkButton, secondaryButton } from "../../helpers";
import { DataTable, Notice, Panel, StatusBadge } from "../../ui";
import { ADDRESS_FIELDS, BANK_FIELDS, CONTACT_FIELDS } from "../constants";
import { DetailGrid, SectionForm } from "../shared";
import { useSectionEditor } from "../useSectionEditor";
export function PersonalTab({ companyId, data, manager, canSelfEdit, reload, onEdit }) {
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
            { key: "alternate_phone", label: "Alternate", render: (r) => r.alternate_phone || "â€”" },
            { key: "email", label: "Email", render: (r) => r.email || "â€”" },
            { key: "is_primary", label: "Primary", render: (r) => (r.is_primary ? <StatusBadge status="Primary" /> : "â€”") },
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
            { key: "branch", label: "Branch", render: (r) => r.branch || "â€”" },
            { key: "account_type", label: "Type", render: (r) => r.account_type || "â€”" },
            { key: "is_primary", label: "Primary", render: (r) => (r.is_primary ? <StatusBadge status="Primary" /> : "â€”") },
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
