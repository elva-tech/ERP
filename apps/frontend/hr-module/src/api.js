
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = 15000;

export const UNAUTHORIZED_EVENT = "hrms:unauthorized";

const SESSION_PATHS = [
  "/api/auth/me",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/invitations/lookup",
  "/api/invitations/accept",
];

export class ApiError extends Error {
  constructor(message, {
    status = 0,
    code = null,
    requestId = null,
    fieldErrors = {},
    details = null,
    data = null,
    cause = undefined,
  } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.fieldErrors = fieldErrors;
    // Keep the old property for existing callers.
    this.details = details;
    this.data = data;
    if (cause !== undefined) this.cause = cause;
  }
}

function isSessionPath(path) {
  const pathname = path.split("?")[0].replace(/\/+$/, "");
  return SESSION_PATHS.some((sessionPath) => pathname === sessionPath);
}

function getFieldErrors(data) {
  const errors = data?.fieldErrors ?? data?.errors;

  if (Array.isArray(errors)) {
    return errors.reduce((result, item) => {
      if (item?.field) {
        const message = item.message || item.msg || "Invalid value";
        result[item.field] = [
          ...(Array.isArray(result[item.field])
            ? result[item.field]
            : result[item.field]
              ? [result[item.field]]
              : []),
          message,
        ];
      }
      return result;
    }, {});
  }

  return errors && typeof errors === "object" ? errors : {};
}

function createApiError(data, status, requestId = null) {
  const details = data?.errors ?? null;

  return new ApiError(
    data?.message || `Request failed (${status})`,
    {
      status,
      code: data?.code ?? data?.errorCode ?? null,
      requestId: requestId ?? data?.requestId ?? null,
      fieldErrors: getFieldErrors(data),
      details,
      data,
    },
  );
}

function dispatchUnauthorized(path, status) {
  if (status === 401 && !isSessionPath(path)) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

async function fetchWithTimeout(path, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => controller.abort(externalSignal.reason);

  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason);
  } else {
    externalSignal?.addEventListener("abort", abortFromCaller, {
      once: true,
    });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: "include",
    });
  } catch (cause) {
    if (timedOut) {
      throw new ApiError(`Request timed out after ${timeoutMs} ms`, {
        code: "REQUEST_TIMEOUT",
        cause,
      });
    }

    if (externalSignal?.aborted) {
      throw cause;
    }

    throw new ApiError(
      `Could not reach the server at ${API_BASE_URL}. Check that the backend is running.`,
      { code: "NETWORK_ERROR", cause },
    );
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }
}
async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetchWithTimeout(path, {
    ...options,
    headers,
  });

  const data = await readJson(response);
  const requestId = response.headers.get("x-request-id");

  if (!response.ok) {
    dispatchUnauthorized(path, response.status);
    throw createApiError(data, response.status, requestId);
  }

  return data;
}

/** Builds a query string while skipping empty parameters. */
export function withQuery(path, params = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function sendJson(method, path, body, options = {}) {
  const { idempotencyKey, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers || {});

  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }

  return apiRequest(path, {
    ...requestOptions,
    method,
    headers,
    body: JSON.stringify(body),
  });
}

/** Fetches a protected file and returns it as a Blob. */
export async function apiBlob(path, options = {}) {
  const response = await fetchWithTimeout(path, options);

  if (!response.ok) {
    const data = await readJson(response);
    dispatchUnauthorized(path, response.status);

    throw createApiError(
      data,
      response.status,
      response.headers.get("x-request-id"),
    );
  }

  return response.blob();
}
