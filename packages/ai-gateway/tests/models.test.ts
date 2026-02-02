import { describe, it, expect } from "vitest";

import { resolveModel, getPreset, getAllPresets } from "../src/models.js";

describe("resolveModel", () => {
  it("resolves 'fast' to claude-3.5-haiku", () => {
    expect(resolveModel("fast")).toBe("anthropic/claude-3.5-haiku");
  });

  it("resolves 'balanced' to claude-sonnet-4", () => {
    expect(resolveModel("balanced")).toBe("anthropic/claude-sonnet-4");
  });

  it("resolves 'quality' to claude-opus-4", () => {
    expect(resolveModel("quality")).toBe("anthropic/claude-opus-4");
  });

  it("passes through explicit model IDs", () => {
    expect(resolveModel("anthropic/claude-3-opus")).toBe("anthropic/claude-3-opus");
  });

  it("passes through unknown model IDs", () => {
    expect(resolveModel("openai/gpt-4o")).toBe("openai/gpt-4o");
  });
});

describe("getPreset", () => {
  it("returns preset for fast tier", () => {
    const preset = getPreset("fast");
    expect(preset.id).toBe("anthropic/claude-3.5-haiku");
    expect(preset.maxTokens).toBeGreaterThan(0);
    expect(preset.temperature).toBeGreaterThanOrEqual(0);
    expect(preset.fallbacks).toBeInstanceOf(Array);
    expect(preset.fallbacks.length).toBeGreaterThan(0);
  });

  it("returns preset for balanced tier", () => {
    const preset = getPreset("balanced");
    expect(preset.id).toBe("anthropic/claude-sonnet-4");
  });

  it("returns preset for quality tier", () => {
    const preset = getPreset("quality");
    expect(preset.id).toBe("anthropic/claude-opus-4");
  });
});

describe("getAllPresets", () => {
  it("returns all three tiers", () => {
    const presets = getAllPresets();
    expect(Object.keys(presets)).toEqual(expect.arrayContaining(["fast", "balanced", "quality"]));
    expect(Object.keys(presets)).toHaveLength(3);
  });
});
