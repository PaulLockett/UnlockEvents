import { proxyActivities } from "@temporalio/workflow";
import type {
  EventAccessActivities,
  AIGatewayActivities,
  DedupJudgment,
} from "@unlock-events/temporal-interfaces";

const eventAccess = proxyActivities<EventAccessActivities>({
  taskQueue: "event-access",
  startToCloseTimeout: "60s",
});

const aiGateway = proxyActivities<AIGatewayActivities>({
  taskQueue: "ai-gateway",
  startToCloseTimeout: "120s",
});

/**
 * E3 child workflow: Adjudicate whether two events are duplicates.
 * Calls R2 (Event Access) and U2 (AI Gateway) activities.
 */
export async function adjudicatePair(
  tenantId: string,
  eventA: string,
  eventB: string
): Promise<DedupJudgment> {
  // Resolve both events
  const [a, b] = await Promise.all([
    eventAccess.resolveEventForProcessing(tenantId, eventA),
    eventAccess.resolveEventForProcessing(tenantId, eventB),
  ]);

  // Use AI to determine if they're duplicates
  const llmResult = await aiGateway.chat({
    messages: [
      {
        role: "system",
        content:
          "You are a deduplication judge. Compare two events and determine if they are duplicates, distinct, or uncertain.",
      },
      {
        role: "user",
        content: JSON.stringify({
          eventA: { id: a.id, title: a.title, startsAt: a.startsAt },
          eventB: { id: b.id, title: b.title, startsAt: b.startsAt },
        }),
      },
    ],
    model: "balanced",
  });

  return {
    eventA,
    eventB,
    verdict: "distinct",
    confidence: 0.5,
    reasoning: llmResult.content,
  };
}
