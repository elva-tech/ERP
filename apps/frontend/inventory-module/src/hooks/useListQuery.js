import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads a list through a service call whenever `params` change.
 * Only the most recent request may update state, so a slow response to an
 * earlier search can never overwrite the results of a newer one.
 */
export function useListQuery(fetchList, params) {
  const [state, setState] = useState({ status: "loading", response: null, error: null });
  const latestRequest = useRef(0);
  const paramsKey = JSON.stringify(params);

  const reload = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setState((previous) => ({ ...previous, status: "loading", error: null }));
    try {
      const response = await fetchList(JSON.parse(paramsKey));
      if (requestId === latestRequest.current) {
        setState({ status: "success", response, error: null });
      }
    } catch (err) {
      if (requestId === latestRequest.current) {
        setState({ status: "error", response: null, error: err?.message || "Failed to load data" });
      }
    }
  }, [fetchList, paramsKey]);

  useEffect(() => {
    reload();
    return () => {
      latestRequest.current += 1;
    };
  }, [reload]);

  return {
    status: state.status,
    error: state.error,
    response: state.response,
    data: state.response?.data ?? [],
    reload,
  };
}
