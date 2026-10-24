import { useEffect, useMemo, useState } from "react";
import { UNAUTHORIZED_EVENT } from "../../lib/apiClient.js";
import { useAsyncResource } from "../../hooks/useAsyncResource.js";
import { getSession } from "./authService.js";
import { SessionContext } from "./sessionContext.js";

function SessionProvider({ children }) {
  const resource = useAsyncResource(getSession, "session");
  const [expiredAfterLoad, setExpiredAfterLoad] = useState(false);

  useEffect(() => {
    function handleUnauthorized() {
      setExpiredAfterLoad(true);
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const value = useMemo(() => {
    const reload = () => {
      setExpiredAfterLoad(false);
      resource.reload();
    };
    const markSignedOut = () => setExpiredAfterLoad(true);
    if (resource.status === "loading") {
      return { status: "loading", session: null, error: null, reload, markSignedOut };
    }
    if (expiredAfterLoad || resource.error?.kind === "unauthorized") {
      return { status: "unauthenticated", session: null, error: resource.error, reload, markSignedOut };
    }
    if (resource.status === "error") {
      return { status: "unavailable", session: null, error: resource.error, reload, markSignedOut };
    }
    return { status: "authenticated", session: resource.data, error: null, reload, markSignedOut };
  }, [resource, expiredAfterLoad]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export default SessionProvider;
