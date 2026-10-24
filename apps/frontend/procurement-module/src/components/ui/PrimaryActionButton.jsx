import { Plus } from "lucide-react";

function PrimaryActionButton({ children, onClick, icon: Icon = Plus, disabled = false, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex h-[31px] shrink-0 items-center gap-1.5 rounded-md bg-brand pl-3.5 pr-4 text-[12px] font-semibold leading-4 text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand"
    >
      <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
      {children}
    </button>
  );
}

export default PrimaryActionButton;
