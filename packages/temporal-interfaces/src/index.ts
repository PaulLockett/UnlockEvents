/**
 * Temporal Interfaces — type-only re-exports for proxyActivities<T>() and executeChild<T>()
 *
 * Each activity interface maps 1:1 to a service's task queue.
 * Workflow callers import these types to get type-safe cross-service calls.
 */

// ─── Resource Access Activity Interfaces (R1-R5) ────────────────────────────

import type { SourceRecord, NavigationBrief } from "@unlock-events/source-access";

export type { SourceRecord, NavigationBrief };

/** R1: Source Access activities — task queue: "source-access" */
export interface SourceAccessActivities {
  onboardSource(tenantId: string, name: string, url: string): Promise<string>;
  commissionSource(tenantId: string, sourceId: string): Promise<void>;
  decommissionSource(tenantId: string, sourceId: string): Promise<void>;
  retireSource(tenantId: string, sourceId: string): Promise<void>;
  reportNavigationFailure(tenantId: string, sourceId: string): Promise<void>;
  acknowledgeNavigationSuccess(tenantId: string, sourceId: string): Promise<void>;
  nominateForNavigation(tenantId: string, limit: number): Promise<SourceRecord[]>;
  resolveNavigationBrief(tenantId: string, sourceId: string): Promise<NavigationBrief>;
}

import type { EventRecord, EventSchedule } from "@unlock-events/event-access";

export type { EventRecord, EventSchedule };

