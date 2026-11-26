import { useEffect, useState } from "react";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 350;

/** Toolbar search box; the debounced term is sent to the server, nothing is filtered locally. */
function SearchInput({ value, onSearch, onDraftChange, placeholder, label, className = "" }) {
  const synced = Boolean(onDraftChange);
  const [localDraft, setLocalDraft] = useState(value);
  const draft = synced ? value : localDraft;

  useEffect(() => {
    if (synced) return undefined;
    if (draft.trim() === value) return undefined;
    const timeoutId = window.setTimeout(() => onSearch(draft.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [draft, synced, value, onSearch]);

  function handleChange(event) {
    const next = event.target.value;
    if (synced) onDraftChange(next);
    else setLocalDraft(next);
  }

  return (
    <label
      className={`flex h-[35px] items-center gap-2 rounded-md border border-line bg-surface px-3 text-muted focus-within:border-muted focus-within:ring-2 focus-within:ring-navy/15 ${className}`}
    >
      <Search size={15} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={draft}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-muted"
      />
    </label>
  );
}

export default SearchInput;