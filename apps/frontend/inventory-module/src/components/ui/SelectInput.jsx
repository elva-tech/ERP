import { ChevronDown } from "lucide-react";
import { INPUT_CLASS } from "./formStyles.js";

/**
 * Native select fed by API lookup options.
 * @param {{ id: string, name: string, value: string, placeholder: string,
 *   options: Array<{ value: string, label: string }>, onChange: (event: any) => void,
 *   status?: "loading" | "success" | "error", invalid?: boolean, required?: boolean, disabled?: boolean }} props
 */
function SelectInput({ id, name, value, placeholder, options, onChange, status = "success", invalid, required, disabled }) {
  const isUnavailable = status === "error";
  const isLoading = status === "loading";
  let firstLabel = placeholder;
  if (isLoading) firstLabel = "Loading options…";
  if (isUnavailable) firstLabel = "Options unavailable";

  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled || isLoading || isUnavailable}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`${INPUT_CLASS} cursor-pointer appearance-none pr-9 ${value ? "text-ink" : "text-placeholder"}`}
      >
        <option value="" disabled>
          {firstLabel}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-ink">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export default SelectInput;
