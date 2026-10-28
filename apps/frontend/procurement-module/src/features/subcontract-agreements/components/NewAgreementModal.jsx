import { useRef, useState } from "react";
import FileDropzone from "../../../components/ui/FileDropzone.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { DateField, MoneyField, SelectField, TextAreaField, TextField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { useLookupOptions } from "../../../hooks/useLookupOptions.js";
import { createIdempotencyKey } from "../../../lib/apiClient.js";
import { isBlank, isMoneyAmount } from "../../../lib/validation.js";
import { createSubcontractAgreement, uploadAgreementAttachment } from "../subcontractAgreementService.js";

const ID_PREFIX = "agreement";
const ACCEPTED_TYPES = ["application/pdf"];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const INITIAL_VALUES = {
  title: "",
  subcontractorId: "",
  projectId: "",
  startDate: "",
  endDate: "",
  scopeOfWork: "",
  agreementValue: "",
  paymentScheduleId: "",
  termsAndConditions: "",
};

function validate(values) {
  const errors = {};
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = "End date cannot be before the start date.";
  }
  if (!isBlank(values.agreementValue) && !isMoneyAmount(values.agreementValue)) {
    errors.agreementValue = "Enter a non-negative amount with up to two decimals.";
  }
  return errors;
}

function NewAgreementModal({ onClose, onCreated }) {
  const subcontractors = useLookupOptions("subcontractors");
  const projects = useLookupOptions("projects");
  const schedules = useLookupOptions("paymentSchedules");
  const [signedCopy, setSignedCopy] = useState(null);
  const uploaded = useRef({ file: null, id: null, idempotencyKey: createIdempotencyKey() });

  async function submit(values, context) {
    let attachmentId = null;
    if (signedCopy) {
      if (uploaded.current.file !== signedCopy) {
        uploaded.current = { file: signedCopy, id: null, idempotencyKey: createIdempotencyKey() };
      }
      if (!uploaded.current.id) {
        const result = await uploadAgreementAttachment(signedCopy, { idempotencyKey: uploaded.current.idempotencyKey });
        uploaded.current.id = result.id;
      }
      attachmentId = uploaded.current.id;
    }
    return createSubcontractAgreement(
      { ...values, agreementValue: values.agreementValue.trim(), attachmentIds: attachmentId ? [attachmentId] : [] },
      context,
    );
  }

  const form = useFormSubmission({ initialValues: INITIAL_VALUES, validate, submit, onSuccess: onCreated });
  const field = { form, idPrefix: ID_PREFIX };

  return (
    <Modal
      title="New Agreement"
      description="Define the commercial scope, schedule and terms for a subcontract."
      width="lg"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Create Agreement"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <TextField {...field} name="title" label="Agreement Title" placeholder="Enter agreement title" className="sm:col-span-2" data-autofocus />
          <SelectField {...field} name="subcontractorId" label="Subcontractor" placeholder="Select subcontractor" lookup={subcontractors} />
          <SelectField {...field} name="projectId" label="Project" placeholder="Select project or site" lookup={projects} />
          <DateField {...field} name="startDate" label="Start Date" />
          <DateField {...field} name="endDate" label="End Date" min={form.values.startDate || undefined} />
          <TextAreaField
            {...field}
            name="scopeOfWork"
            label="Scope of Work"
            placeholder="Describe deliverables, inclusions, exclusions and milestones"
            className="sm:col-span-2"
          />
          <MoneyField {...field} name="agreementValue" label="Agreement Value" />
          <SelectField {...field} name="paymentScheduleId" label="Payment Schedule" placeholder="Select payment schedule" lookup={schedules} />
          <TextAreaField
            {...field}
            name="termsAndConditions"
            label="Terms & Conditions"
            placeholder="Enter contractual terms, compliance requirements and special conditions"
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <FileDropzone
              id={`${ID_PREFIX}-signed-copy`}
              label="Signed copy (PDF)"
              hint="PDF only · max 10 MB"
              accept=".pdf,application/pdf"
              acceptedTypes={ACCEPTED_TYPES}
              maxBytes={MAX_ATTACHMENT_BYTES}
              file={signedCopy}
              onChange={setSignedCopy}
              error={form.fieldErrors.attachmentIds}
            />
          </div>
        </div>
      </ModalForm>
    </Modal>
  );
}

export default NewAgreementModal;
