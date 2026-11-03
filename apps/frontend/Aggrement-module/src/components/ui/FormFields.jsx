export function FieldLabel({ label, required = false, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-[12px] font-semibold text-ink-soft">
      {label}
      {required && <span className="ml-1 text-brand">*</span>}
    </label>
  );
}

export function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>;
}

export function TextField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  className = "",
  autoFocus = false,
}) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} htmlFor={id || name} />
      <input
        type="text"
        id={id || name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`mt-1.5 w-full rounded-lg border bg-surface px-3 py-2 text-[13px] text-ink transition-colors placeholder:text-muted/60 focus:outline-none focus:ring-1 ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
            : "border-line focus:border-navy focus:ring-navy/20"
        } disabled:bg-slate-100 disabled:opacity-60`}
      />
      <FieldError error={error} />
    </div>
  );
}

export function DateField({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  error,
  min,
  max,
  className = "",
}) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} htmlFor={id || name} />
      <input
        type="date"
        id={id || name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className={`mt-1.5 w-full rounded-lg border bg-surface px-3 py-2 text-[13px] text-ink transition-colors focus:outline-none focus:ring-1 ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
            : "border-line focus:border-navy focus:ring-navy/20"
        }`}
      />
      <FieldError error={error} />
    </div>
  );
}

export function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  required = false,
  error,
  disabled = false,
  className = "",
}) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} htmlFor={id || name} />
      <select
        id={id || name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`mt-1.5 w-full rounded-lg border bg-surface px-3 py-2 text-[13px] text-ink transition-colors focus:outline-none focus:ring-1 ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
            : "border-line focus:border-navy focus:ring-navy/20"
        } disabled:bg-slate-100 disabled:opacity-60`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} {opt.subtext ? `(${opt.subtext})` : ""}
          </option>
        ))}
      </select>
      <FieldError error={error} />
    </div>
  );
}

export function MoneyField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = "0.00",
  currencySymbol = "₹",
  required = false,
  error,
  className = "",
}) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} htmlFor={id || name} />
      <div className="relative mt-1.5 flex items-center">
        <span className="pointer-events-none absolute left-3 font-semibold text-muted">
          {currencySymbol}
        </span>
        <input
          type="text"
          id={id || name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border bg-surface pl-8 pr-3 py-2 text-[13px] font-medium text-ink transition-colors placeholder:text-muted/60 focus:outline-none focus:ring-1 ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-line focus:border-navy focus:ring-navy/20"
          }`}
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function TextAreaField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  error,
  className = "",
}) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} htmlFor={id || name} />
      <textarea
        id={id || name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`mt-1.5 w-full rounded-lg border bg-surface px-3 py-2 text-[13px] text-ink transition-colors placeholder:text-muted/60 focus:outline-none focus:ring-1 ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
            : "border-line focus:border-navy focus:ring-navy/20"
        }`}
      />
      <FieldError error={error} />
    </div>
  );
}

