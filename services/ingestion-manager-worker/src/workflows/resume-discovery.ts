import { proxyActivities } from "@temporalio/workflow";
import type {
  ExperimentAccessActivities,
  DiscoveryRequest,
  DiscoveryResult,
} from "@unlock-events/temporal-interfaces";

const experimentAccess = proxyActivities<ExperimentAccessActivities>({
  taskQueue: "experiment-access",
  startToCloseTimeout: "60s",
});

/**
 * M1 top-level workflow: Resume a previously checkpointed discovery cycle.
 * Loads experiment state from R5 and continues from where it left off.
 */
export async function resumeDiscovery(
  request: DiscoveryRequest,
  checkpointId: string
): Promise<DiscoveryResult> {
  const startedAt = new Date().toISOString();

  // Load experiment state from checkpoint
  const state = await experimentAccess.prepareAnalysisContext(request.tenantId, checkpointId);

  // Stub: real implementation will inspect state and resume from the right step
  void state;

  return {
    sourceId: request.sourceId,
    status: "completed",
    eventsIngested: 0,
    captureIds: [],
    startedAt,
    completedAt: new Date().toISOString(),
  };
}
