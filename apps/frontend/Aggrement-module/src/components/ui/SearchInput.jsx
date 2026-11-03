import { Search, X } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  size = "md",
}) {
  const sizeClasses = {
    sm: "h-8 text-[12px] pl-8 pr-7",
    md: "h-9 text-[13px] pl-9 pr-8",
    lg: "h-10 text-[14px] pl-10 pr-9",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={iconSizes[size] || 16}
        className="pointer-events-none absolute left-3 text-muted"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-line bg-surface text-ink transition-colors placeholder:text-muted/70 focus:border-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-navy/20 ${sizeClasses[size] || sizeClasses.md}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 grid size-5 place-items-center rounded-full text-muted hover:bg-slate-100 hover:text-ink"
        >
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

