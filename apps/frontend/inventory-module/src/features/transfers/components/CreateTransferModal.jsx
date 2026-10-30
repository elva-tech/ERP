import React, { useState } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import { Plus, Trash2 } from "lucide-react";

export default function CreateTransferModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  warehouses = [],
  items = [],
}) {
  const [formData, setFormData] = useState({
    fromWarehouseId: warehouses[0]?.id || "",
    toWarehouseId: warehouses[1]?.id || "",
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    reason: "Replenishment for project requirement",
    lineItems: [
      { itemId: items[0]?.id || "", quantity: 50 },
    ],
  });
  const [error, setError] = useState(null);

  const handleLineChange = (index, field, value) => {
    const updated = [...formData.lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, lineItems: updated }));
  };

  const addLine = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { itemId: items[0]?.id || "", quantity: 10 },
      ],
    }));
  };

  const removeLine = (index) => {
    if (formData.lineItems.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.fromWarehouseId === formData.toWarehouseId) {
      setError("Source and destination warehouses cannot be the same.");
      return;
    }
    setError(null);
    onSubmit({
      ...formData,
      lineItems: formData.lineItems.map((l) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
      })),
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      title="Create Stock Transfer"
      description="Transfer items between warehouses with complete movement traceability"
      width="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-xs text-danger rounded-lg">
            {error}
          </div>
        )}

        {/* Row 1: From WH & To WH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              From Warehouse <span className="text-brand">*</span>
            </label>
            <select
              value={formData.fromWarehouseId}
              onChange={(e) => setFormData((p) => ({ ...p, fromWarehouseId: e.target.value }))}
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
              To Warehouse <span className="text-brand">*</span>
            </label>
            <select
              value={formData.toWarehouseId}
              onChange={(e) => setFormData((p) => ({ ...p, toWarehouseId: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Date & Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Date <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              value={formData.date}
              onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Reason <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-ink">Line Items</label>
          <div className="border border-line rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-workspace border-b border-line text-muted">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Item</th>
                  <th className="py-2.5 px-3 font-semibold w-28">Quantity</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {formData.lineItems.map((line, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <select
                        value={line.itemId}
                        onChange={(e) => handleLineChange(idx, "itemId", e.target.value)}
                        className="w-full p-1.5 text-xs bg-field border border-field-line rounded focus:outline-none focus:border-navy"
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.itemCode} • {it.itemName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                        className="w-full p-1.5 text-xs bg-field border border-field-line rounded focus:outline-none focus:border-navy"
                      >
                      </input>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={formData.lineItems.length <= 1}
                        className="text-muted hover:text-danger disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-action-navy hover:text-blue-700 hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add row</span>
          </button>
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
            {isSubmitting ? "Creating..." : "Create Transfer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

