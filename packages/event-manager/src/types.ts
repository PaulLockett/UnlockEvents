/**
 * M2: Event Manager — Public Interface
 *
 * Encapsulates post-ingestion event lifecycle — dedup, publish,
 * and event feed assembly.
 * Orchestrates: R2, E3.
 * Called by: M1 (after event ingestion).
 * Technology-agnostic interface.
 */

export type ProcessingOutcome = "published" | "consolidated" | "quarantined" | "failed";

export interface EventProcessingResult {
  eventId: string;
  outcome: ProcessingOutcome;
  canonicalId: string | null;
  details: string;
}

export interface BatchProcessingResult {
  results: EventProcessingResult[];
  totalProcessed: number;
  published: number;
  consolidated: number;
  quarantined: number;
  failed: number;
}

export interface EventManager {
  /** Run a newly ingested event through dedup + publication pipeline. */
  processNewEvent(tenantId: string, eventId: string): Promise<EventProcessingResult>;

  /** Process multiple events from a single discovery cycle. */
  processBatch(tenantId: string, eventIds: string[]): Promise<BatchProcessingResult>;
}

export interface EventManagerConfig {
  eventAccess?: unknown;
  dedupEngine?: unknown;
}
