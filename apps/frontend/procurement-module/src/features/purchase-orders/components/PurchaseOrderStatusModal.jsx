import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { changePurchaseOrderStatus } from "../purchaseOrderService.js";

const STATUS_CHANGES = {
  sent: { title: "Mark as Sent", message: "The purchase order will be marked as sent to the supplier.", tone: "brand" },
  completed: {
    title: "Mark Completed",
    message: "The purchase order will be closed as completed. No further receipts can be recorded against it.",
    tone: "success",
  },
  cancelled: { title: "Cancel Purchase Order", message: "The purchase order will be cancelled. This cannot be undone.", tone: "danger" },
};

/** Confirms a manual PO status change; the backend validates whether the transition is allowed. */
function PurchaseOrderStatusModal({ purchaseOrder, status, onClose, onChanged }) {
  const change = STATUS_CHANGES[status];
  const form = useFormSubmission({
    initialValues: {},
    submit: (_, context) => changePurchaseOrderStatus(purchaseOrder.id, { status }, context),
    onSuccess: onChanged,
  });

  return (
    <Modal title={change.title} description={purchaseOrder.orderNumber} width="sm" onClose={onClose}>
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel={change.title}
        submitTone={change.tone}
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <p className="text-[13px] leading-5 text-ink">{change.message}</p>
      </ModalForm>
    </Modal>
  );
}

export default PurchaseOrderStatusModal;
