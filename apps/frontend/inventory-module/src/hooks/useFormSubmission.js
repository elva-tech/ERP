import { useState } from "react";
import { createIdempotencyKey } from "../lib/apiClient.js";

function firstMessages(fieldErrors) {
  return Object.fromEntries(
    Object.entries(fieldErrors ?? {}).map(([field, messages]) => [
      field.replace(/\[(\d+)\]/g, ".$1"),
      Array.isArray(messages) ? messages[0] : String(messages),
    ]),
  );
}

/**
 * Form state for creation modals (matches Procurement modal pattern).
 */
export function useFormSubmission({ initialValues, validate, submit, onSuccess }) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey] = useState(createIdempotencyKey);

  function clearFieldError(name) {
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    clearFieldError(name);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValue(name, value);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const clientErrors = validate ? validate(values) : {};
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setFormError(null);
      event.currentTarget.querySelector("[aria-invalid='true']")?.focus();
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const result = await submit(values, { idempotencyKey });
      setIsSubmitting(false);
      onSuccess(result);
    } catch (error) {
      setIsSubmitting(false);
      setFieldErrors(firstMessages(error?.fieldErrors));
      setFormError(error);
    }
  }

  return { values, setValue, handleChange, handleSubmit, fieldErrors, formError, isSubmitting };
}
