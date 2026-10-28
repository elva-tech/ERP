import { useCallback } from "react";
import { getLookupOptions } from "../features/lookups/lookupService.js";
import { useAsyncResource } from "./useAsyncResource.js";

/**
 * @param {string} lookupKey
 * @returns {{ options: Array<{ value: string, label: string }>, defaultValue: string,
 *   status: "loading" | "success" | "error" }}
 */
export function useLookupOptions(lookupKey) {
  const load = useCallback((signal) => getLookupOptions(lookupKey, signal), [lookupKey]);
  const resource = useAsyncResource(load, `lookup:${lookupKey}`);
  const data = resource.status === "success" ? resource.data : null;
  const options = Array.isArray(data?.options) ? data.options : [];
  return { options, defaultValue: data?.defaultValue ?? "", status: resource.status };
}

/** Prepends an "All" option to API-supplied filter options. */
export function withAllOption(options, allLabel = "All") {
  return [{ value: "", label: allLabel }, ...options];
}
