import { createContext, useContext, useMemo, useState } from "react";

const PageSearchContext = createContext(null);

/** Holds the keyword typed in the header search; mount with `key` per route so it resets on navigation. */
export function PageSearchProvider({ children }) {
  const [search, setSearch] = useState("");
  const value = useMemo(() => ({ search, setSearch }), [search]);
  return <PageSearchContext.Provider value={value}>{children}</PageSearchContext.Provider>;
}

const NO_PROVIDER = { search: "", setSearch: () => {} };

export function usePageSearch() {
  return useContext(PageSearchContext) ?? NO_PROVIDER;
}