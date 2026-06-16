/**
 * ratelimit.ts — In-memory rate limiter for API routes
 * Sliding window counter per IP address.
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
