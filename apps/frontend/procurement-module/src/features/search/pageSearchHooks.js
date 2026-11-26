import { useContext } from "react";
import { PageSearchContext } from "./pageSearchState.js";

export function usePageSearchField() {
  const context = useContext(PageSearchContext);
  if (!context) throw new Error("usePageSearchField requires PageSearchProvider.");
  return context;
}

/** Debounced header query for list screens; returns an empty string when page search is disabled on the page. */
export function usePageSearchQuery(enabled) {
  const context = useContext(PageSearchContext);
  if (!enabled || !context) return "";
  return context.debouncedQuery.trim();
}