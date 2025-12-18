import "server-only";

type Bucket = { count: number; resetAt: number };

const RATE_LIMIT_STORE = new Map<string, Bucket>();
const RATE_LIMIT_MAX_KEYS = 10_000;

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null;

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return null;
}

export function checkRateLimit(
  key: string,
  options: { windowMs: number; maxRequests: number },
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  // Best-effort in-memory rate limiting (per runtime instance).
  const now = Date.now();

  if (RATE_LIMIT_STORE.size > RATE_LIMIT_MAX_KEYS) {
    for (const [storedKey, entry] of RATE_LIMIT_STORE) {
      if (entry.resetAt <= now) RATE_LIMIT_STORE.delete(storedKey);
    }
  }

  const existing = RATE_LIMIT_STORE.get(key);
  if (!existing || existing.resetAt <= now) {
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }

  if (existing.count >= options.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { ok: true };
}

