import { proxyActivities } from "@temporalio/workflow";
import type {
  EventAccessActivities,
  AIGatewayActivities,
  DedupCandidate,
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
 * E3 child workflow: Surface potential duplicate events for a given event.
 * Calls R2 (Event Access) and U2 (AI Gateway) activities.
 */
export async function surfaceDuplicateCandidates(
  tenantId: string,
  eventId: string
): Promise<DedupCandidate[]> {
  // Resolve the event to get its details
  const event = await eventAccess.resolveEventForProcessing(tenantId, eventId);

  // Use AI to find similar events based on title/date
  const llmResult = await aiGateway.chat({
    messages: [
      {
        role: "system",
        content:
          "You are a deduplication specialist. Identify potential duplicate events based on similarity signals.",
      },
      {
        role: "user",
        content: JSON.stringify({
          eventId: event.id,
          title: event.title,
          startDate: event.startDate,
          location: event.location,
        }),
      },
    ],
    model: "fast",
  });

  // Stub: return empty candidates — real implementation will query R2 for similar events
  void llmResult;
  return [];
}
