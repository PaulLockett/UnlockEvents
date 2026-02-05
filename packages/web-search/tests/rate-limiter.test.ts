import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "../src/rate-limiter.js";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 });

    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    // All three should resolve immediately without throwing
  });

  it("delays requests that exceed the limit", async () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });

    await limiter.acquire();
    await limiter.acquire();

    // Third request should be delayed
    let resolved = false;
    const promise = limiter.acquire().then(() => {
      resolved = true;
    });

    // Should not resolve immediately
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);

    // Advance past the window — oldest request expires
    await vi.advanceTimersByTimeAsync(1000);
    expect(resolved).toBe(true);

    await promise;
  });

  it("uses sliding window — oldest request expiry unblocks new requests", async () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });

    await limiter.acquire(); // t=0
    await vi.advanceTimersByTimeAsync(500);
    await limiter.acquire(); // t=500

    // At capacity. Third call should wait until t=1000 (first expires)
    let resolved = false;
    const promise = limiter.acquire().then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);

    await promise;
  });

  it("uses default config when none provided", async () => {
    const limiter = createRateLimiter();

    // Should be able to make 10 requests (default maxRequests)
    for (let i = 0; i < 10; i++) {
      await limiter.acquire();
    }

    // 11th should be delayed
    let resolved = false;
    limiter.acquire().then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);
  });

  it("handles concurrent acquire calls correctly", async () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });

    await limiter.acquire(); // t=0, fills capacity

    const resolved: number[] = [];

    const p1 = limiter.acquire().then(() => resolved.push(1));
    const p2 = limiter.acquire().then(() => resolved.push(2));

    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toEqual([]);

    // First waiting request should resolve at t=1000
    await vi.advanceTimersByTimeAsync(1000);
    expect(resolved).toContain(1);

    // Second should resolve at t=2000 (first waiting acquired at t=1000, expires at t=2000)
    await vi.advanceTimersByTimeAsync(1000);
    expect(resolved).toContain(2);

    await Promise.all([p1, p2]);
  });

  it("cleans up expired timestamps from the window", async () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });

    await limiter.acquire(); // t=0
    await limiter.acquire(); // t=0

    // Advance past the window
    await vi.advanceTimersByTimeAsync(1001);

    // Both old timestamps should be expired, so two more should work immediately
    await limiter.acquire();
    await limiter.acquire();
  });

  it("resolves acquire immediately when window has capacity", async () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });

    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;

    expect(elapsed).toBe(0);
  });
});
