import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageSearchQuery } from "../features/search/pageSearchHooks.js";
import { DEFAULT_PAGE_SIZE, normalizePage } from "../lib/apiTypes.js";
import { useAsyncResource } from "./useAsyncResource.js";

/**
 * Server-driven list state: filters and page live here, results come from the API.
 * Changing any filter resets to page 1. Nothing is filtered or paginated locally.
 *
 * @template T
 * @param {(query: Record<string, unknown>, signal: AbortSignal) => Promise<import("../lib/apiTypes.js").PaginatedResponse<T>>} listFn
 * @param {Record<string, string>} initialFilters
 * @param {{ pageSize?: number, pageSearch?: boolean, searchFilterKey?: string }} [options]
 */
export function useServerList(listFn, initialFilters, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE, pageSearch = false, searchFilterKey = "search" } = options;
  const headerSearch = usePageSearchQuery(pageSearch);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const previousHeaderSearch = useRef(headerSearch);

  useEffect(() => {
    if (!pageSearch || previousHeaderSearch.current === headerSearch) return;
    previousHeaderSearch.current = headerSearch;
    setPage(1);
  }, [headerSearch, pageSearch]);

  const resolvedFilters = useMemo(() => {
    if (!pageSearch) return filters;
    return { ...filters, [searchFilterKey]: headerSearch };
  }, [filters, headerSearch, pageSearch, searchFilterKey]);

  const query = useMemo(() => ({ ...resolvedFilters, page, pageSize }), [page, pageSize, resolvedFilters]);
  const queryKey = JSON.stringify(query);

  const load = useCallback((signal) => listFn(JSON.parse(queryKey), signal), [listFn, queryKey]);
  const resource = useAsyncResource(load, queryKey);
  const result = resource.status === "success" ? normalizePage(resource.data) : null;

  const setFilter = useCallback((name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }, []);

  return {
    filters: resolvedFilters,
    setFilter,
    page: result?.pagination.page ?? page,
    setPage,
    items: result?.items ?? [],
    pagination: result?.pagination ?? null,
    resource,
  };
}