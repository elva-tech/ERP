import { useEffect, useMemo } from "react";
import { useDebouncedDraft } from "../../hooks/useDebouncedDraft.js";
import { PageSearchContext } from "./pageSearchState.js";

export function PageSearchProvider({ activePath, children }) {
  const { draft, setDraft, debounced, clear } = useDebouncedDraft("", 320);

  useEffect(() => {
    clear();
  }, [activePath, clear]);

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      debouncedQuery: debounced,
      clear,
    }),
    [draft, setDraft, debounced, clear],
  );

  return <PageSearchContext.Provider value={value}>{children}</PageSearchContext.Provider>;
}