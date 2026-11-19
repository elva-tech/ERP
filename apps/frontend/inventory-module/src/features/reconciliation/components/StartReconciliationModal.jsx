import React, { useState } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import SelectInput from "../../../components/ui/SelectInput.jsx";
import { INPUT_CLASS, TEXTAREA_CLASS } from "../../../components/ui/formStyles.js";
import { X } from "lucide-react";

const ASSIGNED_TEAMS = [
  "Team Alpha (Store Keepers)",
  "Team Beta (Audit Crew)",
  "Internal Audit Dept",
  "Mr. Suresh Patil",
];

export default function StartReconciliationModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  warehouses = [],
  items = [],
}) {
  const [formData, setFormData] = useState({
    warehouseId: warehouses[0]?.id || "",
    reconciliationDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    scope: "Selected Items",
    selectedItemIds: items.slice(0, 2).map((i) => i.id),
    remarks: "",
    assignedTo: ASSIGNED_TEAMS[0],
  });

  const handleToggleItem = (itemId) => {
    setFormData((prev) => {
      const exists = prev.selectedItemIds.includes(itemId);
      return {
        ...prev,
        selectedItemIds: exists
          ? prev.selectedItemIds.filter((id) => id !== itemId)
          : [...prev.selectedItemIds, itemId],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      title="Start Reconciliation"
      description="Initiate a physical stock count and variance review"
      width="xl"
    >
      <ModalForm onSubmit={handleSubmit} onCancel={onClose} submitLabel="Start Reconciliation" isSubmitting={isSubmitting}>
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <FormField label="Warehouse" htmlFor="reconciliation-warehouse" required>
            <SelectInput
              id="reconciliation-warehouse"
              name="warehouseId"
              value={formData.warehouseId}
              required
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              onChange={(e) => setFormData((p) => ({ ...p, warehouseId: e.target.value }))}
            />
          </FormField>

          <FormField label="Reconciliation Date" htmlFor="reconciliation-date" required>
            <input
              id="reconciliation-date"
              name="reconciliationDate"
              type="text"
              value={formData.reconciliationDate}
              onChange={(e) => setFormData((p) => ({ ...p, reconciliationDate: e.target.value }))}
              className={INPUT_CLASS}
            />
          </FormField>

          <fieldset className="min-w-0">
            <legend className="text-[13px] font-semibold leading-4 text-ink">Scope</legend>
            <div className="mt-2 flex min-h-[38px] flex-wrap items-center gap-x-5 gap-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                <input
                  type="radio"
                  name="scope"
                  value="Full Inventory"
                  checked={formData.scope === "Full Inventory"}
                  onChange={(e) => setFormData((p) => ({ ...p, scope: e.target.value }))}
                  className="text-navy accent-navy focus:ring-navy"
                />
                <span>Full Inventory</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                <input
                  type="radio"
                  name="scope"
                  value="Selected Items"
                  checked={formData.scope === "Selected Items"}
                  onChange={(e) => setFormData((p) => ({ ...p, scope: e.target.value }))}
                  className="text-navy accent-navy focus:ring-navy"
                />
                <span>Selected Items</span>
              </label>
            </div>
          </fieldset>

          {formData.scope === "Selected Items" && (
            <FormField label="Item Selection" htmlFor="reconciliation-add-item" className="sm:col-span-2">
              <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-md border border-field-line bg-field p-2">
                {formData.selectedItemIds.map((id) => {
                  const item = items.find((i) => i.id === id);
                  if (!item) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-field-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink"
                    >
                      <span className="truncate">{item.itemName}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleItem(id)}
                        aria-label={`Remove ${item.itemName} from selection`}
                        className="shrink-0 text-muted hover:text-danger"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
                <SelectInput
                  id="reconciliation-add-item"
                  name="addItem"
                  value=""
                  placeholder="+ Add item to count scope..."
                  options={items
                    .filter((i) => !formData.selectedItemIds.includes(i.id))
                    .map((it) => ({ value: it.id, label: `${it.itemCode} - ${it.itemName}` }))}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleToggleItem(e.target.value);
                    }
                  }}
                  disabled={items.every((i) => formData.selectedItemIds.includes(i.id))}
                />
              </div>
            </FormField>
          )}

          <FormField label="Remarks / Notes" htmlFor="reconciliation-remarks" className="sm:col-span-2">
            <textarea
              id="reconciliation-remarks"
              name="remarks"
              rows={3}
              placeholder="Add counting instructions or reconciliation notes"
              value={formData.remarks}
              onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
              className={`${TEXTAREA_CLASS} h-auto min-h-[72px]`}
            />
          </FormField>

          <FormField label="Assigned To" htmlFor="reconciliation-assigned-to" required>
            <SelectInput
              id="reconciliation-assigned-to"
              name="assignedTo"
              value={formData.assignedTo}
              required
              options={ASSIGNED_TEAMS.map((team) => ({ value: team, label: team }))}
              onChange={(e) => setFormData((p) => ({ ...p, assignedTo: e.target.value }))}
            />
          </FormField>
        </div>
      </ModalForm>
    </Modal>
  );
}
