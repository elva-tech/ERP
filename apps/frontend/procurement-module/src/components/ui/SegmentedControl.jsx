import FormField from "./FormField.jsx";

/** Two-or-more option toggle rendered as a radio group (e.g. Replacement / Refund). */
function SegmentedControl({ id, label, value, options, onChange, error }) {
  return (
    <FormField label={label} htmlFor={`${id}-${options[0]?.value}`} error={error}>
      <div role="radiogroup" aria-label={label} className="grid h-[38px] grid-cols-2 gap-1 rounded-md bg-workspace p-[3px]">
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              id={`${id}-${option.value}`}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(option.value)}
              className={`rounded text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy ${
                isActive ? "bg-navy font-semibold text-white" : "text-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </FormField>
  );
}

export default SegmentedControl;
