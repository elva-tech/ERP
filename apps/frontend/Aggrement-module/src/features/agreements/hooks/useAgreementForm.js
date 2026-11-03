import { useCallback, useRef, useState } from "react";
import { createAgreement } from "../services/agreementService.js";
import { validateNewAgreementForm } from "../schemas/agreementSchema.js";
import { createIdempotencyKey } from "../../../lib/apiClient.js";

export const INITIAL_AGREEMENT_FORM = {
  title: "",
  subcontractorId: "",
  projectId: "",
  startDate: "",
  endDate: "",
  scopeOfWork: "",
  agreementValue: "",
  paymentSchedule: "",
  termsAndConditions: "",
};

export function useAgreementForm({ onSuccess }) {
  const [values, setValues] = useState(INITIAL_AGREEMENT_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Store current idempotency key; reset only on fresh submit or retry with changed data
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const handleChange = useCallback((fieldName, val) => {
    setValues((prev) => ({ ...prev, [fieldName]: val }));
    setIsDirty(true);
    // Clear field-specific error as user types
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const copy = { ...prev };
      delete copy[fieldName];
      return copy;
    });
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();

      // 1. Client Schema Validation
      const fieldValidationErrors = validateNewAgreementForm(values);
      if (Object.keys(fieldValidationErrors).length > 0) {
        setErrors(fieldValidationErrors);
        setFormError("Please resolve the validation errors before submitting.");
        return false;
      }

      setIsSubmitting(true);
      setFormError(null);

      try {
        const created = await createAgreement(values, {
          idempotencyKey: idempotencyKeyRef.current,
        });

        // Generate fresh key for future submissions
        idempotencyKeyRef.current = createIdempotencyKey();
        setIsDirty(false);

        if (onSuccess) {
          onSuccess(created);
        }
        return true;
      } catch (err) {
        // Preserve entered values on failure!
        if (err?.fieldErrors && typeof err.fieldErrors === "object") {
          setErrors(err.fieldErrors);
        }
        setFormError(err?.message || "Failed to create agreement. Please try again.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, onSuccess]
  );

  const resetForm = useCallback(() => {
    setValues(INITIAL_AGREEMENT_FORM);
    setErrors({});
    setFormError(null);
    setIsDirty(false);
    idempotencyKeyRef.current = createIdempotencyKey();
  }, []);

  return {
    values,
    errors,
    isSubmitting,
    formError,
    isDirty,
    handleChange,
    handleSubmit,
    resetForm,
  };
}

