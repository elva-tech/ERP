import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { TextAreaField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { formatInr } from "../../../lib/formatters.js";
import { decideApproval } from "../approvalService.js";

/** Approve (optional comment) or reject (reason required) a single request; the backend records the decision. */
function ApprovalDecisionModal({ approval, decision, onClose, onDecided }) {
  const isReject = decision === "rejected";
  const form = useFormSubmission({
    initialValues: { comment: "" },
    validate: (values) => (isReject && !values.comment.trim() ? { comment: "Enter the reason for rejecting this request." } : {}),
    submit: (values, context) =>
      decideApproval(approval.id, { decision, comment: values.comment.trim(), expectedVersion: approval.version }, context),
    onSuccess: onDecided,
  });

  return (
    <Modal
      title={isReject ? "Reject Request" : "Approve Request"}
      description={`${approval.documentTypeLabel} ${approval.document?.number ?? ""} · ${formatInr(approval.amount)}`}
      width="sm"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel={isReject ? "Reject" : "Approve"}
        submitTone={isReject ? "danger" : "success"}
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <TextAreaField
          form={form}
          idPrefix="approval-decision"
          name="comment"
          label={isReject ? "Reason for rejection" : "Comment (optional)"}
          required={isReject}
          placeholder={isReject ? "Explain why this request is being rejected" : "Add a note for the requester"}
          data-autofocus
        />
      </ModalForm>
    </Modal>
  );
}

export default ApprovalDecisionModal;
