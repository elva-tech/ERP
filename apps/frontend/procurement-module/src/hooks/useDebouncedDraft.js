import { useCallback, useEffect, useState } from "react";

/** Keeps immediate input state and a debounced copy for network-backed lookups. */
export function useDebouncedDraft(initialValue = "", delayMs = 320) {
  const [draft, setDraft] = useState(initialValue);
  const [debounced, setDebounced] = useState(initialValue);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(draft), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [draft, delayMs]);

  const clear = useCallback(() => {
    setDraft("");
    setDebounced("");
  }, []);

  return { draft, setDraft, debounced, clear };
}