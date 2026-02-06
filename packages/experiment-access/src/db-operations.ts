import { eq, and, sql } from "drizzle-orm";
import type { Database } from "@unlock-events/db";
import {
  experiment,
  experimentBudget,
  analysisRequest,
  experimentOutcome,
} from "@unlock-events/db";
import type { BudgetAllocation } from "./types.js";

export interface DbOperations {
  insertExperiment(values: {
    tenantId: string;
    sourceId: string;
    name: string;
    notes?: string;
    phase: string;
    status: string;
    budgetStrategy: string;
  }): Promise<string>;

  insertBudgetAllocations(
    experimentId: string,
    tenantId: string,
    allocations: BudgetAllocation[]
  ): Promise<void>;

  insertAnalysisRequest(values: {
    tenantId: string;
    experimentId: string;
    snapshotPath: string;
    status: string;
  }): Promise<string>;

  insertOutcome(values: {
    tenantId: string;
    experimentId: string;
    outcomePath: string;
  }): Promise<string>;

  findExperiment(
    expKey: string,
    tenantId: string
  ): Promise<{
    id: string;
    tenantId: string;
    sourceId: string;
    version: number;
    name: string;
    notes: string | null;
    phase: string;
    status: string;
    budgetStrategy: string;
    program: unknown;
  } | null>;

  findAnalysisRequest(
    analysisKey: string,
    tenantId: string
  ): Promise<{
    id: string;
    tenantId: string;
    experimentId: string;
    snapshotPath: string | null;
    contextPath: string | null;
    verdictPath: string | null;
    status: string;
  } | null>;

  findBudgetEntries(expKey: string): Promise<
    Array<{
      platform: string;
      dimension: string;
      total: string;
      used: string;
      unit: string;
    }>
  >;

  updateAnalysisRequestStatus(
    analysisKey: string,
    status: string,
    updates: Record<string, string>
  ): Promise<void>;

  updateExperimentPhase(
    expKey: string,
    tenantId: string,
    newPhase: string,
    currentVersion: number
  ): Promise<number>;

  completeExperiment(expKey: string, tenantId: string, currentVersion: number): Promise<number>;

  consumeBudget(
    expKey: string,
    platform: string,
    dimension: string,
    amount: number
  ): Promise<number>;
}

export function createDbOperations(db: Database): DbOperations {
  return {
    async insertExperiment(values) {
      const [row] = await db
        .insert(experiment)
        .values({
          tenantId: values.tenantId,
          sourceId: values.sourceId,
          name: values.name,
          notes: values.notes,
          phase: values.phase as "exploration",
          status: values.status as "active",
          budgetStrategy: values.budgetStrategy as "hard_cap",
        })
        .returning({ id: experiment.id });
      return row!.id;
    },

    async insertBudgetAllocations(experimentId, tenantId, allocations) {
      if (allocations.length === 0) return;
      await db.insert(experimentBudget).values(
        allocations.map((a) => ({
          experimentId,
          tenantId,
          platform: a.platform,
          dimension: a.dimension,
          total: String(a.total),
          used: "0",
          unit: a.unit,
        }))
      );
    },

    async insertAnalysisRequest(values) {
      const [row] = await db
        .insert(analysisRequest)
        .values({
          tenantId: values.tenantId,
          experimentId: values.experimentId,
          snapshotPath: values.snapshotPath,
          status: values.status as "pending",
        })
        .returning({ id: analysisRequest.id });
      return row!.id;
    },

    async insertOutcome(values) {
      const [row] = await db
        .insert(experimentOutcome)
        .values({
          tenantId: values.tenantId,
          experimentId: values.experimentId,
          outcomePath: values.outcomePath,
        })
        .returning({ id: experimentOutcome.id });
      return row!.id;
    },

    async findExperiment(expKey, tenantId) {
      const rows = await db
        .select()
        .from(experiment)
        .where(and(eq(experiment.id, expKey), eq(experiment.tenantId, tenantId)))
        .limit(1);
      if (rows.length === 0) return null;
      const row = rows[0]!;
      return {
        id: row.id,
        tenantId: row.tenantId,
        sourceId: row.sourceId,
        version: row.version,
        name: row.name,
        notes: row.notes,
        phase: row.phase,
        status: row.status,
        budgetStrategy: row.budgetStrategy,
        program: row.program,
      };
    },

    async findAnalysisRequest(analysisKey, tenantId) {
      const rows = await db
        .select()
        .from(analysisRequest)
        .where(and(eq(analysisRequest.id, analysisKey), eq(analysisRequest.tenantId, tenantId)))
        .limit(1);
      if (rows.length === 0) return null;
      const row = rows[0]!;
      return {
        id: row.id,
        tenantId: row.tenantId,
        experimentId: row.experimentId,
        snapshotPath: row.snapshotPath,
        contextPath: row.contextPath,
        verdictPath: row.verdictPath,
        status: row.status,
      };
    },

    async findBudgetEntries(expKey) {
      const rows = await db
        .select()
        .from(experimentBudget)
        .where(eq(experimentBudget.experimentId, expKey));
      return rows.map((r) => ({
        platform: r.platform,
        dimension: r.dimension,
        total: r.total,
        used: r.used,
        unit: r.unit,
      }));
    },

    async updateAnalysisRequestStatus(analysisKey, status, updates) {
      const setValues: Record<string, unknown> = {
        status: status as "pending",
        updatedAt: new Date(),
      };
      if (updates["contextPath"]) {
        setValues["contextPath"] = updates["contextPath"];
      }
      if (updates["verdictPath"]) {
        setValues["verdictPath"] = updates["verdictPath"];
      }
      await db.update(analysisRequest).set(setValues).where(eq(analysisRequest.id, analysisKey));
    },

    async updateExperimentPhase(expKey, tenantId, newPhase, currentVersion) {
      const result = await db
        .update(experiment)
        .set({
          phase: newPhase as "exploration",
          version: currentVersion + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(experiment.id, expKey),
            eq(experiment.tenantId, tenantId),
            eq(experiment.version, currentVersion)
          )
        )
        .returning({ id: experiment.id });
      return result.length;
    },

    async completeExperiment(expKey, tenantId, currentVersion) {
      const result = await db
        .update(experiment)
        .set({
          status: "completed",
          version: currentVersion + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(experiment.id, expKey),
            eq(experiment.tenantId, tenantId),
            eq(experiment.status, "active"),
            eq(experiment.version, currentVersion)
          )
        )
        .returning({ id: experiment.id });
      return result.length;
    },

    async consumeBudget(expKey, platform, dimension, amount) {
      const result = await db
        .update(experimentBudget)
        .set({
          used: sql`${experimentBudget.used}::numeric + ${String(amount)}::numeric`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(experimentBudget.experimentId, expKey),
            eq(experimentBudget.platform, platform),
            eq(experimentBudget.dimension, dimension)
          )
        )
        .returning({ id: experimentBudget.id });
      return result.length;
    },
  };
}
