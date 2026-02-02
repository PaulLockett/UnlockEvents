import type { ModelPreset, ModelTier } from "./types.js";

const MODEL_PRESETS: Record<ModelTier, ModelPreset> = {
  fast: {
    id: "anthropic/claude-3.5-haiku",
    fallbacks: ["anthropic/claude-3-haiku"],
    maxTokens: 4096,
    temperature: 0.0,
  },
  balanced: {
    id: "anthropic/claude-sonnet-4",
    fallbacks: ["anthropic/claude-3.5-sonnet"],
    maxTokens: 8192,
    temperature: 0.0,
  },
  quality: {
    id: "anthropic/claude-opus-4",
    fallbacks: ["anthropic/claude-3-opus"],
    maxTokens: 8192,
    temperature: 0.0,
  },
};

const VALID_TIERS = new Set<string>(["fast", "balanced", "quality"]);

/**
 * Get the preset configuration for a model tier.
 */
export function getPreset(tier: ModelTier): ModelPreset {
  return MODEL_PRESETS[tier];
}

/**
 * Resolve a model tier or explicit model ID to an OpenRouter model ID.
 * If the input is a known tier ("fast", "balanced", "quality"), returns the preset model ID.
 * Otherwise, treats it as an explicit OpenRouter model ID and passes it through.
 */
export function resolveModel(tierOrId: ModelTier | string): string {
  if (VALID_TIERS.has(tierOrId)) {
    return MODEL_PRESETS[tierOrId as ModelTier].id;
  }
  return tierOrId;
}

/**
 * Get all available model presets.
 */
export function getAllPresets(): Record<ModelTier, ModelPreset> {
  return { ...MODEL_PRESETS };
}
