import { eq, and, isNull, asc, sql } from "drizzle-orm";
import type { Database } from "@unlock-events/db";
import { source } from "@unlock-events/db";

export interface SourceRow {
  id: string;
  tenantId: string;
  version: number;
  name: string;
  url: string;
  feedUrl: string | null;
  category: string;
  platform: string | null;
  status: string;
  crawlConfig: Record<string, unknown>;
  lastCrawledAt: Date | null;
  nextCrawlAt: Date | null;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface DbOperations {
  insertSource(values: {
    tenantId: string;
    name: string;
    url: string;
    category: string;
    platform?: string;
    feedUrl?: string;
    status: string;
  }): Promise<string>;

  findSource(sourceId: string, tenantId: string): Promise<SourceRow | null>;

  updateSourceStatus(
    sourceId: string,
    tenantId: string,
    newStatus: string,
    currentVersion: number
  ): Promise<number>;

  incrementFailureCount(sourceId: string, tenantId: string): Promise<number>;

  resetFailureCountAndTouch(sourceId: string, tenantId: string): Promise<number>;

  findSourcesDueForNavigation(tenantId: string, limit: number, asOf: Date): Promise<SourceRow[]>;
}

export function createDbOperations(db: Database): DbOperations {
  return {
    async insertSource(values) {
      const [row] = await db
        .insert(source)
        .values({
          tenantId: values.tenantId,
          name: values.name,
          url: values.url,
          category: values.category as "web_page",
          platform: values.platform,
          feedUrl: values.feedUrl,
          status: values.status as "active",
        })
        .returning({ id: source.id });
      return row!.id;
    },

    async findSource(sourceId, tenantId) {
      const rows = await db
        .select()
        .from(source)
        .where(
          and(eq(source.id, sourceId), eq(source.tenantId, tenantId), isNull(source.deletedAt))
        )
        .limit(1);
      if (rows.length === 0) return null;
      const row = rows[0]!;
      return {
        id: row.id,
        tenantId: row.tenantId,
        version: row.version,
        name: row.name,
        url: row.url,
        feedUrl: row.feedUrl,
        category: row.category,
        platform: row.platform,
        status: row.status,
        crawlConfig: (row.crawlConfig ?? {}) as Record<string, unknown>,
        lastCrawledAt: row.lastCrawledAt,
        nextCrawlAt: row.nextCrawlAt,
        createdAt: row.createdAt,
        metadata: {},
      };
    },

    async updateSourceStatus(sourceId, tenantId, newStatus, currentVersion) {
      const result = await db
        .update(source)
        .set({
          status: newStatus as "active",
          version: currentVersion + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(source.id, sourceId),
            eq(source.tenantId, tenantId),
            eq(source.version, currentVersion),
            isNull(source.deletedAt)
          )
        )
        .returning({ id: source.id });
      return result.length;
    },

    async incrementFailureCount(sourceId, tenantId) {
      const result = await db
        .update(source)
        .set({
          status: "error" as const,
          updatedAt: new Date(),
        })
        .where(
          and(eq(source.id, sourceId), eq(source.tenantId, tenantId), isNull(source.deletedAt))
        )
        .returning({ id: source.id });
      return result.length;
    },

    async resetFailureCountAndTouch(sourceId, tenantId) {
      const result = await db
        .update(source)
        .set({
          status: "active" as const,
          lastCrawledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(source.id, sourceId), eq(source.tenantId, tenantId), isNull(source.deletedAt))
        )
        .returning({ id: source.id });
      return result.length;
    },

    async findSourcesDueForNavigation(tenantId, limit, asOf) {
      const rows = await db
        .select()
        .from(source)
        .where(
          and(
            eq(source.tenantId, tenantId),
            eq(source.status, "active"),
            isNull(source.deletedAt),
            sql`(${source.nextCrawlAt} IS NULL OR ${source.nextCrawlAt} <= ${asOf})`
          )
        )
        .orderBy(asc(source.nextCrawlAt))
        .limit(limit);

      return rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        version: row.version,
        name: row.name,
        url: row.url,
        feedUrl: row.feedUrl,
        category: row.category,
        platform: row.platform,
        status: row.status,
        crawlConfig: (row.crawlConfig ?? {}) as Record<string, unknown>,
        lastCrawledAt: row.lastCrawledAt,
        nextCrawlAt: row.nextCrawlAt,
        createdAt: row.createdAt,
        metadata: {},
      }));
    },
  };
}
