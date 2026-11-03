import { useEffect, useState } from "react";
import { ArrowLeft, Save, Send, AlertCircle, Loader2 } from "lucide-react";
import {
  TextField,
  DateField,
  SelectField,
  MoneyField,
  TextAreaField,
} from "../components/ui/FormFields.jsx";
import { useAgreementForm } from "../features/agreements/hooks/useAgreementForm.js";
import { listSubcontractorOptions } from "../features/agreements/services/subcontractorLookupService.js";
import { listProjectOptions } from "../features/agreements/services/projectLookupService.js";
import { listPaymentSchedules } from "../features/agreements/services/agreementService.js";
import { useSession } from "../features/auth/sessionContext.js";
import { MOCK_TENANT_CHANGED_EVENT } from "../mock-api/mockStorage.js";

export function CreateAgreementPage({ onNavigateToList }) {
  const { session } = useSession();
  const companyName = session?.tenant?.name || "SB Patil Group";
  const [subcontractorOptions, setSubcontractorOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [paymentScheduleOptions, setPaymentScheduleOptions] = useState([]);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);

  const {
    values,
    errors,
    isSubmitting,
    formError,
    handleChange,
    handleSubmit,
    resetForm,
  } = useAgreementForm({
    onSuccess: () => {
      onNavigateToList();
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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-line pb-4">
        <div>
          <button
            type="button"
            onClick={onNavigateToList}
            className="mb-1 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span>Back to Agreements</span>
          </button>
          <h2 className="text-[20px] font-bold text-ink sm:text-[22px]">
            Create Agreement
          </h2>
          <p className="text-[12px] text-muted">
            Create a new agreement record for review and approval across {companyName}
          </p>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-[13px] text-rose-800"
        >
          <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
          <div className="flex-1 font-medium">{formError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
          <h3 className="border-b border-line/70 pb-2 text-[13px] font-bold uppercase tracking-wider text-muted">
            Basic Information
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="page-title"
              name="title"
              label="Agreement Title"
              value={values.title}
              onChange={(val) => handleChange("title", val)}
              placeholder="Enter agreement title"
              required
              error={errors.title}
              className="sm:col-span-2"
            />
            <SelectField
              id="page-subcontractor"
              name="subcontractorId"
              label="Subcontractor"
              value={values.subcontractorId}
              onChange={(val) => handleChange("subcontractorId", val)}
              options={subcontractorOptions}
              placeholder={isLoadingLookups ? "Loading master records..." : "Select authorized subcontractor"}
              required
              error={errors.subcontractorId}
            />
            <SelectField
              id="page-project"
              name="projectId"
              label="Project / Site"
              value={values.projectId}
              onChange={(val) => handleChange("projectId", val)}
              options={projectOptions}
              placeholder={isLoadingLookups ? "Loading project sites..." : "Select project or site"}
              required
              error={errors.projectId}
            />
          </div>
        </div>

        {/* Section 2: Agreement Details */}
        <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
          <h3 className="border-b border-line/70 pb-2 text-[13px] font-bold uppercase tracking-wider text-muted">
            Agreement Details &amp; Commercials
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateField
              id="page-start-date"
              name="startDate"
              label="Start Date"
              value={values.startDate}
              onChange={(val) => handleChange("startDate", val)}
              required
              error={errors.startDate}
            />
            <DateField
              id="page-end-date"
              name="endDate"
              label="End Date"
              value={values.endDate}
              onChange={(val) => handleChange("endDate", val)}
              min={values.startDate || undefined}
              required
              error={errors.endDate}
            />
            <MoneyField
              id="page-value"
              name="agreementValue"
              label="Agreement Value (INR)"
              value={values.agreementValue}
              onChange={(val) => handleChange("agreementValue", val)}
              placeholder="₹ 0.00"
              required
              error={errors.agreementValue}
            />
            <SelectField
              id="page-payment-schedule"
              name="paymentSchedule"
              label="Payment Schedule"
              value={values.paymentSchedule}
              onChange={(val) => handleChange("paymentSchedule", val)}
              options={paymentScheduleOptions}
              placeholder="Select payment terms"
              error={errors.paymentSchedule}
            />
          </div>
        </div>

        {/* Section 3: Scope & Legal Terms */}
        <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
          <h3 className="border-b border-line/70 pb-2 text-[13px] font-bold uppercase tracking-wider text-muted">
            Scope &amp; Terms
          </h3>
          <div className="mt-4 space-y-4">
            <TextAreaField
              id="page-scope"
              name="scopeOfWork"
              label="Scope of Work"
              value={values.scopeOfWork}
              onChange={(val) => handleChange("scopeOfWork", val)}
              placeholder="Enter deliverables, milestones, and technical parameters..."
              rows={4}
              required
              error={errors.scopeOfWork}
            />
            <TextAreaField
              id="page-terms"
              name="termsAndConditions"
              label="Terms & Conditions"
              value={values.termsAndConditions}
              onChange={(val) => handleChange("termsAndConditions", val)}
              placeholder="Contractual conditions, dispute resolution, defect liabilities..."
              rows={4}
              error={errors.termsAndConditions}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onNavigateToList}
            disabled={isSubmitting}
            className="rounded-lg border border-line bg-surface px-5 py-2.5 text-[13px] font-semibold text-ink-soft hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-dark px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-navy focus-visible:outline-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send size={15} aria-hidden="true" />
                <span>Submit for Approval</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

