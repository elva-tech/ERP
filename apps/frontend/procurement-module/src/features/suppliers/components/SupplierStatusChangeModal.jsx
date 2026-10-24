import FormField from "../../../components/ui/FormField.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { TEXTAREA_CLASS } from "../../../components/ui/formStyles.js";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { changeSupplierStatus } from "../supplierService.js";
import { SUPPLIER_STATUS_BADGES, nextSupplierStatus } from "../supplierStatus.js";

function SupplierStatusChangeModal({ supplier, onClose, onChanged }) {
  const targetStatus = nextSupplierStatus(supplier.status);
  const targetLabel = SUPPLIER_STATUS_BADGES[targetStatus].label;
  const form = useFormSubmission({
    initialValues: { reason: "" },
    submit: (values, context) => changeSupplierStatus(supplier.id, { status: targetStatus, reason: values.reason }, context),
    onSuccess: () => onChanged(`${supplier.name} marked as ${targetLabel}.`),
  });

  return (
    <Modal
      title={`Mark supplier as ${targetLabel}`}
      description={`${supplier.name}${supplier.code ? ` (${supplier.code})` : ""}. The change is recorded in the audit trail.`}
      width="sm"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel={`Mark as ${targetLabel}`}
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <FormField label="Reason" htmlFor="supplier-status-reason" error={form.fieldErrors.reason}>
          <textarea
            id="supplier-status-reason"
            name="reason"
            data-autofocus
            placeholder="Why is the status changing?"
            value={form.values.reason}
            onChange={form.handleChange}
            aria-invalid={Boolean(form.fieldErrors.reason) || undefined}
            className={TEXTAREA_CLASS}
          />
        </FormField>
      </ModalForm>
    </Modal>
  );
}

export default SupplierStatusChangeModal;
