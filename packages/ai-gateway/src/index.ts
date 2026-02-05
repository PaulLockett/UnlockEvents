// Public API
export { createAIGateway } from "./provider.js";

// Types
export type {
  AIGateway,
  AIGatewayConfig,
  AggregateUsage,
  ModelPreset,
  ModelTier,
  UsageRecord,
  // Re-exported Ax types
  AxAIService,
  AxAIServiceOptions,
  AxChatRequest,
  AxChatResponse,
  AxFunction,
  AxModelConfig,
  AxTokenUsage,
  AxModelUsage,
} from "./types.js";

// Model utilities
export { resolveModel, getPreset, getAllPresets } from "./models.js";

// Retry utility (available for consumers who need it)
export { withRetry } from "./retry.js";
export type { RetryOptions } from "./retry.js";

// Re-export key Ax primitives so consumers import from us
export { ax, s, flow, agent, ai, AxGen, AxSignature } from "@ax-llm/ax";
export type { AxProgram, AxFlow, AxAgent } from "@ax-llm/ax";
