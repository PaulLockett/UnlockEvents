import { createAIGateway } from "@unlock-events/ai-gateway";
import type { AIGateway, UsageRecord } from "@unlock-events/ai-gateway";
import type { SerializableAggregateUsage } from "@unlock-events/temporal-interfaces";

let instance: AIGateway | null = null;

function getInstance(): AIGateway {
  if (!instance) {
    instance = createAIGateway({
      apiKey: process.env["OPENROUTER_API_KEY"] || "",
    });
  }
  return instance;
}

export async function chat(params: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
}): Promise<{ content: string; usage?: UsageRecord }> {
  const gateway = getInstance();
  const model = params.model
    ? gateway.resolveModel(params.model)
    : gateway.resolveModel("balanced");

  const response = await gateway.ai.chat({
    chatPrompt: params.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    model,
  });

  if (response instanceof ReadableStream) {
    throw new Error("Streaming responses not supported in activity context");
  }

  return {
    content:
      typeof response.results === "string" ? response.results : JSON.stringify(response.results),
  };
}

export async function getUsage(): Promise<SerializableAggregateUsage> {
  const usage = getInstance().getUsage();
  const perModel: Record<string, { tokens: number; cost: number; requests: number }> = {};
  usage.perModel.forEach((value, key) => {
    perModel[key] = value;
  });
  return {
    totalCost: usage.totalCost,
    totalTokens: usage.totalTokens,
    requestCount: usage.requestCount,
    perModel,
  };
}

export async function resetUsage(): Promise<void> {
  getInstance().resetUsage();
}
