import { executeChild } from "@temporalio/workflow";
import type {
  BatchProcessingResult,
  EventProcessingResult,
} from "@unlock-events/temporal-interfaces";

/**
 * M2 top-level workflow: Process a batch of newly ingested events.
 * Delegates to processNewEvent for each event as a child workflow.
 */
export async function processBatch(
  tenantId: string,
  eventIds: string[]
): Promise<BatchProcessingResult> {
  const results: EventProcessingResult[] = [];
  let published = 0;
  let consolidated = 0;
  let quarantined = 0;
  let failed = 0;

  for (const eventId of eventIds) {
    try {
      const result = (await executeChild("processNewEvent", {
        taskQueue: "event-manager",
        args: [tenantId, eventId],
      })) as EventProcessingResult;

      results.push(result);

      switch (result.outcome) {
        case "published":
          published++;
          break;
        case "consolidated":
          consolidated++;
          break;
        case "quarantined":
          quarantined++;
          break;
        case "failed":
          failed++;
          break;
      }
    } catch (error) {
      failed++;
      results.push({
        eventId,
        outcome: "failed",
        canonicalId: null,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    results,
    totalProcessed: eventIds.length,
    published,
    consolidated,
    quarantined,
    failed,
  };
}
