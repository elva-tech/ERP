import { createHash } from "node:crypto";
import { clientIp } from "@/lib/login-throttle";

/**
 * Database-backed rate limiting for public company self-registration, shared
 * by every app instance. Every well-formed attempt counts, whether or not it
 * succeeds, so the endpoint cannot be used to probe or flood at speed.
 *
 * Policy (configurable via environment), per REGISTRATION_WINDOW_MINUTES
 * (default 60):
 * - REGISTRATION_MAX_PER_EMAIL (default 3) attempts for one email address;
 * - REGISTRATION_MAX_PER_IP (default 5) attempts per client IP, only when
 *   TRUST_PROXY_HEADERS=true (see lib/login-throttle.js);
 * - REGISTRATION_MAX_TOTAL (default 50) attempts in total, a ceiling that
 *   holds even when client IPs are unknown.
 */

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const REGISTRATION_LIMITS = {
  maxPerEmail: positiveInt(process.env.REGISTRATION_MAX_PER_EMAIL, 3),
  maxPerIp: positiveInt(process.env.REGISTRATION_MAX_PER_IP, 5),
  maxTotal: positiveInt(process.env.REGISTRATION_MAX_TOTAL, 50),
  windowMinutes: positiveInt(process.env.REGISTRATION_WINDOW_MINUTES, 60),
};

export function registrationEmailHash(email) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/** column is a fixed identifier ("email_hash", "ip_address") or null for all attempts. */
async function retryAfter(client, column, value, limit) {
  const params = [REGISTRATION_LIMITS.windowMinutes];
  if (column) params.push(value);
  const result = await client.query(
    `SELECT COUNT(*)::int AS attempts,
            EXTRACT(EPOCH FROM (MIN(attempted_at) + make_interval(mins => $1) - NOW()))::int AS retry_after
     FROM registration_attempts
     WHERE attempted_at > NOW() - make_interval(mins => $1)
       ${column ? `AND ${column} = $2` : ""}`,
    params
  );
  const row = result.rows[0];
  return row.attempts >= limit ? Math.max(row.retry_after, 1) : 0;
}

/**
 * Records the attempt and returns 0, or returns the seconds to wait without
 * recording anything. Runs in its own short transaction so the attempt is
 * kept even if the registration itself fails.
 */
export async function admitRegistration(pool, request, email) {
  const { maxPerEmail, maxPerIp, maxTotal, windowMinutes } = REGISTRATION_LIMITS;
  const emailHash = registrationEmailHash(email);
  const ip = clientIp(request);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('registration_attempts'))");

    const wait =
      (await retryAfter(client, "email_hash", emailHash, maxPerEmail)) ||
      (ip ? await retryAfter(client, "ip_address", ip, maxPerIp) : 0) ||
      (await retryAfter(client, null, null, maxTotal));
    if (wait > 0) {
      await client.query("ROLLBACK");
      return wait;
    }

    await client.query("INSERT INTO registration_attempts (email_hash, ip_address) VALUES ($1, $2)", [
      emailHash,
      ip,
    ]);
    await client.query(
      `DELETE FROM registration_attempts
       WHERE attempted_at < NOW() - GREATEST(INTERVAL '1 day', make_interval(mins => $1))`,
      [windowMinutes * 2]
    );
    await client.query("COMMIT");
    return 0;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
