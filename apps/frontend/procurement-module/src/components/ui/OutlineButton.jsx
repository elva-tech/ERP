function OutlineButton({ icon: Icon, children, onClick, disabled = false, type = "button", className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[35px] shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface pl-3 pr-3.5 text-[12px] font-semibold leading-4 text-ink transition-colors hover:bg-workspace focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {Icon && <Icon size={16} strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </button>
  );
}

export default OutlineButton;
