import LineItemsEditor from "../../../components/ui/LineItemsEditor.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { DateField, SelectField, TextAreaField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { useLookupOptions } from "../../../hooks/useLookupOptions.js";
import { isBlank, isMoneyAmount, isPositiveDecimal } from "../../../lib/validation.js";
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

function CreatePurchaseOrderModal({ onClose, onCreated }) {
  const suppliers = useLookupOptions("suppliers");
  const requisitions = useLookupOptions("approvedRequisitions");
  const paymentTerms = useLookupOptions("paymentTerms");
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
          <SelectField {...field} name="requisitionId" label="PR Reference" placeholder="Select approved PR" lookup={requisitions} />
          <DateField {...field} name="deliveryDate" label="Delivery Date" />
          <SelectField {...field} name="paymentTermId" label="Payment Terms" placeholder="Select payment terms" lookup={paymentTerms} />
          <div className="sm:col-span-2">
            <LineItemsEditor
              form={form}
              idPrefix={ID_PREFIX}
              emptyItem={EMPTY_ITEM}
              addLabel="Add line item"
              computedHint="Line amounts, taxes and the order total are calculated by the server when the order is saved."
              columns={[
                { key: "description", label: "Description", width: "minmax(0,1fr)", placeholder: "Select item..." },
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
