/**
 * Centralized HTTP client for Agreement Store
 * Strictly handles real backend communications with error normalization,
 * cancellation, timeout, and authentication handling.
 */

import { getApiBaseUrl } from "./env.js";

export const UNAUTHORIZED_EVENT = "agreement:unauthorized";

export class ApiError extends Error {
  /**
   * @param {"not_configured" | "network" | "unauthorized" | "forbidden" | "not_found" | "validation" | "conflict" | "timeout" | "server" | "unavailable" | "invalid_response" | "aborted"} kind
   * @param {string} message
   * @param {{ status?: number, code?: string, fieldErrors?: Record<string, string[]>, requestId?: string, cause?: unknown }} [details]
   */
  constructor(kind, message, details = {}) {
    super(message, { cause: details.cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = details.status ?? null;
    this.code = details.code ?? null;
    this.fieldErrors = details.fieldErrors ?? {};
    this.requestId = details.requestId ?? null;
  }
}

const DEFAULT_MESSAGES = {
  not_configured: "The Agreement API base URL is not configured.",
  network: "Unable to reach the agreement service. Please check your network connection.",
  unauthorized: "Your session has expired. Please sign in again.",
  forbidden: "You do not have permission to perform this action in Agreement Store.",
  not_found: "The requested agreement record was not found.",
  conflict: "This agreement was modified by another user. Please reload and try again.",
  validation: "One or more agreement fields need your attention.",
  timeout: "The server took too long to respond. Please try again.",
  unavailable: "The Agreement service is temporarily unavailable. Try again shortly.",
  server: "A server error occurred while processing the agreement request.",
};

function kindForStatus(status) {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 408) return "timeout";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  return "server";
}

export function createIdempotencyKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Perform an HTTP request against the real Agreement Store backend.
 *
 * @param {string} path Endpoint path e.g. "/procurement/agreements"
 * @param {{
 *   method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
 *   query?: Record<string, unknown>,
 *   body?: unknown,
 *   signal?: AbortSignal,
 *   timeoutMs?: number,
 *   idempotencyKey?: string,
 *   headers?: Record<string, string>,
 *   responseType?: "json" | "blob"
 * }} [options]
 */
export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    query,
    body,
    signal,
    timeoutMs = 30000,
    idempotencyKey,
    headers: customHeaders = {},
    responseType = "json",
  } = options;

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError(
      "not_configured",
      "VITE_API_BASE_URL is not configured. Set VITE_API_BASE_URL or use VITE_API_MODE=mock."
    );
  }

  // Construct URL with query parameters
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${cleanPath}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      if (Array.isArray(v)) {
        v.forEach((item) => url.searchParams.append(k, String(item)));
      } else {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {
    Accept: responseType === "blob" ? "*/*" : "application/json",
    ...customHeaders,
  };

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  // Setup timeout controller
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort("timeout"), timeoutMs);

  function handleAbort() {
    timeoutController.abort(signal?.reason);
  }
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new ApiError("aborted", "Request was aborted.", { cause: signal.reason });
    }
    signal.addEventListener("abort", handleAbort);
  }

  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      credentials: "include",
      signal: timeoutController.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", handleAbort);

    if (error === "timeout" || timeoutController.signal.reason === "timeout") {
      throw new ApiError("timeout", DEFAULT_MESSAGES.timeout, { cause: error });
    }
    if (error?.name === "AbortError" || signal?.aborted) {
      throw new ApiError("aborted", "Request was cancelled.", { cause: error });
    }
    throw new ApiError("network", DEFAULT_MESSAGES.network, { cause: error });
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", handleAbort);
  }

  if (!response.ok) {
    const kind = kindForStatus(response.status);
    let parsed = {};
    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const bodyJson = await response.json();
        parsed = bodyJson?.error ?? bodyJson ?? {};
      } catch {
        // ignore parse failure
      }
    }

    if (kind === "unauthorized") {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(kind, parsed.message || DEFAULT_MESSAGES[kind], {
      status: response.status,
      code: parsed.code,
      fieldErrors: parsed.fieldErrors || parsed.details,
      requestId: parsed.requestId || response.headers.get("x-request-id") || undefined,
    });
  }

  if (response.status === 204) return null;

  if (responseType === "blob") {
    return {
      blob: await response.blob(),
      fileName: parseContentDispositionFileName(response.headers.get("content-disposition")),
    };
  }

  try {
    return await response.json();
  } catch (err) {
    throw new ApiError("invalid_response", "Server returned malformed JSON response.", {
      status: response.status,
      cause: err,
    });
  }
}

function parseContentDispositionFileName(disposition) {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : null;
}

