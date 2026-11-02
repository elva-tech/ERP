import React, { useState } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import SelectInput from "../../../components/ui/SelectInput.jsx";
import { INPUT_CLASS } from "../../../components/ui/formStyles.js";
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
      width="xl"
    >
      <ModalForm onSubmit={handleSubmit} onCancel={onClose} submitLabel="Create Delivery Note" isSubmitting={isSubmitting}>
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <FormField label="Sales Invoice" htmlFor="delivery-invoice" required>
            <SelectInput
              id="delivery-invoice"
              name="salesInvoiceRef"
              value={formData.salesInvoiceRef}
              required
              options={invoices.map((inv) => ({ value: inv.invoiceNo, label: `${inv.invoiceNo} — ${inv.customer}` }))}
              onChange={(e) => handleInvoiceChange(e.target.value)}
            />
          </FormField>

          <FormField label="Delivery Date" htmlFor="delivery-date" required>
            <input
              id="delivery-date"
              name="deliveryDate"
              type="text"
              placeholder="DD / MM / YYYY"
              value={formData.deliveryDate}
              onChange={(e) => setFormData((p) => ({ ...p, deliveryDate: e.target.value }))}
              className={INPUT_CLASS}
            />
          </FormField>

          <div className="flex items-start gap-2 rounded-md border border-info/20 bg-info-soft px-3 py-2.5 text-[12px] leading-[17px] text-ink sm:col-span-2">
            <Info size={15} className="mt-px shrink-0 text-info" aria-hidden="true" />
            <span>Selecting an invoice will auto-fill the customer details.</span>
          </div>

          <FormField label="Customer" htmlFor="delivery-customer" required>
            <input
              id="delivery-customer"
              name="customer"
              type="text"
              readOnly
              value={formData.customer}
              placeholder="Auto-filled from sales invoice"
              className={`${INPUT_CLASS} cursor-not-allowed bg-workspace text-muted`}
            />
          </FormField>

          <FormField label="Warehouse" htmlFor="delivery-warehouse" required>
            <SelectInput
              id="delivery-warehouse"
              name="warehouseId"
              value={formData.warehouseId}
              required
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              onChange={(e) => setFormData((p) => ({ ...p, warehouseId: e.target.value }))}
            />
          </FormField>

          <section className="space-y-2 sm:col-span-2" aria-labelledby="delivery-transport-heading">
            <h3 id="delivery-transport-heading" className="text-[13px] font-semibold leading-4 text-ink">
              Transport Details
            </h3>
            <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
              <FormField label="Vehicle No" htmlFor="delivery-vehicle">
                <input
                  id="delivery-vehicle"
                  name="vehicleNo"
                  type="text"
                  placeholder="e.g. MH 12 AB 4521"
                  value={formData.vehicleNo}
                  onChange={(e) => setFormData((p) => ({ ...p, vehicleNo: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </FormField>

              <FormField label="Transporter Name" htmlFor="delivery-transporter">
                <input
                  id="delivery-transporter"
                  name="transporterName"
                  type="text"
                  placeholder="Enter transporter"
                  value={formData.transporterName}
                  onChange={(e) => setFormData((p) => ({ ...p, transporterName: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </FormField>

              <FormField label="Contact Phone" htmlFor="delivery-phone">
                <input
                  id="delivery-phone"
                  name="contactPhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+91 00000 00000"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData((p) => ({ ...p, contactPhone: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>
          </section>
        </div>
      </ModalForm>
    </Modal>
  );
}
