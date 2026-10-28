import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { changeSubcontractAgreementStatus } from "../subcontractAgreementService.js";

/** Marks an active agreement as completed once all work is finished (PRD: no other manual status changes). */
function AgreementStatusModal({ agreement, onClose, onChanged }) {
  const form = useFormSubmission({
    initialValues: {},
    submit: (_, context) => changeSubcontractAgreementStatus(agreement.id, { status: "completed" }, context),
    onSuccess: onChanged,
  });

  return (
    <Modal title="Mark as Completed" description={agreement.agreementNumber} width="sm" onClose={onClose}>
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Mark as Completed"
        submitTone="success"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <p className="text-[13px] leading-5 text-ink">
          The agreement will be closed as completed. Expired status is applied automatically when the end date has passed.
        </p>
      </ModalForm>
    </Modal>
  );
}

export default AgreementStatusModal;
