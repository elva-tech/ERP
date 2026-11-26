function FormField({ label, htmlFor, error, required = false, className = "", children }) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold leading-4 text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="text-brand">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={errorId} className="text-[11px] leading-[14px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
