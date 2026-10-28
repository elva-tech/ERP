import { useCallback, useEffect, useRef, useState } from "react";

/**
 * @typedef {"loading" | "success" | "error"} ResourceStatus
 */

/**
 * Loads data from a service function and tracks loading/success/error.
 * Re-runs whenever `key` changes (serialize query params into it) or `reload()` is called.
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} load
 * @param {string} key
 * @param {{ enabled?: boolean }} [options]
 * @returns {{ status: ResourceStatus, data: T | null, error: import("../lib/apiClient.js").ApiError | null, reload: () => void }}
 */
export function useAsyncResource(load, key, options = {}) {
  const { enabled = true } = options;
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState({ requestKey: null, data: null, error: null });
  const loadRef = useRef(load);
  const requestKey = `${key}::${reloadToken}`;

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    loadRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ requestKey, data, error: null });
      },
      (error) => {
        if (!controller.signal.aborted && error?.kind !== "aborted") {
          setResult({ requestKey, data: null, error });
        }
      },
    );
    return () => controller.abort();
  }, [requestKey, enabled]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  if (!enabled || result.requestKey !== requestKey) {
    return { status: "loading", data: null, error: null, reload };
  }
  return {
    status: result.error ? "error" : "success",
    data: result.data,
    error: result.error,
    reload,
  };
}
