import { describe, it, expect, beforeEach } from "vitest";

import { UsageTracker } from "../src/usage-tracker.js";
import type { UsageRecord } from "../src/types.js";

describe("UsageTracker", () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker();
  });

  it("starts with zero usage", () => {
    const usage = tracker.getUsage();
    expect(usage.totalCost).toBe(0);
    expect(usage.totalTokens).toBe(0);
    expect(usage.requestCount).toBe(0);
    expect(usage.perModel.size).toBe(0);
  });

  it("accumulates usage from a single record", () => {
    const record: UsageRecord = {
      model: "anthropic/claude-sonnet-4",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.003,
    };

    tracker.record(record);
    const usage = tracker.getUsage();

    expect(usage.totalTokens).toBe(150);
    expect(usage.totalCost).toBe(0.003);
    expect(usage.requestCount).toBe(1);
    expect(usage.perModel.get("anthropic/claude-sonnet-4")).toEqual({
      tokens: 150,
      cost: 0.003,
      requests: 1,
    });
  });

  it("accumulates usage across multiple records for the same model", () => {
    tracker.record({
      model: "anthropic/claude-sonnet-4",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.003,
    });
    tracker.record({
      model: "anthropic/claude-sonnet-4",
      promptTokens: 200,
      completionTokens: 100,
      totalTokens: 300,
      estimatedCost: 0.006,
    });

    const usage = tracker.getUsage();

    expect(usage.totalTokens).toBe(450);
    expect(usage.totalCost).toBeCloseTo(0.009);
    expect(usage.requestCount).toBe(2);
    expect(usage.perModel.get("anthropic/claude-sonnet-4")).toEqual({
      tokens: 450,
      cost: expect.closeTo(0.009),
      requests: 2,
    });
  });

  it("tracks usage per model separately", () => {
    tracker.record({
      model: "anthropic/claude-3.5-haiku",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.001,
    });
    tracker.record({
      model: "anthropic/claude-sonnet-4",
      promptTokens: 200,
      completionTokens: 100,
      totalTokens: 300,
      estimatedCost: 0.006,
    });

    const usage = tracker.getUsage();

    expect(usage.perModel.size).toBe(2);
    expect(usage.perModel.get("anthropic/claude-3.5-haiku")).toEqual({
      tokens: 150,
      cost: 0.001,
      requests: 1,
    });
    expect(usage.perModel.get("anthropic/claude-sonnet-4")).toEqual({
      tokens: 300,
      cost: 0.006,
      requests: 1,
    });
  });

  it("resets all usage", () => {
    tracker.record({
      model: "anthropic/claude-sonnet-4",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.003,
    });

    tracker.reset();
    const usage = tracker.getUsage();

    expect(usage.totalCost).toBe(0);
    expect(usage.totalTokens).toBe(0);
    expect(usage.requestCount).toBe(0);
    expect(usage.perModel.size).toBe(0);
  });

  it("returns a copy of perModel map (not a reference)", () => {
    tracker.record({
      model: "test-model",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      estimatedCost: 0.001,
    });

    const usage1 = tracker.getUsage();
    usage1.perModel.delete("test-model");

    const usage2 = tracker.getUsage();
    expect(usage2.perModel.has("test-model")).toBe(true);
  });
});
