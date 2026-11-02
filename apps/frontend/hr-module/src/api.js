const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const UNAUTHORIZED_EVENT = "hrms:unauthorized";

// A 401 from these means "not signed in (yet)", not "the session expired".
const SESSION_PATHS = [
  "/api/auth/me",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/invitations/lookup",
  "/api/invitations/accept",
];

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    const error = new Error(
      `Could not reach the server at ${API_BASE_URL}. Check that the backend is running.`
    );
    error.status = 0;
    throw error;
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Some successful responses have no JSON body.
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || `Request failed (${response.status})`
    );
    error.status = response.status;
    error.details = data?.errors;
    error.data = data;

    if (
      response.status === 401 &&
      !SESSION_PATHS.some((sessionPath) => path.startsWith(sessionPath))
    ) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw error;
  }

  return data;
}

/** Builds "/path?companyId=1&key=value" skipping empty values. */
export function withQuery(path, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function sendJson(method, path, body) {
  return apiRequest(path, { method, body: JSON.stringify(body) });
}

/** Fetches a protected file with the session cookie and returns it as a Blob. */
export async function apiBlob(path) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  } catch {
    const error = new Error(`Could not reach the server at ${API_BASE_URL}. Check that the backend is running.`);
    error.status = 0;
    throw error;
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      message = (await response.json())?.message || message;
    } catch {
      // Non-JSON error body.
    }
    if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.blob();
}
