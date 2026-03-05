import { eq, and, isNull, desc } from "drizzle-orm";
import type { Database } from "@unlock-events/db";
import { crawledPage } from "@unlock-events/db";

export interface CrawledPageRow {
  id: string;
  tenantId: string;
  sourceId: string;
  version: number;
  url: string;
  contentHash: string | null;
  storagePath: string | null;
  status: string;
  metadata: Record<string, unknown>;
  fetchedAt: Date | null;
  createdAt: Date;
}

export interface DbOperations {
  insertCrawledPage(values: {
    tenantId: string;
    sourceId: string;
    url: string;
    contentHash: string | null;
    storagePath: string;
    status: string;
    metadata: Record<string, unknown>;
  }): Promise<string>;

  findCrawledPage(pageId: string, tenantId: string): Promise<CrawledPageRow | null>;

  updateStatus(
    pageId: string,
    tenantId: string,
    newStatus: string,
    currentVersion: number
  ): Promise<number>;

  findLatestTwoCapturesForSource(sourceId: string, tenantId: string): Promise<CrawledPageRow[]>;
}

export function createDbOperations(db: Database): DbOperations {
  return {
    async insertCrawledPage(values) {
      const [row] = await db
        .insert(crawledPage)
        .values({
          tenantId: values.tenantId,
          sourceId: values.sourceId,
          url: values.url,
          contentHash: values.contentHash,
          storagePath: values.storagePath,
          status: values.status as "fetched",
          metadata: values.metadata,
          fetchedAt: new Date(),
        })
        .returning({ id: crawledPage.id });
      return row!.id;
    },

    async findCrawledPage(pageId, tenantId) {
      const rows = await db
        .select()
        .from(crawledPage)
        .where(
          and(
            eq(crawledPage.id, pageId),
            eq(crawledPage.tenantId, tenantId),
            isNull(crawledPage.deletedAt)
          )
        )
        .limit(1);
      if (rows.length === 0) return null;
      const row = rows[0]!;
      return {
        id: row.id,
        tenantId: row.tenantId,
        sourceId: row.sourceId,
        version: row.version,
        url: row.url,
        contentHash: row.contentHash,
        storagePath: row.storagePath,
        status: row.status,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        fetchedAt: row.fetchedAt,
        createdAt: row.createdAt,
      };
    },

    async updateStatus(pageId, tenantId, newStatus, currentVersion) {
      const result = await db
        .update(crawledPage)
        .set({
          status: newStatus as "parsed",
          version: currentVersion + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crawledPage.id, pageId),
            eq(crawledPage.tenantId, tenantId),
            eq(crawledPage.version, currentVersion),
            isNull(crawledPage.deletedAt)
          )
        )
        .returning({ id: crawledPage.id });
      return result.length;
    },

    async findLatestTwoCapturesForSource(sourceId, tenantId) {
      const rows = await db
        .select()
        .from(crawledPage)
        .where(
          and(
            eq(crawledPage.sourceId, sourceId),
            eq(crawledPage.tenantId, tenantId),
            isNull(crawledPage.deletedAt)
          )
        )
        .orderBy(desc(crawledPage.createdAt))
        .limit(2);

      return rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        sourceId: row.sourceId,
        version: row.version,
        url: row.url,
        contentHash: row.contentHash,
        storagePath: row.storagePath,
        status: row.status,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        fetchedAt: row.fetchedAt,
        createdAt: row.createdAt,
      }));
    },
  };
}
