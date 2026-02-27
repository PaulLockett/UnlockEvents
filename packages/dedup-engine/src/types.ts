/**
 * E3: Dedup Engine — Public Interface
 *
 * Encapsulates event identity resolution — what counts as "the same event."
 * E3 calls R2 (resolveEventForProcessing) to access event data for comparison.
 * Technology-agnostic interface.
 */

export type DedupVerdict = "duplicate" | "distinct" | "uncertain";

export interface DedupCandidate {
  eventId: string;
  title: string;
  startDate: string;
  location: string | null;
  similarity: number;
}

export interface DedupJudgment {
  eventA: string;
  eventB: string;
  verdict: DedupVerdict;
  confidence: number;
  reasoning: string;
}

export interface DedupEngine {
  /** Identify potential duplicates for a newly ingested event. */
  surfaceDuplicateCandidates(tenantId: string, eventId: string): Promise<DedupCandidate[]>;

  /** Render a judgment on whether two events are the same. */
  adjudicatePair(tenantId: string, eventA: string, eventB: string): Promise<DedupJudgment>;
}

export interface DedupEngineConfig {
  aiGateway?: unknown;
  eventAccess?: unknown;
}
