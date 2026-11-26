import { Search, X } from "lucide-react";
import { usePageSearchField } from "../../features/search/pageSearchHooks.js";

function panelClass(variant) {
  if (variant === "ledger-detail") {
    return "hidden h-[34px] w-[240px] items-center gap-2 rounded-md bg-[#f1f3f5] px-3 text-[#4b5563] focus-within:ring-2 focus-within:ring-navy/15 md:flex";
  }
  return "hidden h-9 w-[240px] items-center gap-2 rounded-full border border-line bg-workspace px-3 text-muted focus-within:border-muted md:flex";
}

function PageSearchField({ placeholder, variant = "default" }) {
  const { draft, setDraft, clear } = usePageSearchField();

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      clear();
      event.currentTarget.blur();
    }
  }

  return (
    <label className={panelClass(variant)}>
      <Search size={16} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
      <span className="sr-only">Search current screen</span>
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-muted"
        autoComplete="off"
      />
      {draft && (
        <button
          type="button"
          onClick={() => clear()}
          className="grid size-5 shrink-0 place-items-center rounded text-muted hover:text-ink"
          aria-label="Clear search"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </label>
  );
}

export default PageSearchField;