/** R2: Event Access activities — task queue: "event-access" */
export interface EventAccessActivities {
  ingestEvent(
    tenantId: string,
    sourceId: string,
    eventData: Omit<EventRecord, "id" | "status" | "canonicalId" | "createdAt">
  ): Promise<string>;
  publishEvent(tenantId: string, eventId: string): Promise<void>;
  cancelEvent(tenantId: string, eventId: string): Promise<void>;
  consolidateEvents(tenantId: string, duplicateId: string, canonicalId: string): Promise<void>;
  compileEventSchedule(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<EventSchedule>;
  resolveEventForProcessing(tenantId: string, eventId: string): Promise<EventRecord>;
}

import type {
  ObservationBundle as CaptureObservationBundle,
  EnvironmentDrift,
} from "@unlock-events/capture-access";

export type { CaptureObservationBundle, EnvironmentDrift };

/** R3: Capture Access activities — task queue: "capture-access" */
export interface CaptureAccessActivities {
  preserveCapture(tenantId: string, bundle: Omit<CaptureObservationBundle, "id">): Promise<string>;
  recallCapture(tenantId: string, captureId: string): Promise<CaptureObservationBundle>;
  confirmExtraction(tenantId: string, captureId: string): Promise<void>;
  detectEnvironmentDrift(tenantId: string, sourceId: string): Promise<EnvironmentDrift>;
}

import type {
  NavigationSession,
  ObservationBundle as NavigatorObservationBundle,
  EnvironmentAction,
} from "@unlock-events/environment-navigator";

export type { NavigationSession, NavigatorObservationBundle, EnvironmentAction };

/** R4: Environment Navigator activities — task queue: "environment-navigator" */
export interface EnvironmentNavigatorActivities {
  enterEnvironment(sourceId: string): Promise<NavigationSession>;
  traverseTo(sessionId: string, url: string): Promise<NavigatorObservationBundle>;
  performAction(sessionId: string, action: EnvironmentAction): Promise<NavigatorObservationBundle>;
  exitEnvironment(sessionId: string): Promise<void>;
}

import type {
  ExperimentConfig,
  ExperimentPhase,
  BudgetUsageEntry,
  BudgetSummary,
} from "@unlock-events/experiment-access";

export type { ExperimentConfig, ExperimentPhase, BudgetUsageEntry, BudgetSummary };

/** R5: Experiment Access activities — task queue: "experiment-access" */
export interface ExperimentAccessActivities {
  beginExperiment(tenantId: string, sourceId: string, config: ExperimentConfig): Promise<string>;
  submitForAnalysis(tenantId: string, expKey: string, snapshot: unknown): Promise<string>;
  prepareAnalysisContext(tenantId: string, analysisKey: string): Promise<unknown>;
  provideVerdict(tenantId: string, analysisKey: string, decision: unknown): Promise<void>;
  acceptVerdict(tenantId: string, analysisKey: string): Promise<unknown>;
  recordOutcome(tenantId: string, expKey: string, outcome: unknown): Promise<void>;
  advancePhase(tenantId: string, expKey: string, newPhase: ExperimentPhase): Promise<void>;
  completeExperiment(tenantId: string, expKey: string): Promise<unknown>;
  consumeBudget(
    tenantId: string,
    expKey: string,
    usage: BudgetUsageEntry[]
  ): Promise<BudgetSummary>;
}

// ─── Utility Activity Interfaces (U2-U5) ────────────────────────────────────

import type { ModelTier, UsageRecord } from "@unlock-events/ai-gateway";

export type { ModelTier, UsageRecord };

/** Serializable aggregate usage (Record instead of Map for Temporal) */
export interface SerializableAggregateUsage {
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  perModel: Record<string, { tokens: number; cost: number; requests: number }>;
}

/** U2: AI Gateway activities — task queue: "ai-gateway" */
export interface AIGatewayActivities {
  chat(params: {
    messages: Array<{ role: string; content: string }>;
    model?: ModelTier | string;
  }): Promise<{ content: string; usage?: UsageRecord }>;
  getUsage(): Promise<SerializableAggregateUsage>;
  resetUsage(): Promise<void>;
}

import type {
  CadenceFrequency,
  SourceSchedule,
  NavigationRosterEntry,
  CadenceAdjustment,
} from "@unlock-events/scheduler";

export type { CadenceFrequency, SourceSchedule, NavigationRosterEntry, CadenceAdjustment };

/** U3: Scheduler activities — task queue: "scheduler" */
export interface SchedulerActivities {
  scheduleNextNavigation(
    sourceId: string,
    frequency: CadenceFrequency,
    lastNavigatedAt: string | null
  ): Promise<SourceSchedule>;
  assembleNavigationRoster(sourceIds: string[], asOf?: string): Promise<NavigationRosterEntry[]>;
  adjustCadence(
    sourceId: string,
    newFrequency: CadenceFrequency,
    reason: string
  ): Promise<CadenceAdjustment>;
}

import type { Learning } from "@unlock-events/memory";

export type { Learning };

/** Serializable recall result (Record instead of Map for Temporal) */
export interface SerializableRecallResult {
  domain: string;
  answers: Record<string, string>;
}

/** U4: Memory activities — task queue: "memory" */
export interface MemoryActivities {
  recall(domain: string, patterns: string[]): Promise<SerializableRecallResult>;
  remember(learnings: Learning[]): Promise<void>;
}

import type { WebSearchResult } from "@unlock-events/web-search";

export type { WebSearchResult };

/** U5: Web Search activities — task queue: "web-search" */
export interface WebSearchActivities {
  search(query: string): Promise<WebSearchResult[]>;
}

// ─── Engine Child Workflow Interfaces (E1-E3) ───────────────────────────────

import type { AnalysisContext, AnalysisVerdict, Hypothesis } from "@unlock-events/discovery-engine";

export type { AnalysisContext, AnalysisVerdict, Hypothesis };

/** E1: Discovery Engine child workflow signatures — task queue: "discovery-engine" */
export interface DiscoveryEngineWorkflows {
  synthesizeVerdict(context: AnalysisContext): Promise<AnalysisVerdict>;
  formulateHypotheses(sourceId: string, url: string, hints?: string[]): Promise<Hypothesis[]>;
}

import type { ExtractionResult, FeedContent } from "@unlock-events/extraction-engine";

export type { ExtractionResult, FeedContent };

/** E2: Extraction Engine child workflow signatures — task queue: "extraction-engine" */
export interface ExtractionEngineWorkflows {
  extractEvents(tenantId: string, captureId: string): Promise<ExtractionResult>;
  extractFromFeed(tenantId: string, feed: FeedContent): Promise<ExtractionResult>;
}

import type { DedupCandidate, DedupJudgment } from "@unlock-events/dedup-engine";

export type { DedupCandidate, DedupJudgment };

/** E3: Dedup Engine child workflow signatures — task queue: "dedup-engine" */
export interface DedupEngineWorkflows {
  surfaceDuplicateCandidates(tenantId: string, eventId: string): Promise<DedupCandidate[]>;
  adjudicatePair(tenantId: string, eventA: string, eventB: string): Promise<DedupJudgment>;
}

// ─── Manager Top-Level Workflow Interfaces (M1-M2) ──────────────────────────

import type { DiscoveryRequest, DiscoveryResult } from "@unlock-events/ingestion-manager";

export type { DiscoveryRequest, DiscoveryResult };

/** M1: Ingestion Manager workflow signatures — task queue: "ingestion-manager" */
export interface IngestionManagerWorkflows {
  orchestrateDiscoveryCycle(request: DiscoveryRequest): Promise<DiscoveryResult>;
  resumeDiscovery(request: DiscoveryRequest, checkpointId: string): Promise<DiscoveryResult>;
}

import type { EventProcessingResult, BatchProcessingResult } from "@unlock-events/event-manager";

export type { EventProcessingResult, BatchProcessingResult };

/** M2: Event Manager workflow signatures — task queue: "event-manager" */
export interface EventManagerWorkflows {
  processNewEvent(tenantId: string, eventId: string): Promise<EventProcessingResult>;
  processBatch(tenantId: string, eventIds: string[]): Promise<BatchProcessingResult>;
}

// ─── Task Queue Constants ───────────────────────────────────────────────────

export const TASK_QUEUES = {
  SOURCE_ACCESS: "source-access",
  EVENT_ACCESS: "event-access",
  CAPTURE_ACCESS: "capture-access",
  ENVIRONMENT_NAVIGATOR: "environment-navigator",
  EXPERIMENT_ACCESS: "experiment-access",
  AI_GATEWAY: "ai-gateway",
  SCHEDULER: "scheduler",
  MEMORY: "memory",
  WEB_SEARCH: "web-search",
  DISCOVERY_ENGINE: "discovery-engine",
  EXTRACTION_ENGINE: "extraction-engine",
  DEDUP_ENGINE: "dedup-engine",
  INGESTION_MANAGER: "ingestion-manager",
  EVENT_MANAGER: "event-manager",
} as const;
