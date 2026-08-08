// Shared Upstash Redis client, rate limiter and result cache, per
// architecture doc section 6: per-IP rate limiting (sliding window) and a
// 24-hour result cache for the search and verify routes. This was planned
// from the start but never built until August 2026, when Christopher
// created the free Upstash database this reads its credentials from
// (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN). Without those two
// environment variables set, everything in this file degrades to a no-op:
// rate limiting and caching simply switch off and the app behaves exactly
// as it did before, the same pattern already used for OPENALEX_API_KEY.
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

// 20 requests per 10 minutes per IP, the default stated in
// planning/01-architecture-and-cost-model.md section 6. Search and verify
// get separate limiters (distinct key prefixes) so heavy use of one tool
// doesn't lock a student out of the other.
function makeLimiter(prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "10 m"),
    analytics: false,
    prefix: `referencelib:ratelimit:${prefix}`,
  });
}

export const searchRateLimit = makeLimiter("search");
export const verifyRateLimit = makeLimiter("verify");

// Vercel puts the caller's IP in x-forwarded-for. Falls back to x-real-ip,
// then a fixed string so a missing header degrades to "everyone shares one
// bucket" rather than throwing.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours, per architecture doc section 6.

// Cache reads and writes never throw outward: a Redis hiccup must degrade to
// "search OpenAlex again", never to a broken response for the student.
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    return value ?? null;
  } catch (error) {
    console.error("[upstash] cache read failed", error);
    return null;
  }
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: CACHE_TTL_SECONDS });
  } catch (error) {
    console.error("[upstash] cache write failed", error);
  }
}
