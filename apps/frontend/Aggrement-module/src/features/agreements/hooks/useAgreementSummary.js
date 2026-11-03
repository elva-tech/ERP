import { useCallback, useEffect, useRef, useState } from "react";
import { getAgreementSummary } from "../services/agreementSummaryService.js";
import { MOCK_TENANT_CHANGED_EVENT } from "../../../mock-api/mockStorage.js";

export function useAgreementSummary() {
  const [data, setData] = useState({
    activeCount: 0,
    cumulativeValue: 0,
    completedCount: 0,
    completedPeriodLabel: "FY 25",
    expiredOrPendingRenewalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  const abortRef = useRef(null);

  // Reload when demo tenant switches
  useEffect(() => {
    function handleTenantChange() {
      setReloadCount((c) => c + 1);
    }
    window.addEventListener(MOCK_TENANT_CHANGED_EVENT, handleTenantChange);
    return () => window.removeEventListener(MOCK_TENANT_CHANGED_EVENT, handleTenantChange);
  }, []);

  const loadSummary = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getAgreementSummary(ac.signal);
      if (result) {
        setData(result);
      }
    } catch (err) {
      if (err?.name === "AbortError" || err?.kind === "aborted") return;
      setError(err?.message || "Could not retrieve agreement KPIs.");
    } finally {
      setIsLoading(false);
    }
  }, [reloadCount]);

  useEffect(() => {
    loadSummary();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadSummary]);

  const reload = useCallback(() => {
    setReloadCount((c) => c + 1);
  }, []);

  return {
    data,
    isLoading,
    error,
    reload,
  };
}
