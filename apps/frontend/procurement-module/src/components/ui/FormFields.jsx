import { useRef } from "react";
import FormField from "./FormField.jsx";
import SelectInput from "./SelectInput.jsx";
import { formatIndianMoneyInput, indianMoneyCaret, parseIndianMoneyInput } from "../../lib/formatters.js";
import { INPUT_CLASS, TEXTAREA_CLASS } from "./formStyles.js";

/**
 * Field wrappers bound to a `useFormSubmission` result (`form`).
 * `id` is derived from `idPrefix` + `name` so labels and error messages stay linked.
 */

function fieldProps(form, name, idPrefix) {
  const id = `${idPrefix}-${name}`;
  const error = form.fieldErrors[name];
  return {
    id,
    error,
    controlProps: {
      id,
      name,
      value: form.values[name] ?? "",
      onChange: form.handleChange,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${id}-error` : undefined,
    },
  };
}

export function TextField({ form, name, idPrefix, label, className, required, inputClassName = "", ...inputProps }) {
  const { id, error, controlProps } = fieldProps(form, name, idPrefix);
  return (
    <FormField label={label} htmlFor={id} error={error} required={required} className={className}>
      <input type="text" {...controlProps} {...inputProps} className={`${INPUT_CLASS} ${inputClassName}`} />
    </FormField>
  );
}

export function TextAreaField({ form, name, idPrefix, label, className, required, ...inputProps }) {
  const { id, error, controlProps } = fieldProps(form, name, idPrefix);
  return (
    <FormField label={label} htmlFor={id} error={error} required={required} className={className}>
      <textarea {...controlProps} {...inputProps} className={TEXTAREA_CLASS} />
    </FormField>
  );
}

export function SelectField({ form, name, idPrefix, label, className, required, placeholder, lookup, options }) {
  const { id, error, controlProps } = fieldProps(form, name, idPrefix);
  return (
    <FormField label={label} htmlFor={id} error={error} required={required} className={className}>
      <SelectInput
        id={id}
        name={name}
        value={controlProps.value}
        onChange={controlProps.onChange}
        placeholder={placeholder}
        options={lookup ? lookup.options : options}
        status={lookup ? lookup.status : "success"}
        invalid={Boolean(error)}
      />
    </FormField>
  );
}

function RupeeInput({ children }) {
  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-placeholder">
        ₹
      </span>
      {children}
    </div>
  );
}

/** Decimal amount entered as text and sent to the backend as a decimal string. */
export function MoneyField({ form, name, idPrefix, label, className, required, placeholder = "0.00" }) {
  const { id, error, controlProps } = fieldProps(form, name, idPrefix);
  return (
    <FormField label={label} htmlFor={id} error={error} required={required} className={className}>
      <RupeeInput>
        <input type="text" inputMode="decimal" autoComplete="off" placeholder={placeholder} {...controlProps} className={`${INPUT_CLASS} pl-7`} />
      </RupeeInput>
    </FormField>
  );
}

/**
 * Payment amount shown with Indian grouping while the form stores the comma-free decimal string.
 * Other money fields stay ungrouped.
 */
export function IndianMoneyField({ form, name, idPrefix, label, className, required, placeholder = "0.00" }) {
  const { id, error } = fieldProps(form, name, idPrefix);
  const inputRef = useRef(null);
  const stored = form.values[name] ?? "";
  const display = formatIndianMoneyInput(stored);

  function handleChange(event) {
    const raw = event.target.value;
    const selection = event.target.selectionStart ?? raw.length;
    const significant = raw.slice(0, selection).replace(/[^\d.]/g, "").length;
    const canonical = parseIndianMoneyInput(raw);
    form.setValue(name, canonical);
    const nextCaret = indianMoneyCaret(formatIndianMoneyInput(canonical), significant);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input || document.activeElement !== input) return;
      input.setSelectionRange(nextCaret, nextCaret);
    });
  }

  return (
    <FormField label={label} htmlFor={id} error={error} required={required} className={className}>
      <RupeeInput>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={display}
          onChange={handleChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${INPUT_CLASS} pl-7`}
        />
      </RupeeInput>
    </FormField>
  );
}

export function DateField({ form, name, idPrefix, label, className, required, min }) {
  const { id, error, controlProps } = fieldProps(form, name, idPrefix);
  return (
    <FormField label={label} htmlFor={id} error={error} required={required} className={className}>
      <input
        type="date"
        min={min}
        {...controlProps}
        className={`${INPUT_CLASS} ${controlProps.value ? "text-ink" : "text-placeholder"}`}
      />
    </FormField>
  );
}
