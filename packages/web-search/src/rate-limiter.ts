import type { RateLimiter, RateLimiterConfig } from "./types.js";

const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_MS = 60_000;

/** Creates a sliding-window rate limiter */
export function createRateLimiter(config?: RateLimiterConfig): RateLimiter {
  const maxRequests = config?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS;

  const timestamps: number[] = [];

  function pruneExpired(): void {
    const cutoff = Date.now() - windowMs;
    while (timestamps.length > 0 && timestamps[0]! < cutoff) {
      timestamps.shift();
    }
  }

  async function acquire(): Promise<void> {
    pruneExpired();

    if (timestamps.length < maxRequests) {
      timestamps.push(Date.now());
      return;
    }

    // Wait until the oldest timestamp expires
    const oldestTimestamp = timestamps[0]!;
    const waitMs = oldestTimestamp + windowMs - Date.now();

    if (waitMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    }

    pruneExpired();
    timestamps.push(Date.now());
  }

  return { acquire };
}
