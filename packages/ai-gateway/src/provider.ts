import { ai } from "@ax-llm/ax";
import type { AxAIService, AxAIServiceOptions } from "@ax-llm/ax";

import { getPreset, resolveModel } from "./models.js";
import type { AIGateway, AIGatewayConfig, UsageRecord } from "./types.js";
import { UsageTracker } from "./usage-tracker.js";

/**
 * Create an AI Gateway instance configured with OpenRouter.
 *
 * Returns an Ax AI service instance ready for use with `ax()` programs,
 * plus usage tracking and model resolution utilities.
 */
export function createAIGateway(config: AIGatewayConfig): AIGateway {
  const tracker = new UsageTracker();
  const defaultTier = config.defaultTier ?? "balanced";
  const defaultModelId = resolveModel(defaultTier);
  const preset = getPreset(defaultTier);

  const innerService = ai({
    name: "openrouter" as const,
    apiKey: config.apiKey,
    config: {
      model: defaultModelId,
      maxTokens: preset.maxTokens,
      temperature: preset.temperature,
      stream: false,
    },
  });

  // Use a Proxy to intercept chat() calls for usage tracking.
  // Direct property assignment doesn't work reliably on AxAI class instances
  // because Ax's internal pipeline may bind methods at construction time.
  const aiService = new Proxy(innerService, {
    get(target, prop, receiver) {
      if (prop === "chat") {
        return async (
          req: Readonly<Parameters<typeof target.chat>[0]>,
          options?: Readonly<AxAIServiceOptions>
        ) => {
          const response = await target.chat(req, options);

          // Track usage from non-streaming responses
          if (!(response instanceof ReadableStream) && response.modelUsage?.tokens) {
            const tokens = response.modelUsage.tokens;
            const usageRecord: UsageRecord = {
              model: response.modelUsage.model,
              promptTokens: tokens.promptTokens,
              completionTokens: tokens.completionTokens,
              totalTokens: tokens.totalTokens,
              estimatedCost: 0,
            };
            tracker.record(usageRecord);
            config.onUsage?.(usageRecord);
          }

          return response;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as AxAIService;

  return {
    ai: aiService,

    getUsage() {
      return tracker.getUsage();
    },

    resetUsage() {
      tracker.reset();
    },

    resolveModel(tierOrId) {
      return resolveModel(tierOrId);
    },
  };
}
