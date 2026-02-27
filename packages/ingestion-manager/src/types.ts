/**
 * M1: Ingestion Manager — Public Interface
 *
 * Encapsulates discovery cycle orchestration — the critical path from source
 * to ingested events.
 * Orchestrates: R1, R3, R4, R5, E1, E2, U3.
 * Called by: Temporal Schedule (orchestrateDiscoveryCycle), Temporal retry/resume.
 * Technology-agnostic interface.
 */

export type DiscoveryStatus =
  | "started"
  | "navigating"
  | "capturing"
  | "extracting"
  | "ingesting"
  | "completed"
  | "failed";

export interface DiscoveryRequest {
  sourceId: string;
  tenantId: string;
  experimentKey?: string;
  force?: boolean;
}

export interface DiscoveryResult {
  sourceId: string;
  status: DiscoveryStatus;
  eventsIngested: number;
  captureIds: string[];
  startedAt: string;
  completedAt: string | null;
  error?: string;
}

export interface IngestionManager {
  /** Execute a full navigation->capture->extract->ingest cycle for a source. */
  orchestrateDiscoveryCycle(request: DiscoveryRequest): Promise<DiscoveryResult>;

  /** Continue a previously interrupted discovery cycle. */
  resumeDiscovery(request: DiscoveryRequest, checkpointId: string): Promise<DiscoveryResult>;
}

export interface IngestionManagerConfig {
  sourceAccess?: unknown;
  captureAccess?: unknown;
  environmentNavigator?: unknown;
  experimentAccess?: unknown;
  discoveryEngine?: unknown;
  extractionEngine?: unknown;
  scheduler?: unknown;
}
