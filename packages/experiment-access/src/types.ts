/**
 * R5: Experiment Access — Public Interface
 *
 * Technology-agnostic interface for experiment lifecycle management.
 * No Drizzle or Supabase types leak through this boundary.
 */

export type ExperimentPhase = "exploration" | "refinement" | "optimization" | "production";
export type ExperimentStatus = "active" | "completed" | "failed" | "cancelled";
export type BudgetStrategy = "hard_cap" | "soft_limit" | "elastic";

export interface BudgetAllocation {
  platform: string;
  dimension: string;
  total: number;
  unit: string;
}

export interface BudgetEntry {
  platform: string;
  dimension: string;
  total: number;
  used: number;
  remaining: number;
  unit: string;
}

export interface BudgetSummary {
  strategy: BudgetStrategy;
  entries: BudgetEntry[];
}

export interface BudgetUsageEntry {
  platform: string;
  dimension: string;
  amount: number;
}

export interface ExperimentConfig {
  name: string;
  notes?: string;
  budget: {
    strategy: BudgetStrategy;
    allocations: BudgetAllocation[];
  };
}

export interface ExperimentAccess {
  /** Initialize a new experiment for a source. Returns experiment key (UUID). */
  beginExperiment(tenantId: string, sourceId: string, config: ExperimentConfig): Promise<string>;

  /** Submit observations for E1 analysis. Returns analysis key (UUID). */
  submitForAnalysis(tenantId: string, expKey: string, snapshot: unknown): Promise<string>;

  /** Gather context needed for E1 analysis. Enforces status=pending. */
  prepareAnalysisContext(tenantId: string, analysisKey: string): Promise<unknown>;

  /** Submit E1's analysis conclusion. Enforces status=context_prepared. */
  provideVerdict(tenantId: string, analysisKey: string, decision: unknown): Promise<void>;

  /** Accept verdict and retrieve decision. Enforces status=verdict_provided. */
  acceptVerdict(tenantId: string, analysisKey: string): Promise<unknown>;

  /** Log execution results as an append-only outcome record. */
  recordOutcome(tenantId: string, expKey: string, outcome: unknown): Promise<void>;

  /** Transition experiment to next convergence phase. Uses optimistic locking. */
  advancePhase(tenantId: string, expKey: string, newPhase: ExperimentPhase): Promise<void>;

  /** Finalize experiment, extract converged program. Uses optimistic locking. */
  completeExperiment(tenantId: string, expKey: string): Promise<unknown>;

  /** Deduct from experiment budget. Returns updated summary. */
  consumeBudget(
    tenantId: string,
    expKey: string,
    usage: BudgetUsageEntry[]
  ): Promise<BudgetSummary>;
}

export interface ExperimentAccessConfig {
  connectionString?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  storageBucket?: string;
}
