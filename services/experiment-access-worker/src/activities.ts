import { createExperimentAccess } from "@unlock-events/experiment-access";
import type {
  ExperimentAccess,
  ExperimentConfig,
  ExperimentPhase,
  BudgetUsageEntry,
  BudgetSummary,
} from "@unlock-events/experiment-access";

let instance: ExperimentAccess | null = null;

function getInstance(): ExperimentAccess {
  if (!instance) {
    instance = createExperimentAccess({
      connectionString: process.env["DATABASE_URL"],
      supabaseUrl: process.env["SUPABASE_URL"],
      supabaseKey: process.env["SUPABASE_SERVICE_KEY"],
      storageBucket: process.env["SUPABASE_STORAGE_BUCKET"],
    });
  }
  return instance;
}

export async function beginExperiment(
  tenantId: string,
  sourceId: string,
  config: ExperimentConfig
): Promise<string> {
  return getInstance().beginExperiment(tenantId, sourceId, config);
}

export async function submitForAnalysis(
  tenantId: string,
  expKey: string,
  snapshot: unknown
): Promise<string> {
  return getInstance().submitForAnalysis(tenantId, expKey, snapshot);
}

export async function prepareAnalysisContext(
  tenantId: string,
  analysisKey: string
): Promise<unknown> {
  return getInstance().prepareAnalysisContext(tenantId, analysisKey);
}

export async function provideVerdict(
  tenantId: string,
  analysisKey: string,
  decision: unknown
): Promise<void> {
  return getInstance().provideVerdict(tenantId, analysisKey, decision);
}

export async function acceptVerdict(tenantId: string, analysisKey: string): Promise<unknown> {
  return getInstance().acceptVerdict(tenantId, analysisKey);
}

export async function recordOutcome(
  tenantId: string,
  expKey: string,
  outcome: unknown
): Promise<void> {
  return getInstance().recordOutcome(tenantId, expKey, outcome);
}

export async function advancePhase(
  tenantId: string,
  expKey: string,
  newPhase: ExperimentPhase
): Promise<void> {
  return getInstance().advancePhase(tenantId, expKey, newPhase);
}

export async function completeExperiment(tenantId: string, expKey: string): Promise<unknown> {
  return getInstance().completeExperiment(tenantId, expKey);
}

export async function consumeBudget(
  tenantId: string,
  expKey: string,
  usage: BudgetUsageEntry[]
): Promise<BudgetSummary> {
  return getInstance().consumeBudget(tenantId, expKey, usage);
}
