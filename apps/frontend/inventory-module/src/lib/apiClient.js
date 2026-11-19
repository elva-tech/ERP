import { getApiBaseUrl, isMockMode } from "./apiConfig.js";

/**
 * Event dispatched when any request encounters a 401 Unauthorized status.
 */
export const UNAUTHORIZED_EVENT = "inventory:unauthorized";

const JSON_CONTENT_TYPE = /application\/(?:[\w.+-]+\+)?json/i;
const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  /**
   * @param {string} kind
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

function kindForStatus(status) {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  return "server";
}

const DEFAULT_MESSAGES = {
  unauthorized: "Your session has expired. Please sign in again.",
  forbidden: "You do not have permission to perform this inventory action.",
  not_found: "The requested inventory record was not found.",
  conflict: "This record was modified by another transaction. Please refresh and retry.",
  validation: "The submitted inventory transaction contains invalid data.",
  unavailable: "The inventory service is temporarily unavailable.",
  server: "The inventory server encountered an internal error.",
};

function buildUrl(path, query) {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
      } else {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function parseErrorBody(response) {
  if (!JSON_CONTENT_TYPE.test(response.headers.get("content-type") ?? "")) return {};
  try {
    const body = await response.json();
    const error = body?.error ?? body;
    return {
      code: typeof error?.code === "string" ? error.code : undefined,
      message: typeof error?.message === "string" ? error.message : undefined,
      fieldErrors: error?.fieldErrors && typeof error.fieldErrors === "object" ? error.fieldErrors : undefined,
      requestId: typeof error?.requestId === "string" ? error.requestId : undefined,
    };
  } catch {
    return {};
  }
}

let mockAdapterInstance = null;

export function registerMockAdapter(adapter) {
  mockAdapterInstance = adapter;
}

/**
 * Central API Request function.
 *
 * @param {string} path - Endpoint path, e.g. "/items" or "/inward"
 * @param {Object} options
 * @param {"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} [options.method="GET"]
 * @param {Record<string, unknown>} [options.query]
 * @param {unknown} [options.body]
 * @param {AbortSignal} [options.signal]
 * @param {string} [options.idempotencyKey]
 * @param {number} [options.timeoutMs]
 */
export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    query,
    body,
    signal,
    idempotencyKey,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  // If in Mock Mode, route through the dedicated mock testing adapter
  if (isMockMode()) {
    if (!mockAdapterInstance) {
      const { mockApiAdapter } = await import("../mock-api/mockApiAdapter.js");
      registerMockAdapter(mockApiAdapter);
    }
    return mockAdapterInstance.handleRequest(path, {
      method,
      query,
      body,
      signal,
      idempotencyKey,
    });
  }

  // --- Real Mode: strict HTTP transport without fallback to mock ---
  const headers = {
    Accept: "application/json",
  };

  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  // Timeout controller
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error("Request timed out"));
  }, timeoutMs);

  // Link signal if provided
  let activeSignal = timeoutController.signal;
  if (signal) {
    signal.addEventListener("abort", () => timeoutController.abort(signal.reason));
  }

  let response;
  try {
    const fullUrl = buildUrl(path, query);
    response = await fetch(fullUrl, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      credentials: "include",
      signal: activeSignal,
    });
  } catch (error) {
    if (error?.name === "AbortError" || activeSignal.aborted) {
      if (timeoutController.signal.aborted && !signal?.aborted) {
        throw new ApiError("timeout", `Request timed out after ${timeoutMs}ms.`);
      }
      throw new ApiError("aborted", "Request was cancelled.", { cause: error });
    }
    throw new ApiError(
      "network",
      "Unable to reach the Inventory backend service. Please check your network connection.",
      { cause: error }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const kind = kindForStatus(response.status);
    const parsed = await parseErrorBody(response);

    if (kind === "unauthorized") {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(kind, parsed.message ?? DEFAULT_MESSAGES[kind], {
      status: response.status,
      code: parsed.code,
      fieldErrors: parsed.fieldErrors,
      requestId: parsed.requestId ?? response.headers.get("x-request-id") ?? undefined,
    });
  }

  if (response.status === 204) {
    return null;
  }

  if (!JSON_CONTENT_TYPE.test(response.headers.get("content-type") ?? "")) {
    throw new ApiError("invalid_response", "The server returned an unexpected non-JSON response.", {
      status: response.status,
    });
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiError("invalid_response", "The server returned malformed JSON data.", {
      status: response.status,
      cause: error,
    });
  }
}

export function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

