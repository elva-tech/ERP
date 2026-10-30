import React, { useState } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import { Info } from "lucide-react";

export default function CreateDeliveryNoteModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  invoices = [],
  warehouses = [],
}) {
  const [formData, setFormData] = useState({
    salesInvoiceRef: invoices[0]?.invoiceNo || "",
    customer: invoices[0]?.customer || "",
    warehouseId: warehouses[0]?.id || "",
    deliveryDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    vehicleNo: "",
    transporterName: "",
    contactPhone: "",
  });

  const handleInvoiceChange = (invNo) => {
    const inv = invoices.find((i) => i.invoiceNo === invNo);
    setFormData((prev) => ({
      ...prev,
      salesInvoiceRef: invNo,
      customer: inv ? inv.customer : "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      title="Create Delivery Note"
      description="Plan dispatch against an approved sales invoice"
      width="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sales Invoice Selection */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Sales Invoice <span className="text-brand">*</span>
          </label>
          <select
            value={formData.salesInvoiceRef}
            onChange={(e) => handleInvoiceChange(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.invoiceNo}>
                {inv.invoiceNo} — {inv.customer}
              </option>
            ))}
          </select>
        </div>

        {/* Info Banner */}
        <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-800">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Selecting an invoice will auto-fill the customer details.</span>
        </div>

        {/* Row 2: Customer & Warehouse */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Customer <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              readOnly
              value={formData.customer}
              placeholder="Auto-filled from sales invoice"
              className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-field-line rounded-lg text-ink cursor-not-allowed"
            />
          </div>

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
        </div>

        {/* Delivery Date */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Delivery Date <span className="text-brand">*</span>
          </label>
          <input
            type="text"
            placeholder="DD / MM / YYYY"
            value={formData.deliveryDate}
            onChange={(e) => setFormData((p) => ({ ...p, deliveryDate: e.target.value }))}
            className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
          />
        </div>

        {/* Transport Details Section */}
        <div className="pt-2">
          <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">
            Transport Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Vehicle No</label>
              <input
                type="text"
                placeholder="e.g. MH 12 AB 4521"
                value={formData.vehicleNo}
                onChange={(e) => setFormData((p) => ({ ...p, vehicleNo: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-field border border-field-line rounded-lg focus:outline-none focus:border-navy"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Transporter Name</label>
              <input
                type="text"
                placeholder="Enter transporter"
                value={formData.transporterName}
                onChange={(e) => setFormData((p) => ({ ...p, transporterName: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-field border border-field-line rounded-lg focus:outline-none focus:border-navy"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Contact Phone</label>
              <input
                type="text"
                placeholder="+91 00000 00000"
                value={formData.contactPhone}
                onChange={(e) => setFormData((p) => ({ ...p, contactPhone: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-field border border-field-line rounded-lg focus:outline-none focus:border-navy"
              />
            </div>
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
            {isSubmitting ? "Creating..." : "Create Delivery Note"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

