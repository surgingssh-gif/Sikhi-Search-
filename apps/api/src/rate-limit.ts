import type { MiddlewareHandler } from "hono";

export interface RateLimitOptions {
  /** Requests allowed per window per client. */
  limit: number;
  windowMs: number;
  /** How to identify a client. Defaults to the first X-Forwarded-For address. */
  keyOf?: (headers: Headers) => string;
}

/**
 * Fixed-window, in-memory rate limiter. Good enough for a single instance;
 * move to a shared store (e.g. Postgres or Redis) before running several.
 */
export function rateLimit({ limit, windowMs, keyOf = defaultKey }: RateLimitOptions): MiddlewareHandler {
  const windows = new Map<string, { start: number; count: number }>();

  return async (c, next) => {
    const now = Date.now();
    const key = keyOf(c.req.raw.headers);
    let w = windows.get(key);
    if (!w || now - w.start >= windowMs) {
      w = { start: now, count: 0 };
      windows.set(key, w);
    }
    w.count++;
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (now - v.start >= windowMs) windows.delete(k);
    }
    if (w.count > limit) {
      c.header("retry-after", String(Math.ceil((w.start + windowMs - now) / 1000)));
      return c.json({ error: "rate_limited" }, 429);
    }
    await next();
  };
}

function defaultKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
