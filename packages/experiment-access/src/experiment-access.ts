import { createClient } from "@supabase/supabase-js";
import { createDatabase } from "@unlock-events/db";
import { createStorage } from "./storage.js";
import { createDbOperations } from "./db-operations.js";
import type {
  ExperimentAccess,
  ExperimentAccessConfig,
  ExperimentConfig,
  ExperimentPhase,
  BudgetUsageEntry,
  BudgetSummary,
  BudgetEntry,
} from "./types.js";

export function createExperimentAccess(config: ExperimentAccessConfig = {}): ExperimentAccess {
  const connectionString = config.connectionString ?? process.env["DATABASE_URL"];
  const supabaseUrl = config.supabaseUrl ?? process.env["SUPABASE_URL"];
  const supabaseKey = config.supabaseKey ?? process.env["SUPABASE_SERVICE_KEY"];
  const bucket = config.storageBucket ?? "experiments";

  if (!connectionString) throw new Error("DATABASE_URL or connectionString is required");
  if (!supabaseUrl) throw new Error("SUPABASE_URL or supabaseUrl is required");
  if (!supabaseKey) throw new Error("SUPABASE_SERVICE_KEY or supabaseKey is required");

  const db = createDatabase(connectionString);
  const supabase = createClient(supabaseUrl, supabaseKey);
  const storage = createStorage(supabase, bucket);
  const ops = createDbOperations(db);

  return {
    async beginExperiment(
      tenantId: string,
      sourceId: string,
      expConfig: ExperimentConfig
    ): Promise<string> {
      const expId = await ops.insertExperiment({
        tenantId,
        sourceId,
        name: expConfig.name,
        notes: expConfig.notes,
        phase: "exploration",
        status: "active",
        budgetStrategy: expConfig.budget.strategy,
      });

      await ops.insertBudgetAllocations(expId, tenantId, expConfig.budget.allocations);

      return expId;
    },

    async submitForAnalysis(tenantId: string, expKey: string, snapshot: unknown): Promise<string> {
      const exp = await ops.findExperiment(expKey, tenantId);
      if (!exp) {
        throw new Error(`Experiment ${expKey} not found for tenant ${tenantId}`);
      }

      // Generate a temporary ID for the path — the real ID comes from the insert
      const tempId = crypto.randomUUID();
      const snapshotPath = `experiments/${expKey}/snapshots/${tempId}.json`;

      await storage.upload(snapshotPath, snapshot);

      const analysisId = await ops.insertAnalysisRequest({
        tenantId,
        experimentId: expKey,
        snapshotPath,
        status: "pending",
      });

      return analysisId;
    },

    async prepareAnalysisContext(tenantId: string, analysisKey: string): Promise<unknown> {
      const ar = await ops.findAnalysisRequest(analysisKey, tenantId);
      if (!ar) {
        throw new Error(`Analysis request ${analysisKey} not found for tenant ${tenantId}`);
      }
      if (ar.status !== "pending") {
        throw new Error(
          `Cannot prepare context: analysis request status is '${ar.status}', expected 'pending'`
        );
      }

      const exp = await ops.findExperiment(ar.experimentId, tenantId);
      if (!exp) {
        throw new Error(`Parent experiment ${ar.experimentId} not found`);
      }

      const budgetEntries = await ops.findBudgetEntries(ar.experimentId);
      const snapshot = ar.snapshotPath ? await storage.download(ar.snapshotPath) : null;

      const context = {
        experiment: {
          phase: exp.phase,
          budgetStrategy: exp.budgetStrategy,
          program: exp.program,
          name: exp.name,
          notes: exp.notes,
        },
        budget: budgetEntries.map((b) => ({
          platform: b.platform,
          dimension: b.dimension,
          total: Number(b.total),
          used: Number(b.used),
          remaining: Number(b.total) - Number(b.used),
          unit: b.unit,
        })),
        snapshot,
      };

      const contextPath = `experiments/${ar.experimentId}/contexts/${analysisKey}.json`;
      await storage.upload(contextPath, context);

      await ops.updateAnalysisRequestStatus(analysisKey, "context_prepared", { contextPath });

      return context;
    },

    async provideVerdict(tenantId: string, analysisKey: string, decision: unknown): Promise<void> {
      const ar = await ops.findAnalysisRequest(analysisKey, tenantId);
      if (!ar) {
        throw new Error(`Analysis request ${analysisKey} not found for tenant ${tenantId}`);
      }
      if (ar.status !== "context_prepared") {
        throw new Error(
          `Cannot provide verdict: analysis request status is '${ar.status}', expected 'context_prepared'`
        );
      }

      const verdictPath = `experiments/${ar.experimentId}/verdicts/${analysisKey}.json`;
      await storage.upload(verdictPath, decision);

      await ops.updateAnalysisRequestStatus(analysisKey, "verdict_provided", { verdictPath });
    },

    async acceptVerdict(tenantId: string, analysisKey: string): Promise<unknown> {
      const ar = await ops.findAnalysisRequest(analysisKey, tenantId);
      if (!ar) {
        throw new Error(`Analysis request ${analysisKey} not found for tenant ${tenantId}`);
      }
      if (ar.status !== "verdict_provided") {
        throw new Error(
          `Cannot accept verdict: analysis request status is '${ar.status}', expected 'verdict_provided'`
        );
      }

      const verdict = ar.verdictPath ? await storage.download(ar.verdictPath) : null;

      await ops.updateAnalysisRequestStatus(analysisKey, "accepted", {});

      return verdict;
    },

    async recordOutcome(tenantId: string, expKey: string, outcome: unknown): Promise<void> {
      const exp = await ops.findExperiment(expKey, tenantId);
      if (!exp) {
        throw new Error(`Experiment ${expKey} not found for tenant ${tenantId}`);
      }

      const outcomeId = crypto.randomUUID();
      const outcomePath = `experiments/${expKey}/outcomes/${outcomeId}.json`;
      await storage.upload(outcomePath, outcome);

      await ops.insertOutcome({
        tenantId,
        experimentId: expKey,
        outcomePath,
      });
    },

    async advancePhase(tenantId: string, expKey: string, newPhase: ExperimentPhase): Promise<void> {
      const exp = await ops.findExperiment(expKey, tenantId);
      if (!exp) {
        throw new Error(`Experiment ${expKey} not found for tenant ${tenantId}`);
      }

      const rowsUpdated = await ops.updateExperimentPhase(expKey, tenantId, newPhase, exp.version);
      if (rowsUpdated === 0) {
        throw new Error(
          `Concurrent modification conflict: experiment ${expKey} version ${exp.version} was modified by another process`
        );
      }
    },

    async completeExperiment(tenantId: string, expKey: string): Promise<unknown> {
      const exp = await ops.findExperiment(expKey, tenantId);
      if (!exp) {
        throw new Error(`Experiment ${expKey} not found for tenant ${tenantId}`);
      }

      const rowsUpdated = await ops.completeExperiment(expKey, tenantId, exp.version);
      if (rowsUpdated === 0) {
        throw new Error(
          `Concurrent modification conflict: experiment ${expKey} version ${exp.version} was modified or is not active`
        );
      }

      return exp.program;
    },

    async consumeBudget(
      tenantId: string,
      expKey: string,
      usage: BudgetUsageEntry[]
    ): Promise<BudgetSummary> {
      const exp = await ops.findExperiment(expKey, tenantId);
      if (!exp) {
        throw new Error(`Experiment ${expKey} not found for tenant ${tenantId}`);
      }

      for (const entry of usage) {
        const rowsUpdated = await ops.consumeBudget(
          expKey,
          entry.platform,
          entry.dimension,
          entry.amount
        );
        if (rowsUpdated === 0) {
          throw new Error(
            `Budget entry not found for platform='${entry.platform}', dimension='${entry.dimension}'`
          );
        }
      }

      // Reload budget entries after updates
      const budgetEntries = await ops.findBudgetEntries(expKey);
      const entries: BudgetEntry[] = budgetEntries.map((b) => ({
        platform: b.platform,
        dimension: b.dimension,
        total: Number(b.total),
        used: Number(b.used),
        remaining: Number(b.total) - Number(b.used),
        unit: b.unit,
      }));

      return {
        strategy: exp.budgetStrategy as BudgetSummary["strategy"],
        entries,
      };
    },
  };
}
