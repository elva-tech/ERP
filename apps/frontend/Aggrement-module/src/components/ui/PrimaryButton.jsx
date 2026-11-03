export function PrimaryButton({
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
    sm: "h-8 px-3 text-[12px]",
    md: "h-9 px-4 text-[13px]",
    lg: "h-10 px-5 text-[14px]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-navy-dark font-medium text-white shadow-sm transition-all hover:bg-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} className="shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

