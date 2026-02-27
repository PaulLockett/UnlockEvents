/**
 * E1: Discovery Engine — Public Interface
 *
 * Encapsulates navigation intelligence — LLM program synthesis
 * and the convergence funnel.
 * E1 only runs when M1 calls it (never self-triggers).
 * E1 calls R5 during verdict synthesis (M1→E1→R5 collaboration).
 * Technology-agnostic interface.
 */

export type ConvergencePhase = "exploration" | "refinement" | "optimization" | "production";

export interface ProgramStep {
  action: string;
  selector?: string;
  value?: string;
  waitMs?: number;
  description: string;
}

export interface InteractionProgram {
  steps: ProgramStep[];
  phase: ConvergencePhase;
  confidence: number;
  version: number;
}

export interface AnalysisContext {
  experimentKey: string;
  sourceId: string;
  currentPhase: ConvergencePhase;
  currentProgram: InteractionProgram | null;
  observations: unknown;
}

export interface AnalysisVerdict {
  action: "continue" | "advance_phase" | "restart" | "complete";
  updatedProgram: InteractionProgram;
  reasoning: string;
  confidence: number;
}

export interface Hypothesis {
  id: string;
  strategy: string;
  initialProgram: InteractionProgram;
  rationale: string;
}

export interface DiscoveryEngine {
  /** Analyze observations and produce a judgment with an updated interaction program. */
  synthesizeVerdict(context: AnalysisContext): Promise<AnalysisVerdict>;

  /** Generate initial navigation strategies for a new environment. */
  formulateHypotheses(sourceId: string, url: string, hints?: string[]): Promise<Hypothesis[]>;
}

export interface DiscoveryEngineConfig {
  aiGateway?: unknown;
  experimentAccess?: unknown;
}
