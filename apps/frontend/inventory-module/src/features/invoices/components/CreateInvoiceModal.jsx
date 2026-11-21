import React, { useState } from "react";
import Modal from "../../../components/ui/Modal.jsx";
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Customer Name & Customer GSTIN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Customer Name <span className="text-brand">*</span>
            </label>
            <select
              value={formData.customer}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            >
              {CUSTOMERS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Customer GSTIN
            </label>
            <input
              type="text"
              readOnly
              value={formData.customerGstin}
              className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-field-line rounded-lg text-ink cursor-not-allowed"
            />
          </div>
        </div>

        {/* Row 2: Invoice Date & Due Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Invoice Date <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              value={formData.invoiceDate}
              onChange={(e) => setFormData((p) => ({ ...p, invoiceDate: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Due Date <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              value={formData.dueDate}
              onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-ink">Line Items</label>
          <div className="border border-line rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-workspace border-b border-line text-muted">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Item</th>
                  <th className="py-2.5 px-3 font-semibold w-20">Qty</th>
                  <th className="py-2.5 px-3 font-semibold w-24">Rate</th>
                  <th className="py-2.5 px-3 font-semibold w-16">Tax</th>
                  <th className="py-2.5 px-3 font-semibold w-24">Amount</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {formData.lineItems.map((line, idx) => {
                  const lineTotal = (Number(line.qty) || 0) * (Number(line.rate) || 0);
                  return (
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
                          value={line.qty}
                          onChange={(e) => handleLineChange(idx, "qty", e.target.value)}
                          className="w-full p-1.5 text-xs bg-field border border-field-line rounded focus:outline-none focus:border-navy"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={line.rate}
                          onChange={(e) => handleLineChange(idx, "rate", e.target.value)}
                          className="w-full p-1.5 text-xs bg-field border border-field-line rounded focus:outline-none focus:border-navy"
                        />
                      </td>
                      <td className="p-2 text-muted">18%</td>
                      <td className="p-2 text-ink font-semibold">
                        ₹{lineTotal.toLocaleString("en-IN")}
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
                  );
                })}
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

        {/* Row 4: Payment Terms & Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Payment Terms</label>
            <select
              value={formData.paymentTerms}
              onChange={(e) => setFormData((p) => ({ ...p, paymentTerms: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            >
              {PAYMENT_TERMS.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Remarks</label>
            <input
              type="text"
              placeholder="Add notes for the customer"
              value={formData.remarks}
              onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            />
          </div>
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
            {isSubmitting ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

