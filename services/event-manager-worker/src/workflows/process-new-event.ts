import { proxyActivities, executeChild } from "@temporalio/workflow";
import type {
  EventAccessActivities,
  DedupEngineWorkflows,
  EventProcessingResult,
} from "@unlock-events/temporal-interfaces";

const eventAccess = proxyActivities<EventAccessActivities>({
  taskQueue: "event-access",
  startToCloseTimeout: "30s",
});

// Type reference for executeChild string-based invocation
void ({} as DedupEngineWorkflows);

/**
 * M2 top-level workflow: Process a single newly ingested event.
 *
 * Flow: Resolve event → E3 (find duplicates) → E3 (adjudicate each) →
 *       Consolidate or Publish
 */
export async function processNewEvent(
  tenantId: string,
  eventId: string
): Promise<EventProcessingResult> {
  // 1. Resolve the event
  const event = await eventAccess.resolveEventForProcessing(tenantId, eventId);

  // 2. Surface duplicate candidates via E3
  const candidates = await executeChild("surfaceDuplicateCandidates", {
    taskQueue: "dedup-engine",
    args: [tenantId, event.id],
  });

  // 3. Adjudicate each candidate
  const candidateArray = candidates as Array<{ eventId: string }>;
  for (const candidate of candidateArray) {
    const judgment = await executeChild("adjudicatePair", {
      taskQueue: "dedup-engine",
      args: [tenantId, event.id, candidate.eventId],
    });

    const typedJudgment = judgment as { verdict: string };
    if (typedJudgment.verdict === "duplicate") {
      // Consolidate: merge into the existing canonical event
      await eventAccess.consolidateEvents(tenantId, event.id, candidate.eventId);
      return {
        eventId: event.id,
        outcome: "consolidated",
        canonicalId: candidate.eventId,
        details: `Consolidated with ${candidate.eventId}`,
      };
    }
  }

  // 4. No duplicates — publish the event
  await eventAccess.publishEvent(tenantId, event.id);

  return {
    eventId: event.id,
    outcome: "published",
    canonicalId: null,
    details: "No duplicates found, published directly",
  };
}
