import { useRef } from "react";
import FormField from "../../../components/ui/FormField.jsx";
import LineItemsEditor from "../../../components/ui/LineItemsEditor.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import SelectInput from "../../../components/ui/SelectInput.jsx";
import { DateField, SelectField, TextAreaField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { useLookupOptions } from "../../../hooks/useLookupOptions.js";
import { isBlank, isMoneyAmount, isPositiveDecimal } from "../../../lib/validation.js";
import { getPurchaseRequisition } from "../../purchase-requisitions/purchaseRequisitionService.js";
import { createPurchaseOrder } from "../purchaseOrderService.js";

const ID_PREFIX = "purchase-order";
const EMPTY_ITEM = { description: "", quantity: "", unitPrice: "" };
const INITIAL_VALUES = {
  supplierId: "",
  requisitionId: "",
  deliveryDate: "",
  paymentTermId: "",
  items: [{ ...EMPTY_ITEM }],
  shippingAddress: "",
  notes: "",
};

function validate(values) {
  const errors = {};
  values.items.forEach((item, index) => {
    if (!isBlank(item.quantity) && !isPositiveDecimal(item.quantity)) {
      errors[`items.${index}.quantity`] = "Quantity must be greater than zero.";
    }
    if (!isBlank(item.unitPrice) && !isMoneyAmount(item.unitPrice)) {
      errors[`items.${index}.unitPrice`] = "Enter an amount with up to two decimals.";
    }
  });
  return errors;
}

/** Derive a per-unit price from the PR line total (decimal strings from the backend). */
function unitPriceFromLine(quantity, estimatedCost) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0 || !estimatedCost) return "";
  const total = Number(estimatedCost);
  if (!Number.isFinite(total)) return "";
  return (total / qty).toFixed(2);
}

function CreatePurchaseOrderModal({ onClose, onCreated }) {
  const suppliers = useLookupOptions("suppliers");
  const requisitions = useLookupOptions("approvedRequisitions");
  const paymentTerms = useLookupOptions("paymentTerms");
  const prRequestRef = useRef(null);
  const form = useFormSubmission({
    initialValues: INITIAL_VALUES,
    validate,
    submit: (values, context) =>
      createPurchaseOrder(
        {
          ...values,
          items: values.items.map(({ description, quantity, unitPrice }) => ({
            description,
            quantity: quantity.trim(),
            unitPrice: unitPrice.trim(),
          })),
        },
        context,
      ),
    onSuccess: onCreated,
  });
  const field = { form, idPrefix: ID_PREFIX };

  async function handleRequisitionChange(event) {
    const requisitionId = event.target.value;
    form.setValue("requisitionId", requisitionId);
    prRequestRef.current?.abort();
    if (isBlank(requisitionId)) {
      form.setValue("items", [{ ...EMPTY_ITEM }]);
      return;
    }
    const controller = new AbortController();
    prRequestRef.current = controller;
    try {
      const pr = await getPurchaseRequisition(requisitionId, controller.signal);
      const lines = (pr.items ?? []).map((line) => ({
        description: line.description ?? "",
        quantity: line.quantity ?? "",
        unitPrice: unitPriceFromLine(line.quantity, line.estimatedCost),
      }));
      form.setValue("items", lines.length > 0 ? lines : [{ ...EMPTY_ITEM }]);
    } catch (error) {
      if (error?.kind === "aborted") return;
      form.setValue("items", [{ ...EMPTY_ITEM }]);
    }
  }

  return (
    <Modal
      title="Create Purchase Order"
      description="Confirm the supplier, delivery details and ordered items."
      width="xl"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Create Purchase Order"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <SelectField {...field} name="supplierId" label="Supplier" placeholder="Select supplier" lookup={suppliers} />
          <FormField label="PR Reference" htmlFor={`${ID_PREFIX}-requisitionId`} error={form.fieldErrors.requisitionId}>
            <SelectInput
              id={`${ID_PREFIX}-requisitionId`}
              name="requisitionId"
              value={form.values.requisitionId}
              placeholder="Select approved PR"
              options={requisitions.options}
              status={requisitions.status}
              invalid={Boolean(form.fieldErrors.requisitionId)}
              onChange={handleRequisitionChange}
            />
          </FormField>
          <DateField {...field} name="deliveryDate" label="Delivery Date" />
          <SelectField {...field} name="paymentTermId" label="Payment Terms" placeholder="Select payment terms" lookup={paymentTerms} />
          <div className="sm:col-span-2">
            <LineItemsEditor
              form={form}
              idPrefix={ID_PREFIX}
              emptyItem={EMPTY_ITEM}
              addLabel="Add line item"
              computedHint={
                form.values.requisitionId
                  ? "Items are filled from the selected requisition. Adjust quantities or unit prices if needed before saving."
                  : "Select a PR reference to load its items, or add lines manually."
              }
              columns={[
                { key: "description", label: "Description", width: "minmax(0,1fr)", placeholder: "Item description" },
                { key: "quantity", label: "Qty", width: "96px", kind: "quantity", placeholder: "1" },
                { key: "unitPrice", label: "Unit Price", width: "130px", kind: "decimal", placeholder: "0.00" },
                { key: "amount", label: "Amount", width: "120px", kind: "computed" },
              ]}
            />
          </div>
          <TextAreaField {...field} name="shippingAddress" label="Shipping Address" placeholder="Enter delivery location" />
          <TextAreaField {...field} name="notes" label="Notes" placeholder="Add terms or special instructions..." />
        </div>
      </ModalForm>
    </Modal>
  );
}

export default CreatePurchaseOrderModal;
