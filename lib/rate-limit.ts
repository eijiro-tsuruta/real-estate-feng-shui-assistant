type Entry = { count: number; resetAt: number };

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type RateLimiterOptions = {
  windowMs?: number;
  maxRequests?: number;
  maxEntries?: number;
  now?: () => number;
};

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const attempts = new Map<string, Entry>();
  const windowMs = options.windowMs ?? 10 * 60 * 1000;
  const maxRequests = options.maxRequests ?? 5;
  const maxEntries = options.maxEntries ?? 10_000;
  const getNow = options.now ?? Date.now;
  let checksSinceCleanup = 0;

  function cleanupExpired(now: number) {
    for (const [key, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(key);
    }
  }

  return {
    check(identifier: string): RateLimitResult {
      const now = getNow();
      checksSinceCleanup += 1;

      if (checksSinceCleanup >= 100 || attempts.size >= maxEntries) {
        cleanupExpired(now);
        checksSinceCleanup = 0;
      }

      const key = identifier.slice(0, 128) || "unknown";
      const current = attempts.get(key);

      if (!current || current.resetAt <= now) {
        if (attempts.size >= maxEntries) {
          return { allowed: false, retryAfterSeconds: 60 };
        }
        attempts.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (current.count >= maxRequests) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((current.resetAt - now) / 1000),
          ),
        };
      }

      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    clear() {
      attempts.clear();
    },
    size() {
      return attempts.size;
    },
  };
}

const defaultLimiter = createRateLimiter();

export function checkRateLimit(identifier: string): RateLimitResult {
  return defaultLimiter.check(identifier);
}
