import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 350;

export function useDebouncedDraft(value, onCommit) {
  const [draft, setDraft] = useState(value);
  const onCommitRef = useRef(onCommit);

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