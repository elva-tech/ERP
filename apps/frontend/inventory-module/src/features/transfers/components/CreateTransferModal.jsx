import React, { useState } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import SelectInput from "../../../components/ui/SelectInput.jsx";
import { INPUT_CLASS } from "../../../components/ui/formStyles.js";
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
      width="xl"
    >
      <ModalForm onSubmit={handleSubmit} onCancel={onClose} submitLabel="Create Transfer" isSubmitting={isSubmitting}>
        {error && (
          <div role="alert" className="mb-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] leading-[17px] text-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <FormField label="From Warehouse" htmlFor="transfer-from-warehouse" required>
            <SelectInput
              id="transfer-from-warehouse"
              name="fromWarehouseId"
              value={formData.fromWarehouseId}
              required
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              onChange={(e) => setFormData((p) => ({ ...p, fromWarehouseId: e.target.value }))}
            />
          </FormField>

          <FormField label="To Warehouse" htmlFor="transfer-to-warehouse" required>
            <SelectInput
              id="transfer-to-warehouse"
              name="toWarehouseId"
              value={formData.toWarehouseId}
              required
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              onChange={(e) => setFormData((p) => ({ ...p, toWarehouseId: e.target.value }))}
            />
          </FormField>

          <FormField label="Date" htmlFor="transfer-date" required>
            <input
              id="transfer-date"
              name="date"
              type="text"
              value={formData.date}
              onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
              className={INPUT_CLASS}
            />
          </FormField>

          <FormField label="Reason" htmlFor="transfer-reason" required>
            <input
              id="transfer-reason"
              name="reason"
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))}
              className={INPUT_CLASS}
            />
          </FormField>

          <div className="min-w-0 space-y-2 sm:col-span-2">
            <p className="text-[13px] font-semibold leading-4 text-ink">Line Items</p>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[560px] text-left text-[12px]">
                <thead className="border-b border-line bg-workspace text-muted">
                  <tr>
                    <th className="w-[65%] px-3 py-2.5 font-semibold">Item</th>
                    <th className="w-[25%] px-3 py-2.5 font-semibold">Quantity</th>
                    <th className="w-12 px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {formData.lineItems.map((line, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <SelectInput
                          id={`transfer-item-${idx}`}
                          name={`lineItems.${idx}.itemId`}
                          value={line.itemId}
                          options={items.map((it) => ({ value: it.id, label: `${it.itemCode} • ${it.itemName}` }))}
                          onChange={(e) => handleLineChange(idx, "itemId", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          aria-label={`Quantity, line ${idx + 1}`}
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                          className={`${INPUT_CLASS} min-w-0`}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={formData.lineItems.length <= 1}
                          aria-label={`Remove line ${idx + 1}`}
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
              className="inline-flex items-center gap-1 rounded-md border border-field-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-workspace"
            >
              <Plus size={14} aria-hidden="true" />
              Add row
            </button>
          </div>
        </div>
      </ModalForm>
    </Modal>
  );
}
