import React, { useState } from "react";
import Modal from "../../../components/ui/Modal.jsx";
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
      width="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Warehouse & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Warehouse <span className="text-brand">*</span>
            </label>
            <select
              value={formData.warehouseId}
              onChange={(e) => setFormData((p) => ({ ...p, warehouseId: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Reconciliation Date <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              value={formData.reconciliationDate}
              onChange={(e) => setFormData((p) => ({ ...p, reconciliationDate: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            />
          </div>
        </div>

        {/* Scope Radio Selection */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-2">Scope</label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="Full Inventory"
                checked={formData.scope === "Full Inventory"}
                onChange={(e) => setFormData((p) => ({ ...p, scope: e.target.value }))}
                className="text-navy focus:ring-navy"
              />
              <span>Full Inventory</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="Selected Items"
                checked={formData.scope === "Selected Items"}
                onChange={(e) => setFormData((p) => ({ ...p, scope: e.target.value }))}
                className="text-navy focus:ring-navy"
              />
              <span>Selected Items</span>
            </label>
          </div>
        </div>

        {/* Item Selection Tags (when Selected Items is active) */}
        {formData.scope === "Selected Items" && (
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Item Selection</label>
            <div className="p-2 bg-field border border-field-line rounded-lg min-h-[48px] flex flex-wrap gap-2 items-center">
              {formData.selectedItemIds.map((id) => {
                const item = items.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium text-ink shadow-2xs"
                  >
                    <span>{item.itemName}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleItem(id)}
                      className="text-muted hover:text-danger"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleToggleItem(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="text-xs bg-transparent text-muted focus:outline-none cursor-pointer py-1"
              >
                <option value="">+ Add item to count scope...</option>
                {items
                  .filter((i) => !formData.selectedItemIds.includes(i.id))
                  .map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.itemCode} - {it.itemName}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Remarks */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">Remarks / Notes</label>
          <textarea
            rows={3}
            placeholder="Add counting instructions or reconciliation notes"
            value={formData.remarks}
            onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
            className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy resize-none"
          />
        </div>

        {/* Assigned To */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">Assigned To <span className="text-brand">*</span></label>
          <select
            value={formData.assignedTo}
            onChange={(e) => setFormData((p) => ({ ...p, assignedTo: e.target.value }))}
            className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
          >
            {ASSIGNED_TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-field-line">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-ink bg-surface border border-line rounded-lg hover:bg-workspace transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-semibold text-white bg-[#1b3858] hover:bg-[#142c46] rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? "Starting..." : "Start Reconciliation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

