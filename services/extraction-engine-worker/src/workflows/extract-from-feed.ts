import { proxyActivities } from "@temporalio/workflow";
import type {
  AIGatewayActivities,
  ExtractionResult,
  FeedContent,
} from "@unlock-events/temporal-interfaces";

const aiGateway = proxyActivities<AIGatewayActivities>({
  taskQueue: "ai-gateway",
  startToCloseTimeout: "120s",
});

/**
 * E2 child workflow: Extract events from a structured feed (RSS/JSON/iCal).
 * Calls U2 (AI Gateway) for LLM-based parsing of feed content.
 */
export async function extractFromFeed(
  tenantId: string,
  feed: FeedContent
): Promise<ExtractionResult> {
  const llmResult = await aiGateway.chat({
    messages: [
      {
        role: "system",
        content: `You are an event extraction specialist. Extract structured event data from a ${feed.format} feed.`,
      },
      {
        role: "user",
        content: feed.rawContent,
      },
    ],
    model: "balanced",
  });

  return {
    captureId: `feed-${tenantId}-${Date.now()}`,
    events: [],
    extractedAt: new Date().toISOString(),
    warnings: [
      `Feed extraction stub (${feed.format}) — response length: ${llmResult.content.length}`,
    ],
  };
}
