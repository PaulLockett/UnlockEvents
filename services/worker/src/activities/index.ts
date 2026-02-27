// Activities are the building blocks that workflows call.
// Each activity maps to a component operation (E1, E2, E3, R1-R5, M1, M2, U3 calls).
//
// These imports prove the full dependency graph resolves at build time.
import type { SourceAccess } from "@unlock-events/source-access";
import type { EventAccess } from "@unlock-events/event-access";
import type { CaptureAccess } from "@unlock-events/capture-access";
import type { EnvironmentNavigator } from "@unlock-events/environment-navigator";
import type { ExperimentAccess } from "@unlock-events/experiment-access";
import type { Scheduler } from "@unlock-events/scheduler";
import type { DiscoveryEngine } from "@unlock-events/discovery-engine";
import type { ExtractionEngine } from "@unlock-events/extraction-engine";
import type { DedupEngine } from "@unlock-events/dedup-engine";
import type { IngestionManager } from "@unlock-events/ingestion-manager";
import type { EventManager } from "@unlock-events/event-manager";

// Type-level proof that all component interfaces are importable.
// These will be replaced with real factory calls when components are implemented.
export type ComponentGraph = {
  sourceAccess: SourceAccess;
  eventAccess: EventAccess;
  captureAccess: CaptureAccess;
  environmentNavigator: EnvironmentNavigator;
  experimentAccess: ExperimentAccess;
  scheduler: Scheduler;
  discoveryEngine: DiscoveryEngine;
  extractionEngine: ExtractionEngine;
  dedupEngine: DedupEngine;
  ingestionManager: IngestionManager;
  eventManager: EventManager;
};

export async function healthCheck(): Promise<string> {
  return `worker healthy at ${new Date().toISOString()}`;
}
