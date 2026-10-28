import LineItemsEditor from "../../../components/ui/LineItemsEditor.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { DateField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { exceedsDecimal, isBlank, isPositiveDecimal } from "../../../lib/validation.js";
import { recordPurchaseOrderReceipt } from "../purchaseOrderService.js";

const ID_PREFIX = "po-receipt";

const withUnit = (quantity, unitLabel) => (unitLabel ? `${quantity} ${unitLabel}` : quantity);

function validate(values) {
  const errors = {};
  if (isBlank(values.receivedDate)) errors.receivedDate = "Select the date the goods were received.";
  values.items.forEach((item, index) => {
    if (isBlank(item.quantity)) return;
    if (!isPositiveDecimal(item.quantity)) errors[`items.${index}.quantity`] = "Quantity must be greater than zero.";
    else if (exceedsDecimal(item.quantity, item.remainingQuantity)) {
      errors[`items.${index}.quantity`] = `Cannot exceed the remaining ${item.remainingQuantity}.`;
    }
  });
  if (values.items.every((item) => isBlank(item.quantity))) errors.items = "Enter the quantity received for at least one item.";
  return errors;
}

/** Records goods received against a PO. Every line is sent in order so server errors map back to the same row. */
function RecordReceiptModal({ purchaseOrder, onClose, onRecorded }) {
  const form = useFormSubmission({
    initialValues: {
      receivedDate: "",
      items: purchaseOrder.items.map((line) => ({
        lineId: line.lineId,
        description: line.description,
        ordered: withUnit(line.quantity, line.unitLabel),
        received: withUnit(line.receivedQuantity, line.unitLabel),
        remaining: withUnit(line.remainingQuantity, line.unitLabel),
        remainingQuantity: line.remainingQuantity,
        quantity: "",
      })),
    },
    validate,
    submit: (values, context) =>
      recordPurchaseOrderReceipt(
        purchaseOrder.id,
        {
          receivedDate: values.receivedDate,
          items: values.items.map((item) => ({ lineId: item.lineId, quantity: item.quantity.trim() })),
        },
        context,
      ),
    onSuccess: onRecorded,
  });

  return (
    <Modal
      title="Record Receipt"
      description={`${purchaseOrder.orderNumber} · enter the quantity received now. The amount is calculated by the system.`}
      width="xl"
      onClose={onClose}
    >
      <ModalForm onSubmit={form.handleSubmit} onCancel={onClose} submitLabel="Record Receipt" isSubmitting={form.isSubmitting} formError={form.formError}>
        <div className="grid grid-cols-1 gap-y-[11px] sm:grid-cols-2 sm:gap-x-3">
          <DateField form={form} idPrefix={ID_PREFIX} name="receivedDate" label="Received Date" required />
          <div className="sm:col-span-2">
            <LineItemsEditor
              form={form}
              idPrefix={ID_PREFIX}
              columns={[
                { key: "description", label: "Item", width: "minmax(0,1fr)", kind: "readonly" },
                { key: "ordered", label: "Ordered", width: "100px", kind: "readonly" },
                { key: "received", label: "Received", width: "100px", kind: "readonly" },
                { key: "remaining", label: "Remaining", width: "100px", kind: "readonly" },
                { key: "quantity", label: "Qty Received Now", width: "130px", kind: "quantity", placeholder: "0" },
              ]}
              computedHint="Leave a line blank if nothing was received for it. Total received cannot exceed the ordered quantity."
            />
          </div>
        </div>
      </ModalForm>
    </Modal>
  );
}

export default RecordReceiptModal;
