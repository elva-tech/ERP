
const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];

const CONFIGURED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Production: only ALLOWED_ORIGINS. Development: local defaults plus ALLOWED_ORIGINS. */
export const ALLOWED_ORIGINS =
  process.env.NODE_ENV === "production"
    ? CONFIGURED_ORIGINS
    : [...new Set([...DEV_ORIGINS, ...CONFIGURED_ORIGINS])];

/**
 * Returns true if the request's origin is the backend itself or an
 * explicitly allowed frontend origin (e.g. the Vite dev server).
 * Requests without an Origin header are rejected for state-changing methods.
 */
export function isSafeRequestOrigin(request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    if (new URL(origin).origin === new URL(request.url).origin) {
      return true;
    }
  } catch {
    return false;
  }

  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * @deprecated Use isSafeRequestOrigin instead.
 */
export function isSameOriginRequest(request) {
  return isSafeRequestOrigin(request);
}
