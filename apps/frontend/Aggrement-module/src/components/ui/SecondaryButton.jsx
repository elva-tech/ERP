export function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  icon: Icon,
  size = "md",
  ...props
}) {
  const sizeClasses = {
    sm: "h-8 px-2.5 text-[12px]",
    md: "h-9 px-3.5 text-[13px]",
    lg: "h-10 px-4 text-[14px]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface font-medium text-ink-soft shadow-xs transition-all hover:bg-slate-50 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {Icon && <Icon size={15} className="shrink-0 text-muted" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

