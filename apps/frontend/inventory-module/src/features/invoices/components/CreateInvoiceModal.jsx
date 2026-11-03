import React, { useState } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import SelectInput from "../../../components/ui/SelectInput.jsx";
import { INPUT_CLASS } from "../../../components/ui/formStyles.js";
import { Plus, Trash2 } from "lucide-react";

const CUSTOMERS = [
  { name: "MahaBuild Contractors Pvt. Ltd.", gstin: "27AAECM4281K1Z7" },
  { name: "Apex Infra Projects", gstin: "27AABCA1234F1Z5" },
  { name: "Vertex Engineering", gstin: "27AABCV5566G1Z2" },
];

const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Immediate", "Advance"];

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  items = [],
}) {
  const [formData, setFormData] = useState({
    customer: CUSTOMERS[0].name,
    customerGstin: CUSTOMERS[0].gstin,
    invoiceDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    dueDate: new Date(Date.now() + 15 * 86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    paymentTerms: "Net 15",
    remarks: "",
    lineItems: [
      { itemId: items[0]?.id || "", qty: 100, rate: 250, taxPercent: 18 },
    ],
  });

  const handleCustomerChange = (custName) => {
    const cust = CUSTOMERS.find((c) => c.name === custName);
    setFormData((prev) => ({
      ...prev,
      customer: custName,
      customerGstin: cust ? cust.gstin : "",
    }));
  };

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
        { itemId: items[0]?.id || "", qty: 10, rate: 100, taxPercent: 18 },
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
    onSubmit({
      ...formData,
      lineItems: formData.lineItems.map((l) => ({
        itemId: l.itemId,
        qty: Number(l.qty),
        rate: Number(l.rate),
        taxPercent: Number(l.taxPercent) || 18,
      })),
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      title="Create Invoice"
      description="Create a sales invoice for a customer"
      width="xl"
    >
      <ModalForm onSubmit={handleSubmit} onCancel={onClose} submitLabel="Create Invoice" isSubmitting={isSubmitting}>
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <FormField label="Customer Name" htmlFor="invoice-customer" required>
            <SelectInput
              id="invoice-customer"
              name="customer"
              value={formData.customer}
              required
              options={CUSTOMERS.map((customer) => ({ value: customer.name, label: customer.name }))}
              onChange={(e) => handleCustomerChange(e.target.value)}
            />
          </FormField>

          <FormField label="Customer GSTIN" htmlFor="invoice-customer-gstin">
            <input
              id="invoice-customer-gstin"
              name="customerGstin"
              type="text"
              readOnly
              value={formData.customerGstin}
              className={`${INPUT_CLASS} cursor-not-allowed bg-workspace text-muted`}
            />
          </FormField>

          <FormField label="Invoice Date" htmlFor="invoice-date" required>
            <input
              id="invoice-date"
              name="invoiceDate"
              type="text"
              value={formData.invoiceDate}
              onChange={(e) => setFormData((p) => ({ ...p, invoiceDate: e.target.value }))}
              className={INPUT_CLASS}
            />
          </FormField>

          <FormField label="Due Date" htmlFor="invoice-due-date" required>
            <input
              id="invoice-due-date"
              name="dueDate"
              type="text"
              value={formData.dueDate}
              onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
              className={INPUT_CLASS}
            />
          </FormField>

          <div className="min-w-0 space-y-2 sm:col-span-2">
            <p className="text-[13px] font-semibold leading-4 text-ink">Line Items</p>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[760px] text-left text-[12px]">
                <thead className="border-b border-line bg-workspace text-muted">
                  <tr>
                    <th className="w-[45%] px-3 py-2.5 font-semibold">Item</th>
                    <th className="w-20 px-3 py-2.5 font-semibold">Qty</th>
                    <th className="w-24 px-3 py-2.5 font-semibold">Rate</th>
                    <th className="w-16 px-3 py-2.5 font-semibold">Tax</th>
                    <th className="w-24 px-3 py-2.5 font-semibold">Amount</th>
                    <th className="w-12 px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {formData.lineItems.map((line, idx) => {
                    const lineTotal = (Number(line.qty) || 0) * (Number(line.rate) || 0);
                    return (
                      <tr key={idx}>
                        <td className="p-2">
                          <SelectInput
                            id={`invoice-item-${idx}`}
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
                            value={line.qty}
                            onChange={(e) => handleLineChange(idx, "qty", e.target.value)}
                            className={`${INPUT_CLASS} min-w-0`}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            aria-label={`Rate, line ${idx + 1}`}
                            type="number"
                            min="1"
                            value={line.rate}
                            onChange={(e) => handleLineChange(idx, "rate", e.target.value)}
                            className={`${INPUT_CLASS} min-w-0`}
                          />
                        </td>
                        <td className="p-2 text-muted">18%</td>
                        <td className="p-2 font-semibold text-ink">
                          ₹{lineTotal.toLocaleString("en-IN")}
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
                    );
                  })}
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

          <FormField label="Payment Terms" htmlFor="invoice-payment-terms">
            <SelectInput
              id="invoice-payment-terms"
              name="paymentTerms"
              value={formData.paymentTerms}
              options={PAYMENT_TERMS.map((term) => ({ value: term, label: term }))}
              onChange={(e) => setFormData((p) => ({ ...p, paymentTerms: e.target.value }))}
            />
          </FormField>

          <FormField label="Remarks" htmlFor="invoice-remarks">
            <input
              id="invoice-remarks"
              name="remarks"
              type="text"
              placeholder="Add notes for the customer"
              value={formData.remarks}
              onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
              className={INPUT_CLASS}
            />
          </FormField>
        </div>
      </ModalForm>
    </Modal>
  );
}
