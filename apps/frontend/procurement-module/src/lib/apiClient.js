/**
 * Shared HTTP client for the Procurement frontend.
 *
 * Every request goes to the real backend configured by `VITE_API_BASE_URL`.
 * There are no mock responses or fallback data: when the backend is missing,
 * unreachable, or returns an error, callers receive an `ApiError`.
 */

/**
 * @typedef {"not_configured" | "network" | "unauthorized" | "forbidden" | "not_found" |
 *   "validation" | "conflict" | "server" | "unavailable" | "invalid_response" | "aborted"} ApiErrorKind
 */

/**
 * @typedef {Object} ApiErrorBody
 * @property {string} [code]
 * @property {string} [message]
 * @property {Record<string, string[]>} [fieldErrors]
 * @property {string} [requestId]
 */

export const UNAUTHORIZED_EVENT = "procurement:unauthorized";

const JSON_CONTENT_TYPE = /application\/(?:[\w.+-]+\+)?json/i;

export class ApiError extends Error {
  /**
   * @param {ApiErrorKind} kind
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

function readBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  return typeof configured === "string" ? configured.trim().replace(/\/+$/, "") : "";
}

export function isApiConfigured() {
  return readBaseUrl() !== "";
}

function buildUrl(path, query) {
  const url = new URL(`${readBaseUrl()}${path}`, window.location.origin);
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
  forbidden: "You do not have permission to perform this action.",
  not_found: "The requested record or service was not found.",
  conflict: "This record was changed by someone else. Reload and try again.",
  validation: "Some fields need attention.",
  unavailable: "The procurement service is temporarily unavailable.",
  server: "The server could not complete the request.",
};

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

/**
 * @param {string} path Path relative to `VITE_API_BASE_URL`, e.g. `/suppliers`.
 * @param {{
 *   method?: string,
 *   query?: Record<string, unknown>,
 *   body?: unknown,
 *   signal?: AbortSignal,
 *   idempotencyKey?: string,
 *   responseType?: "json" | "blob",
 * }} [options]
 */
export async function apiRequest(path, options = {}) {
  const { method = "GET", query, body, signal, idempotencyKey, responseType = "json" } = options;

  if (!isApiConfigured()) {
    throw new ApiError(
      "not_configured",
      "The procurement API is not configured for this environment.",
    );
  }

  const headers = { Accept: responseType === "blob" ? "*/*" : "application/json" };
  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      credentials: "include",
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new ApiError("aborted", "Request cancelled.", { cause: error });
    throw new ApiError("network", "Unable to reach the procurement service. Check your connection.", {
      cause: error,
    });
  }

  if (!response.ok) {
    const kind = kindForStatus(response.status);
    const parsed = await parseErrorBody(response);
    if (kind === "unauthorized") window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    throw new ApiError(kind, parsed.message ?? DEFAULT_MESSAGES[kind], {
      status: response.status,
      code: parsed.code,
      fieldErrors: parsed.fieldErrors,
      requestId: parsed.requestId ?? response.headers.get("x-request-id") ?? undefined,
    });
  }

  if (responseType === "blob") {
    return {
      blob: await response.blob(),
      fileName: readFileName(response.headers.get("content-disposition")),
    };
  }

  if (response.status === 204) return null;

  if (!JSON_CONTENT_TYPE.test(response.headers.get("content-type") ?? "")) {
    throw new ApiError("invalid_response", "The server returned an unexpected response.", {
      status: response.status,
    });
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiError("invalid_response", "The server returned malformed data.", {
      status: response.status,
      cause: error,
    });
  }
}

function readFileName(contentDisposition) {
  if (!contentDisposition) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
  return match ? decodeURIComponent(match[1]) : null;
}

export function createIdempotencyKey() {
  return crypto.randomUUID();
}
