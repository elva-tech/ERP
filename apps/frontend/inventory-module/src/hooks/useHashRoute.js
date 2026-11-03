import { useCallback, useMemo, useSyncExternalStore } from "react";

function subscribeToHash(onChange) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash() {
  return window.location.hash.replace(/^#/, "");
}

/**
 * Hash routing: `#/supplier-ledger/detail?supplierId=abc`.
 * Returns the matched path (or `null` when unknown) and the query parameters.
 */
export function useHashRoute(knownPaths, fallbackPath) {
  const hash = useSyncExternalStore(subscribeToHash, readHash);

  const route = useMemo(() => {
    const [rawPath, rawQuery = ""] = hash.split("?");
    const path = rawPath || fallbackPath;
    return {
      path: knownPaths.includes(path) ? path : null,
      requestedPath: path,
      query: new URLSearchParams(rawQuery),
    };
  }, [hash, knownPaths, fallbackPath]);

  const navigate = useCallback((path, query) => {
    const search = query ? new URLSearchParams(query).toString() : "";
    window.location.hash = search ? `${path}?${search}` : path;
  }, []);

  return { ...route, navigate };
}

export function buildHref(path, query) {
  const search = query ? new URLSearchParams(query).toString() : "";
  return `#${search ? `${path}?${search}` : path}`;
}
