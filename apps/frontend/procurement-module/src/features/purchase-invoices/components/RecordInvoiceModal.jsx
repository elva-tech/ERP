import { useRef, useState } from "react";
import FileDropzone from "../../../components/ui/FileDropzone.jsx";
import LineItemsEditor from "../../../components/ui/LineItemsEditor.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { DateField, MoneyField, SelectField, TextField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { useLookupOptions } from "../../../hooks/useLookupOptions.js";
import { createIdempotencyKey } from "../../../lib/apiClient.js";
import { isBlank, isMoneyAmount, isPositiveDecimal } from "../../../lib/validation.js";
import { createPurchaseInvoice, uploadAttachment } from "../purchaseInvoiceService.js";

const ID_PREFIX = "invoice";
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const EMPTY_ITEM = { description: "", quantity: "", rate: "" };
const INITIAL_VALUES = {
  invoiceNumber: "",
  supplierId: "",
  purchaseOrderId: "",
  invoiceDate: "",
  dueDate: "",
  items: [{ ...EMPTY_ITEM }],
  taxRatePercent: "",
  statedTotalAmount: "",
};

function validate(values) {
  const errors = {};
  values.items.forEach((item, index) => {
    if (!isBlank(item.quantity) && !isPositiveDecimal(item.quantity)) {
      errors[`items.${index}.quantity`] = "Quantity must be greater than zero.";
    }
    if (!isBlank(item.rate) && !isMoneyAmount(item.rate)) {
      errors[`items.${index}.rate`] = "Enter an amount with up to two decimals.";
    }
  });
  if (!isBlank(values.statedTotalAmount) && !isMoneyAmount(values.statedTotalAmount)) {
    errors.statedTotalAmount = "Enter an amount with up to two decimals.";
  }
  if (values.invoiceDate && values.dueDate && values.dueDate < values.invoiceDate) {
    errors.dueDate = "Due date cannot be before the invoice date.";
  }
  return errors;
}

function RecordInvoiceModal({ onClose, onCreated }) {
  const suppliers = useLookupOptions("suppliers");
  const purchaseOrders = useLookupOptions("purchaseOrders");
  const [attachment, setAttachment] = useState(null);
  const uploaded = useRef({ file: null, id: null, idempotencyKey: createIdempotencyKey() });

  async function submit(values, context) {
    let attachmentId = null;
    if (attachment) {
      if (uploaded.current.file !== attachment) {
        uploaded.current = { file: attachment, id: null, idempotencyKey: createIdempotencyKey() };
      }
      if (!uploaded.current.id) {
        const result = await uploadAttachment(attachment, {
          idempotencyKey: uploaded.current.idempotencyKey,
          purpose: "purchase_invoice",
        });
        uploaded.current.id = result.id;
      }
      attachmentId = uploaded.current.id;
    }
    return createPurchaseInvoice(
      {
        ...values,
        items: values.items.map(({ description, quantity, rate }) => ({ description, quantity: quantity.trim(), rate: rate.trim() })),
        taxRatePercent: values.taxRatePercent.trim(),
        statedTotalAmount: values.statedTotalAmount.trim(),
        attachmentIds: attachmentId ? [attachmentId] : [],
      },
      context,
    );
  }

  const form = useFormSubmission({ initialValues: INITIAL_VALUES, validate, submit, onSuccess: onCreated });
  const field = { form, idPrefix: ID_PREFIX };

  return (
    <Modal
      title="Record Invoice"
      description="Capture supplier invoice details and match them to a purchase order."
      width="xl"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Record Invoice"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-3">
          <TextField {...field} name="invoiceNumber" label="Invoice Number" placeholder="Enter invoice number" spellCheck={false} data-autofocus />
          <SelectField {...field} name="supplierId" label="Supplier" placeholder="Select supplier" lookup={suppliers} />
          <SelectField {...field} name="purchaseOrderId" label="PO Reference" placeholder="Select PO" lookup={purchaseOrders} />
        </div>
        <div className="mt-[11px] grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <DateField {...field} name="invoiceDate" label="Invoice Date" />
          <DateField {...field} name="dueDate" label="Due Date" min={form.values.invoiceDate || undefined} />
          <div className="sm:col-span-2">
            <LineItemsEditor
              form={form}
              idPrefix={ID_PREFIX}
              emptyItem={EMPTY_ITEM}
              addLabel="Add line item"
              computedHint="Line amounts and tax are calculated by the server and matched against the purchase order."
              columns={[
                { key: "description", label: "Description", width: "minmax(0,1fr)", placeholder: "Structural steel supply" },
                { key: "quantity", label: "Qty", width: "96px", kind: "quantity", placeholder: "1" },
                { key: "rate", label: "Rate", width: "130px", kind: "decimal", placeholder: "0.00" },
                { key: "amount", label: "Amount", width: "120px", kind: "computed" },
              ]}
            />
          </div>
          <TextField {...field} name="taxRatePercent" label="Tax %" inputMode="decimal" placeholder="18" autoComplete="off" />
          <MoneyField {...field} name="statedTotalAmount" label="Total Amount" />
          <div className="sm:col-span-2">
            <FileDropzone
              id={`${ID_PREFIX}-attachment`}
              label="Upload Invoice attachment"
              hint="PDF, JPG or PNG · max 10 MB"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              acceptedTypes={ACCEPTED_TYPES}
              maxBytes={MAX_ATTACHMENT_BYTES}
              file={attachment}
              onChange={setAttachment}
              error={form.fieldErrors.attachmentIds}
            />
          </div>
        </div>
      </ModalForm>
    </Modal>
  );
}

export default RecordInvoiceModal;
