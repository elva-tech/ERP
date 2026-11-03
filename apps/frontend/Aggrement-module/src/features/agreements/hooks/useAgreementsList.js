import { useCallback, useEffect, useRef, useState } from "react";
import { listAgreements } from "../services/agreementService.js";
import { MOCK_TENANT_CHANGED_EVENT } from "../../../mock-api/mockStorage.js";

export function useAgreementsList(initialFilters = {}) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState(initialFilters.status || "");
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Listen for mock tenant changes and immediately reload data
  useEffect(() => {
    function handleTenantChange() {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setReloadTrigger((c) => c + 1);
    }
    window.addEventListener(MOCK_TENANT_CHANGED_EVENT, handleTenantChange);
    return () => window.removeEventListener(MOCK_TENANT_CHANGED_EVENT, handleTenantChange);
  }, []);

  const abortControllerRef = useRef(null);

  const fetchAgreements = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    setIsLoading(true);
    setError(null);

    try {
      const response = await listAgreements(
        {
          page: pagination.page,
          pageSize: pagination.pageSize,
          status: statusFilter,
          search: debouncedSearch,
        },
        ac.signal
      );

      setItems(response?.items || []);
      if (response?.pagination) {
        setPagination((prev) => ({
          ...prev,
          ...response.pagination,
        }));
      }
    } catch (err) {
      if (err?.name === "AbortError" || err?.kind === "aborted") return;
      setError(err?.message || "Failed to load agreements.");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.pageSize, statusFilter, debouncedSearch, reloadTrigger]);

  useEffect(() => {
    fetchAgreements();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchAgreements]);

  const setPage = useCallback((newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const setStatus = useCallback((newStatus) => {
    setStatusFilter(newStatus);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const setSearch = useCallback((query) => {
    setSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const reload = useCallback(() => {
    setReloadTrigger((count) => count + 1);
  }, []);

  return {
    items,
    pagination,
    statusFilter,
    searchQuery,
    isLoading,
    error,
    setPage,
    setStatus,
    setSearch,
    reload,
  };
}
