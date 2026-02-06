import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenant } from "./tenant.js";
import { source } from "./source.js";

/**
 * Experiment convergence phase
 */
export type ExperimentPhase = "exploration" | "refinement" | "optimization" | "production";

/**
 * Experiment lifecycle status
 */
export type ExperimentStatus = "active" | "completed" | "failed" | "cancelled";

/**
 * Budget enforcement strategy
 */
export type BudgetStrategy = "hard_cap" | "soft_limit" | "elastic";

/**
 * Analysis request status — strict ordering enforced
 */
export type AnalysisRequestStatus =
  | "pending"
  | "context_prepared"
  | "verdict_provided"
  | "accepted";

export const experiment = pgTable(
  "experiment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => source.id),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    notes: text("notes"),
    phase: text("phase").notNull().default("exploration").$type<ExperimentPhase>(),
    status: text("status").notNull().default("active").$type<ExperimentStatus>(),
    budgetStrategy: text("budget_strategy").notNull().$type<BudgetStrategy>(),
    program: jsonb("program").$type<unknown>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("experiment_tenant_idx").on(table.tenantId),
    index("experiment_tenant_source_idx").on(table.tenantId, table.sourceId),
    index("experiment_tenant_status_idx").on(table.tenantId, table.status),
  ]
);

export const experimentBudget = pgTable(
  "experiment_budget",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiment.id),
    platform: text("platform").notNull(),
    dimension: text("dimension").notNull(),
    total: numeric("total").notNull(),
    used: numeric("used").notNull().default("0"),
    unit: text("unit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("experiment_budget_experiment_idx").on(table.experimentId),
    uniqueIndex("experiment_budget_unique_idx").on(
      table.experimentId,
      table.platform,
      table.dimension
    ),
  ]
);

export const analysisRequest = pgTable(
  "analysis_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiment.id),
    snapshotPath: text("snapshot_path"),
    contextPath: text("context_path"),
    verdictPath: text("verdict_path"),
    status: text("status").notNull().default("pending").$type<AnalysisRequestStatus>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("analysis_request_experiment_idx").on(table.experimentId),
    index("analysis_request_experiment_status_idx").on(table.experimentId, table.status),
  ]
);

export const experimentOutcome = pgTable(
  "experiment_outcome",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiment.id),
    outcomePath: text("outcome_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("experiment_outcome_experiment_idx").on(table.experimentId)]
);
