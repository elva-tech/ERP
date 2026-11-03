import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export function FilterDropdown({
  label,
  value,
  options = [],
  onChange,
  className = "",
  prefix = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption
    ? prefix
      ? `${prefix}: ${selectedOption.label}`
      : selectedOption.label
    : label;

  const isActive = value !== "" && value !== undefined && value !== null;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
          isActive
            ? "border-navy/40 bg-navy/5 text-navy font-semibold"
            : "border-line bg-surface text-ink-soft hover:bg-slate-50 hover:text-ink"
        }`}
      >
        <span className="truncate max-w-[200px]">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 min-w-[190px] max-w-[280px] overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-[12px] transition-colors ${
                  isSelected
                    ? "bg-navy/5 font-semibold text-navy"
                    : "text-ink hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check size={14} className="shrink-0 text-navy" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

