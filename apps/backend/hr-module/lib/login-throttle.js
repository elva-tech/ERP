import { createHash } from "node:crypto";

/**
 * Database-backed login throttling, shared by every app instance that uses
 * the same database (unlike an in-memory counter, which each process would
 * keep separately).
 *
 * Policy (configurable via environment):
 * - LOGIN_MAX_FAILURES (default 5): failed attempts per account within the
 *   window before further attempts for that account are refused. A
 *   successful login resets the account counter.
 * - LOGIN_MAX_FAILURES_PER_IP (default 20): failed attempts per client IP
 *   within the window. Only applied when TRUST_PROXY_HEADERS=true, because
 *   the client IP is otherwise unknown to the route handler and forwarded
 *   headers can be forged when no trusted proxy overwrites them.
 * - LOGIN_WINDOW_MINUTES (default 15).
 *
 * Trade-off: per-account limits let a third party temporarily lock a known
 * email address out for one window. Put a rate-limiting proxy/WAF in front of
 * the app in production for volumetric attacks.
 */

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const LOGIN_LIMITS = {
  maxFailures: positiveInt(process.env.LOGIN_MAX_FAILURES, 5),
  maxFailuresPerIp: positiveInt(process.env.LOGIN_MAX_FAILURES_PER_IP, 20),
  windowMinutes: positiveInt(process.env.LOGIN_WINDOW_MINUTES, 15),
  trustProxyHeaders: process.env.TRUST_PROXY_HEADERS === "true",
};

export function loginIdentifier(email) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function clientIp(request) {
  if (!LOGIN_LIMITS.trustProxyHeaders) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip")) || "";
  return ip.trim().slice(0, 64) || null;
}

/** Serialises attempts for one account inside the caller's transaction. */
export async function lockIdentifier(client, identifierHash) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [identifierHash]);
}

/** Returns the seconds until another attempt is allowed, or 0 when allowed. */
export async function retryAfterSeconds(client, identifierHash, ip) {
  const { maxFailures, maxFailuresPerIp, windowMinutes } = LOGIN_LIMITS;

  const account = await client.query(
    `SELECT COUNT(*)::int AS failures,
            EXTRACT(EPOCH FROM (MIN(attempted_at) + make_interval(mins => $2) - NOW()))::int AS retry_after
     FROM login_attempts
     WHERE identifier_hash = $1 AND succeeded = false
       AND attempted_at > GREATEST(
         NOW() - make_interval(mins => $2),
         COALESCE((SELECT MAX(attempted_at) FROM login_attempts
                   WHERE identifier_hash = $1 AND succeeded = true), '-infinity'::timestamptz)
       )`,
    [identifierHash, windowMinutes]
  );
  if (account.rows[0].failures >= maxFailures) {
    return Math.max(account.rows[0].retry_after, 1);
  }

  if (ip) {
    const byIp = await client.query(
      `SELECT COUNT(*)::int AS failures,
              EXTRACT(EPOCH FROM (MIN(attempted_at) + make_interval(mins => $2) - NOW()))::int AS retry_after
       FROM login_attempts
       WHERE ip_address = $1 AND succeeded = false
         AND attempted_at > NOW() - make_interval(mins => $2)`,
      [ip, windowMinutes]
    );
    if (byIp.rows[0].failures >= maxFailuresPerIp) {
      return Math.max(byIp.rows[0].retry_after, 1);
    }
  }

  return 0;
}

export async function recordAttempt(client, identifierHash, ip, succeeded) {
  await client.query(
    "INSERT INTO login_attempts (identifier_hash, ip_address, succeeded) VALUES ($1, $2, $3)",
    [identifierHash, ip, succeeded]
  );
  await client.query(
    `DELETE FROM login_attempts
     WHERE attempted_at < NOW() - GREATEST(INTERVAL '1 day', make_interval(mins => $1))`,
    [LOGIN_LIMITS.windowMinutes * 2]
  );
}
