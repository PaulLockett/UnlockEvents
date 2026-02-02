import { describe, it, expect, vi } from "vitest";

import { withRetry } from "../src/retry.js";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValueOnce("success");
    const result = await withRetry(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429, message: "Rate limited" })
      .mockRejectedValueOnce({ status: 429, message: "Rate limited" })
      .mockResolvedValueOnce("success");

    const result = await withRetry(fn, {
      initialDelayMs: 10,
      maxRetries: 3,
    });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries on 500 server error and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 500, message: "Server error" })
      .mockRejectedValueOnce({ status: 502, message: "Bad gateway" })
      .mockResolvedValueOnce("success");

    const result = await withRetry(fn, {
      initialDelayMs: 10,
      maxRetries: 3,
    });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on 402 (not retryable)", async () => {
    const error = { status: 402, message: "Payment required" };
    const fn = vi.fn().mockRejectedValueOnce(error);

    await expect(withRetry(fn, { initialDelayMs: 10 })).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws immediately on 400 (not retryable)", async () => {
    const error = { status: 400, message: "Bad request" };
    const fn = vi.fn().mockRejectedValueOnce(error);

    await expect(withRetry(fn, { initialDelayMs: 10 })).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws immediately on errors without status", async () => {
    const error = new Error("Network error");
    const fn = vi.fn().mockRejectedValueOnce(error);

    await expect(withRetry(fn, { initialDelayMs: 10 })).rejects.toThrow("Network error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting max retries", async () => {
    const error = { status: 429, message: "Rate limited" };
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { initialDelayMs: 10, maxRetries: 2 })).rejects.toEqual(error);
    // 1 initial + 2 retries = 3 total
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses exponential backoff", async () => {
    const timestamps: number[] = [];
    const fn = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      if (timestamps.length <= 3) {
        throw { status: 429, message: "Rate limited" };
      }
      return "success";
    });

    await withRetry(fn, {
      initialDelayMs: 50,
      backoffFactor: 2,
      maxRetries: 3,
    });

    expect(fn).toHaveBeenCalledTimes(4);
    // Verify delays increase (with some tolerance for timing)
    const delay1 = timestamps[1]! - timestamps[0]!;
    const delay2 = timestamps[2]! - timestamps[1]!;
    expect(delay1).toBeGreaterThanOrEqual(40); // ~50ms
    expect(delay2).toBeGreaterThanOrEqual(80); // ~100ms
  });

  it("caps delay at maxDelayMs", async () => {
    const timestamps: number[] = [];
    const fn = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      if (timestamps.length <= 3) {
        throw { status: 429, message: "Rate limited" };
      }
      return "success";
    });

    await withRetry(fn, {
      initialDelayMs: 100,
      backoffFactor: 10,
      maxDelayMs: 150,
      maxRetries: 3,
    });

    // Third delay would be 100 * 10^2 = 10000, but capped at 150
    const delay3 = timestamps[3]! - timestamps[2]!;
    expect(delay3).toBeLessThan(250); // Should be ~150, not 10000
  });
});
