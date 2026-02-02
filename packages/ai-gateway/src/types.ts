import type {
  AxAIService,
  AxAIServiceOptions,
  AxChatRequest,
  AxChatResponse,
  AxFunction,
  AxModelConfig,
  AxTokenUsage,
  AxModelUsage,
} from "@ax-llm/ax";

// Re-export Ax types consumers need
export type {
  AxAIService,
  AxAIServiceOptions,
  AxChatRequest,
  AxChatResponse,
  AxFunction,
  AxModelConfig,
  AxTokenUsage,
  AxModelUsage,
};

/** Model tier presets for common use cases */
export type ModelTier = "fast" | "balanced" | "quality";

/** Configuration for a specific model */
export interface ModelPreset {
  /** OpenRouter model ID */
  id: string;
  /** Fallback model IDs if primary is unavailable */
  fallbacks: string[];
  /** Default max tokens for this tier */
  maxTokens: number;
  /** Default temperature for this tier */
  temperature: number;
}

/** Usage information for a single request */
export interface UsageRecord {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

/** Aggregated usage across multiple requests */
export interface AggregateUsage {
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  perModel: Map<string, { tokens: number; cost: number; requests: number }>;
}

/** Configuration for creating an AI Gateway instance */
export interface AIGatewayConfig {
  /** OpenRouter API key */
  apiKey: string;
  /** Default model tier (defaults to "balanced") */
  defaultTier?: ModelTier;
  /** Called after each request with usage info */
  onUsage?: (record: UsageRecord) => void;
}

/** The gateway instance returned by createAIGateway */
export interface AIGateway {
  /** Configured Ax AI service instance */
  ai: AxAIService;
  /** Get aggregated usage statistics */
  getUsage(): AggregateUsage;
  /** Reset usage statistics */
  resetUsage(): void;
  /** Resolve a model tier or explicit ID to an OpenRouter model ID */
  resolveModel(tierOrId: ModelTier | string): string;
}
