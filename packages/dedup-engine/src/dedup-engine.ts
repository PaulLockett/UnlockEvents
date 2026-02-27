import type { DedupEngine, DedupEngineConfig, DedupCandidate, DedupJudgment } from "./types.js";

export function createDedupEngine(config: DedupEngineConfig = {}): DedupEngine {
  void config;

  return {
    async surfaceDuplicateCandidates(tenantId: string, eventId: string): Promise<DedupCandidate[]> {
      console.log(`[E3:stub] surfaceDuplicateCandidates tenant=${tenantId} event=${eventId}`);
      return [];
    },

    async adjudicatePair(tenantId: string, eventA: string, eventB: string): Promise<DedupJudgment> {
      console.log(`[E3:stub] adjudicatePair tenant=${tenantId} eventA=${eventA} eventB=${eventB}`);
      return {
        eventA,
        eventB,
        verdict: "distinct",
        confidence: 0,
        reasoning: "stub judgment — no real comparison performed",
      };
    },
  };
}
