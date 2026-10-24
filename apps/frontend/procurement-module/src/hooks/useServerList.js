import { useCallback, useState } from "react";
import { DEFAULT_PAGE_SIZE, normalizePage } from "../lib/apiTypes.js";
import { useAsyncResource } from "./useAsyncResource.js";

/**
 * Server-driven list state: filters and page live here, results come from the API.
 * Changing any filter resets to page 1. Nothing is filtered or paginated locally.
 *
 * @template T
 * @param {(query: Record<string, unknown>, signal: AbortSignal) => Promise<import("../lib/apiTypes.js").PaginatedResponse<T>>} listFn
 * @param {Record<string, string>} initialFilters
 * @param {{ pageSize?: number }} [options]
 */
export function useServerList(listFn, initialFilters, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE } = options;
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const query = { ...filters, page, pageSize };
  const queryKey = JSON.stringify(query);

  const load = useCallback((signal) => listFn(JSON.parse(queryKey), signal), [listFn, queryKey]);
  const resource = useAsyncResource(load, queryKey);
  const result = resource.status === "success" ? normalizePage(resource.data) : null;

  const setFilter = useCallback((name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }, []);

  return {
    filters,
    setFilter,
    page: result?.pagination.page ?? page,
    setPage,
    items: result?.items ?? [],
    pagination: result?.pagination ?? null,
    resource,
  };
}
