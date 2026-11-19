import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 350;

/**
 * Local text draft that commits its trimmed value to `onCommit` after a pause.
 * An outside change to `value` (e.g. another search box sharing it) replaces the draft.
 */
export function useDebouncedDraft(value, onCommit) {
  const [draft, setDraft] = useState(value);
  const onCommitRef = useRef(onCommit);

  // Keep the latest callback without restarting the debounce when the parent re-renders.
  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  useEffect(() => {
    setDraft((current) => (current.trim() === value ? current : value));
  }, [value]);

  useEffect(() => {
    if (draft.trim() === value) return undefined;
    const timeoutId = window.setTimeout(() => onCommitRef.current(draft.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [draft, value]);

  return [draft, setDraft];
}
