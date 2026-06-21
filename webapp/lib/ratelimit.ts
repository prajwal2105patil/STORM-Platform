/**
 * ratelimit.ts — Global rate limiter backed by Upstash Redis.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (production),
 * limits are enforced globally across all Vercel instances via Upstash Redis.
 * When they're missing (local dev), falls back to in-memory per-instance limits.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const limiters = new Map<string, Ratelimit>();

function getUpstashLimiter(route: string, limit: number, windowMs: number) {
  const key = `${route}:${limit}:${windowMs}`;
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.fixedWindow(limit, `${windowMs}ms`),
        prefix: `asre:${route}`,
      })
    );
  }
  return limiters.get(key)!;
}

// ── In-memory fallback (local dev / missing env) ────────────────────────────
interface Entry { count: number; resetAt: number; }
const memStore = new Map<string, Entry>();

function memRateLimit(ip: string, route: string, limit: number, windowMs: number) {
  const key = `${route}:${ip}`;
  const now = Date.now();
  if (memStore.size > 5000) {
    for (const [k, v] of memStore) if (now > v.resetAt) memStore.delete(k);
  }
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ── Public API (same signature as before) ───────────────────────────────────
export async function rateLimit(
  ip: string,
  route: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!redis) return memRateLimit(ip, route, limit, windowMs);

  const limiter = getUpstashLimiter(route, limit, windowMs);
  const { success, remaining, reset } = await limiter.limit(ip);
  return { allowed: success, remaining, resetAt: reset };
}
