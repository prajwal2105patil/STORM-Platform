/**
 * ratelimit.ts — Best-effort in-memory rate limiter for API routes.
 * Fixed-window counter per IP address.
 *
 * SERVERLESS CAVEAT: on Vercel each lambda instance has its own `store`, so the
 * limit is enforced PER INSTANCE, not globally. Under high concurrency a client
 * can exceed the nominal limit by (limit × number of warm instances). This is
 * acceptable abuse-dampening for a pilot, not a hard quota.
 *
 * To make limits global (a future upgrade, only if abuse appears):
 *   - Upstash Redis + @upstash/ratelimit (free tier, set UPSTASH_REDIS_* env), OR
 *   - a Supabase counter table with an atomic-increment RPC ($0, +1 round-trip).
 * Swap the body of rateLimit() for one of those; the signature stays the same.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Purge expired entries when the map grows, so a high-cardinality stream of IPs
// can't grow this map without bound (memory leak) on a long-lived instance.
const SWEEP_THRESHOLD = 5000;
function sweepExpired(now: number) {
  if (store.size < SWEEP_THRESHOLD) return;
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k);
  }
}

export function rateLimit(
  ip: string,
  route: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${route}:${ip}`;
  const now = Date.now();
  sweepExpired(now);

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
  // Note: store is reset on serverless cold start — acceptable for rate limiting
}
