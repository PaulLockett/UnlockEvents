import type {
  IngestionManager,
  IngestionManagerConfig,
  DiscoveryRequest,
  DiscoveryResult,
} from "./types.js";

export function createIngestionManager(config: IngestionManagerConfig = {}): IngestionManager {
  void config;

  return {
    async orchestrateDiscoveryCycle(request: DiscoveryRequest): Promise<DiscoveryResult> {
      console.log(
        `[M1:stub] orchestrateDiscoveryCycle source=${request.sourceId} tenant=${request.tenantId}`
      );
      return {
        sourceId: request.sourceId,
        status: "completed",
        eventsIngested: 0,
        captureIds: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    },

    async resumeDiscovery(
      request: DiscoveryRequest,
      checkpointId: string
    ): Promise<DiscoveryResult> {
      console.log(
        `[M1:stub] resumeDiscovery source=${request.sourceId} checkpoint=${checkpointId}`
      );
      return {
        sourceId: request.sourceId,
        status: "completed",
        eventsIngested: 0,
        captureIds: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    },
  };
}
