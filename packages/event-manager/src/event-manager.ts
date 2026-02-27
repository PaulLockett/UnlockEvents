import type {
  EventManager,
  EventManagerConfig,
  EventProcessingResult,
  BatchProcessingResult,
} from "./types.js";

export function createEventManager(config: EventManagerConfig = {}): EventManager {
  void config;

  return {
    async processNewEvent(tenantId: string, eventId: string): Promise<EventProcessingResult> {
      console.log(`[M2:stub] processNewEvent tenant=${tenantId} event=${eventId}`);
      return {
        eventId,
        outcome: "published",
        canonicalId: null,
        details: "stub processing — event auto-published without dedup",
      };
    },

    async processBatch(tenantId: string, eventIds: string[]): Promise<BatchProcessingResult> {
      console.log(`[M2:stub] processBatch tenant=${tenantId} count=${eventIds.length}`);
      const results: EventProcessingResult[] = eventIds.map((eventId) => ({
        eventId,
        outcome: "published" as const,
        canonicalId: null,
        details: "stub processing — event auto-published without dedup",
      }));
      return {
        results,
        totalProcessed: eventIds.length,
        published: eventIds.length,
        consolidated: 0,
        quarantined: 0,
        failed: 0,
      };
    },
  };
}
