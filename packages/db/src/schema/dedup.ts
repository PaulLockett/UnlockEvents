import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  decimal,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { tenant } from "./tenant.js";
import { event } from "./event.js";

/**
 * Dedup match status
 */
export type DedupStatus = "pending" | "confirmed" | "rejected";

/**
 * Match reasons stored in match_reasons JSONB
 */
export interface MatchReasons {
  titleSimilarity?: number;
  dateMatch?: boolean;
  locationMatch?: boolean;
  orgOverlap?: string[];
  urlSimilarity?: number;
  descriptionSimilarity?: number;
}

export const dedupMatch = pgTable(
  "dedup_match",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    eventAId: uuid("event_a_id")
      .notNull()
      .references(() => event.id),
    eventBId: uuid("event_b_id")
      .notNull()
      .references(() => event.id),
    confidenceScore: decimal("confidence_score", {
      precision: 5,
      scale: 4,
    }).notNull(),
    status: text("status").notNull().default("pending").$type<DedupStatus>(),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    matchReasons: jsonb("match_reasons").default({}).$type<MatchReasons>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("dedup_match_tenant_idx").on(table.tenantId),
    index("dedup_match_event_a_idx").on(table.eventAId),
    index("dedup_match_event_b_idx").on(table.eventBId),
    index("dedup_match_pending_idx").on(table.tenantId, table.status),
  ]
);

/**
 * Field weights for dedup scoring stored in field_weights JSONB
 */
export interface FieldWeights {
  title?: number;
  date?: number;
  location?: number;
  organization?: number;
  description?: number;
}

export const dedupConfig = pgTable(
  "dedup_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    autoMergeThreshold: decimal("auto_merge_threshold", {
      precision: 5,
      scale: 4,
    })
      .notNull()
      .default("0.95"),
    reviewThreshold: decimal("review_threshold", { precision: 5, scale: 4 })
      .notNull()
      .default("0.70"),
    rejectionThreshold: decimal("rejection_threshold", {
      precision: 5,
      scale: 4,
    })
      .notNull()
      .default("0.30"),
    fieldWeights: jsonb("field_weights")
      .default({
        title: 0.3,
        date: 0.25,
        location: 0.2,
        organization: 0.15,
        description: 0.1,
      })
      .$type<FieldWeights>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("dedup_config_tenant_idx").on(table.tenantId)]
);
