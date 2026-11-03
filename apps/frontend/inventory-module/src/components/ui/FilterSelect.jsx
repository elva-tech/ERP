import { ChevronDown } from "lucide-react";

/**
 * Compact "Label: Value" select used in page toolbars.
 * @param {{ label: string, value: string, options: Array<{ value: string, label: string }>,
 *   onChange: (value: string) => void, disabled?: boolean, icon?: import("react").ComponentType<any> }} props
 */
function FilterSelect({ label, value, options, onChange, disabled = false, icon: Icon = ChevronDown }) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className={`relative inline-flex h-[31px] items-center gap-2 rounded-md border border-line bg-surface pl-3 pr-2.5 text-[12px] leading-4 text-muted focus-within:border-muted focus-within:ring-2 focus-within:ring-navy/15 ${
        disabled ? "opacity-60" : "hover:border-[#cbd5e1]"
      }`}
    >
      <span aria-hidden="true" className="whitespace-nowrap">
        {label}: {selectedOption?.label ?? "—"}
      </span>
      <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default FilterSelect;
