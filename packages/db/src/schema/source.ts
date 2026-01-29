import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenant } from "./tenant.js";

/**
 * Source categories define how to crawl
 */
export type SourceCategory = "web_page" | "social_post" | "feed" | "api" | "manual";

/**
 * Source status
 */
export type SourceStatus = "active" | "paused" | "error" | "archived";

/**
 * Crawl configuration stored in crawl_config JSONB
 */
export interface CrawlConfig {
  depth?: number;
  frequencyHours?: number;
  rateLimitMs?: number;
  selectors?: {
    eventList?: string;
    pagination?: string;
  };
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

/**
 * Provenance tracking stored in provenance JSONB
 */
export interface Provenance {
  sourceId?: string;
  crawledPageId?: string;
  extractionMethod?: "ai" | "manual" | "structured";
  confidence?: number;
  extractedAt?: string;
  modelVersion?: string;
}

export const source = pgTable(
  "source",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    version: integer("version").notNull().default(1),
    category: text("category").notNull().$type<SourceCategory>(),
    platform: text("platform"),
    name: text("name").notNull(),
    url: text("url").notNull(),
    feedUrl: text("feed_url"),
    description: text("description"),
    crawlConfig: jsonb("crawl_config").default({}).$type<CrawlConfig>(),
    status: text("status").notNull().default("active").$type<SourceStatus>(),
    lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
    nextCrawlAt: timestamp("next_crawl_at", { withTimezone: true }),
    provenance: jsonb("provenance").default({}).$type<Provenance>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("source_tenant_idx").on(table.tenantId),
    index("source_next_crawl_idx").on(table.tenantId, table.nextCrawlAt),
  ]
);

/**
 * Crawled page status
 */
export type CrawledPageStatus = "pending" | "fetched" | "parsed" | "failed";

export const crawledPage = pgTable(
  "crawled_page",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => source.id),
    parentPageId: uuid("parent_page_id"),
    version: integer("version").notNull().default(1),
    url: text("url").notNull(),
    depth: integer("depth").notNull().default(0),
    contentHash: text("content_hash"),
    storagePath: text("storage_path"),
    status: text("status").notNull().default("pending").$type<CrawledPageStatus>(),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    provenance: jsonb("provenance").default({}).$type<Provenance>(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("crawled_page_tenant_idx").on(table.tenantId),
    index("crawled_page_source_idx").on(table.sourceId),
    uniqueIndex("crawled_page_url_idx").on(table.tenantId, table.url),
  ]
);
