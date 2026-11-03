import { useEffect, useState, useCallback, useMemo } from "react";
import { getSession } from "./authService.js";
import { SessionContext } from "./sessionContext.js";
import { UNAUTHORIZED_EVENT } from "../../lib/apiClient.js";
import { isMockMode } from "../../lib/env.js";
import { mockStore, MOCK_TENANT_CHANGED_EVENT } from "../../mock-api/mockStorage.js";

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "authenticated" | "unauthenticated" | "error"
  const [error, setError] = useState(null);
  const [activeTenantId, setActiveTenantId] = useState(
    isMockMode() ? mockStore.getActiveTenantId() : ""
  );

  const isMock = isMockMode();

  const loadSession = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await getSession();
      setSession(data);
      setStatus("authenticated");
      if (isMock) {
        setActiveTenantId(mockStore.getActiveTenantId());
      }
    } catch (err) {
      if (err?.kind === "unauthorized" || err?.status === 401) {
        setStatus("unauthenticated");
        setSession(null);
      } else {
        setStatus("error");
        setError(err?.message || "Failed to establish session.");
      }
    }
  }, [isMock]);

  useEffect(() => {
    loadSession();

    function handleUnauthorized() {
      setStatus("unauthenticated");
      setSession(null);
    }

    function handleMockTenantChange(e) {
      if (isMock) {
        setActiveTenantId(e.detail?.tenantId || mockStore.getActiveTenantId());
        loadSession();
      }
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    if (isMock) {
      window.addEventListener(MOCK_TENANT_CHANGED_EVENT, handleMockTenantChange);
    }

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
      if (isMock) {
        window.removeEventListener(MOCK_TENANT_CHANGED_EVENT, handleMockTenantChange);
      }
    };
  }, [loadSession, isMock]);

  const switchMockTenant = useCallback(
    (newTenantId) => {
      if (!isMock) {
        console.warn("Tenant switching is only available in Mock Mode.");
        return;
      }
      mockStore.setActiveTenant(newTenantId);
      // Event triggers state reload automatically
    },
    [isMock]
  );

  const contextValue = useMemo(
    () => ({
      status,
      session,
      error,
      isMock,
      activeTenantId,
      switchMockTenant,
      reload: loadSession,
    }),
    [status, session, error, isMock, activeTenantId, switchMockTenant, loadSession]
  );

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export default SessionProvider;

