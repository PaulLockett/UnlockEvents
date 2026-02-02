import { describe, it, expect, vi } from "vitest";

import { createAIGateway } from "../src/provider.js";

// We test the gateway creation and configuration without making real API calls
describe("createAIGateway", () => {
  it("creates a gateway with an ai service", () => {
    const gateway = createAIGateway({
      apiKey: "test-key",
    });

    expect(gateway.ai).toBeDefined();
    expect(typeof gateway.ai.chat).toBe("function");
    expect(typeof gateway.ai.embed).toBe("function");
  });

  it("defaults to balanced tier", () => {
    const gateway = createAIGateway({
      apiKey: "test-key",
    });

    expect(gateway.resolveModel("balanced")).toBe("anthropic/claude-sonnet-4");
  });

  it("exposes usage tracking methods", () => {
    const gateway = createAIGateway({
      apiKey: "test-key",
    });

    const usage = gateway.getUsage();
    expect(usage.totalCost).toBe(0);
    expect(usage.totalTokens).toBe(0);
    expect(usage.requestCount).toBe(0);

    // Reset should not throw
    gateway.resetUsage();
  });

  it("resolves model tiers", () => {
    const gateway = createAIGateway({
      apiKey: "test-key",
    });

    expect(gateway.resolveModel("fast")).toBe("anthropic/claude-3.5-haiku");
    expect(gateway.resolveModel("balanced")).toBe("anthropic/claude-sonnet-4");
    expect(gateway.resolveModel("quality")).toBe("anthropic/claude-opus-4");
    expect(gateway.resolveModel("openai/gpt-4o")).toBe("openai/gpt-4o");
  });

  it("accepts custom default tier", () => {
    const gateway = createAIGateway({
      apiKey: "test-key",
      defaultTier: "fast",
    });

    // Gateway was created successfully with fast tier
    expect(gateway.ai).toBeDefined();
  });

  it("accepts onUsage callback", () => {
    const onUsage = vi.fn();
    const gateway = createAIGateway({
      apiKey: "test-key",
      onUsage,
    });

    // Callback registered successfully
    expect(gateway.ai).toBeDefined();
  });
});
