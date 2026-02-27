import type {
  DiscoveryEngine,
  DiscoveryEngineConfig,
  AnalysisContext,
  AnalysisVerdict,
  Hypothesis,
} from "./types.js";

export function createDiscoveryEngine(config: DiscoveryEngineConfig = {}): DiscoveryEngine {
  void config;

  return {
    async synthesizeVerdict(context: AnalysisContext): Promise<AnalysisVerdict> {
      console.log(
        `[E1:stub] synthesizeVerdict experiment=${context.experimentKey} phase=${context.currentPhase}`
      );
      return {
        action: "continue",
        updatedProgram: context.currentProgram ?? {
          steps: [],
          phase: context.currentPhase,
          confidence: 0,
          version: 1,
        },
        reasoning: "stub verdict — no real analysis performed",
        confidence: 0,
      };
    },

    async formulateHypotheses(
      sourceId: string,
      url: string,
      hints?: string[]
    ): Promise<Hypothesis[]> {
      console.log(
        `[E1:stub] formulateHypotheses source=${sourceId} url=${url} hints=${hints?.length ?? 0}`
      );
      return [
        {
          id: crypto.randomUUID(),
          strategy: "direct-navigation",
          initialProgram: {
            steps: [{ action: "navigate", description: `Go to ${url}` }],
            phase: "exploration",
            confidence: 0.1,
            version: 1,
          },
          rationale: "stub hypothesis — start with direct URL navigation",
        },
      ];
    },
  };
}
