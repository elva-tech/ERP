import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Modal } from "../../../components/ui/Modal.jsx";
import {
  DateField,
  MoneyField,
  SelectField,
  TextAreaField,
  TextField,
} from "../../../components/ui/FormFields.jsx";
import { useAgreementForm } from "../hooks/useAgreementForm.js";
import { listSubcontractorOptions } from "../services/subcontractorLookupService.js";
import { listProjectOptions } from "../services/projectLookupService.js";
import { listPaymentSchedules } from "../services/agreementService.js";
import { MOCK_TENANT_CHANGED_EVENT } from "../../../mock-api/mockStorage.js";

export function NewAgreementModal({ onClose, onCreated }) {
  const [subcontractorOptions, setSubcontractorOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [paymentScheduleOptions, setPaymentScheduleOptions] = useState([]);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);

  const {
    values,
    errors,
    isSubmitting,
    formError,
    isDirty,
    handleChange,
    handleSubmit,
    resetForm,
  } = useAgreementForm({
    onSuccess: (newAgreement) => {
      onCreated(newAgreement);
    },
  });

  useEffect(() => {
    let isMounted = true;
    async function loadLookups() {
      setIsLoadingLookups(true);
      try {
        const [subs, projs, schedules] = await Promise.all([
          listSubcontractorOptions(),
          listProjectOptions(),
          listPaymentSchedules(),
        ]);
        if (isMounted) {
          setSubcontractorOptions(subs || []);
          setProjectOptions(projs || []);
          setPaymentScheduleOptions(schedules || []);
        }
      } catch {
        // Lookups fallback gracefully
      } finally {
        if (isMounted) setIsLoadingLookups(false);
      }
    }
    loadLookups();

    function handleTenantChange() {
      loadLookups();
      resetForm();
    }
    window.addEventListener(MOCK_TENANT_CHANGED_EVENT, handleTenantChange);

    return () => {
      isMounted = false;
      window.removeEventListener(MOCK_TENANT_CHANGED_EVENT, handleTenantChange);
    };
  }, [resetForm]);

  return (
    <Modal
      title="New Agreement"
      description="Define the commercial scope, schedule, and contractual terms for a subcontract."
      onClose={onClose}
      isDirty={isDirty}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} noValidate>
        {formError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800"
          >
            <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
          {/* 1. Agreement Title */}
          <TextField
            id="agreement-title"
            name="title"
            label="Agreement Title"
            value={values.title}
            onChange={(val) => handleChange("title", val)}
            placeholder="e.g. Pune Metro Overhead Traction EPC Agreement"
            required
            error={errors.title}
            autoFocus
            className="sm:col-span-2"
          />

          {/* 2. Subcontractor */}
          <SelectField
            id="agreement-subcontractor"
            name="subcontractorId"
            label="Subcontractor"
            value={values.subcontractorId}
            onChange={(val) => handleChange("subcontractorId", val)}
            options={subcontractorOptions}
            placeholder={isLoadingLookups ? "Loading master records..." : "Select authorized subcontractor"}
            required
            error={errors.subcontractorId}
            disabled={isLoadingLookups}
          />

          {/* 3. Project */}
          <SelectField
            id="agreement-project"
            name="projectId"
            label="Project / Site"
            value={values.projectId}
            onChange={(val) => handleChange("projectId", val)}
            options={projectOptions}
            placeholder={isLoadingLookups ? "Loading project sites..." : "Select project or site"}
            required
            error={errors.projectId}
            disabled={isLoadingLookups}
          />

          {/* 4. Start Date */}
          <DateField
            id="agreement-start-date"
            name="startDate"
            label="Start Date"
            value={values.startDate}
            onChange={(val) => handleChange("startDate", val)}
            required
            error={errors.startDate}
          />

          {/* 5. End Date */}
          <DateField
            id="agreement-end-date"
            name="endDate"
            label="End Date"
            value={values.endDate}
            onChange={(val) => handleChange("endDate", val)}
            min={values.startDate || undefined}
            required
            error={errors.endDate}
          />

          {/* 6. Scope of Work */}
          <TextAreaField
            id="agreement-scope"
            name="scopeOfWork"
            label="Scope of Work"
            value={values.scopeOfWork}
            onChange={(val) => handleChange("scopeOfWork", val)}
            placeholder="Describe contractual inclusions, deliverables, milestones, and boundaries..."
            rows={3}
            required
            error={errors.scopeOfWork}
            className="sm:col-span-2"
          />

          {/* 7. Agreement Value */}
          <MoneyField
            id="agreement-value"
            name="agreementValue"
            label="Agreement Value (INR)"
            value={values.agreementValue}
            onChange={(val) => handleChange("agreementValue", val)}
            placeholder="e.g. 48500000"
            required
            error={errors.agreementValue}
          />

          {/* 8. Payment Schedule */}
          <SelectField
            id="agreement-payment-schedule"
            name="paymentSchedule"
            label="Payment Schedule"
            value={values.paymentSchedule}
            onChange={(val) => handleChange("paymentSchedule", val)}
            options={paymentScheduleOptions}
            placeholder="Select payment schedule"
            error={errors.paymentSchedule}
          />

          {/* 9. Terms & Conditions */}
          <TextAreaField
            id="agreement-terms"
            name="termsAndConditions"
            label="Terms & Conditions"
            value={values.termsAndConditions}
            onChange={(val) => handleChange("termsAndConditions", val)}
            placeholder="Specify defect liability, retention % and legal terms..."
            rows={3}
            error={errors.termsAndConditions}
            className="sm:col-span-2"
          />
        </div>

        {/* Form Actions Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line/70 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-soft hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-dark px-5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-navy focus-visible:outline-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            <span>{isSubmitting ? "Creating Agreement..." : "Create Agreement"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

