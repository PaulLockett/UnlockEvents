import { createDatabase } from "@unlock-events/db";
import { createDbOperations } from "./db-operations.js";
import type { SourceRow } from "./db-operations.js";
import type {
  SourceAccess,
  SourceAccessConfig,
  SourceRecord,
  SourceStatus,
  NavigationBrief,
} from "./types.js";

/** Map DB status values to public SourceStatus. */
function toPublicStatus(dbStatus: string): SourceStatus {
  switch (dbStatus) {
    case "active":
      return "active";
    case "paused":
      return "inactive";
    case "error":
      return "active"; // errors are still active sources with tracked failures
    case "archived":
      return "retired";
    default:
      return "pending";
  }
}

/** Map DB row to public SourceRecord. */
function toSourceRecord(row: SourceRow): SourceRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    url: row.url,
    status: toPublicStatus(row.status),
    category: row.category,
    platform: row.platform,
    feedUrl: row.feedUrl,
    failureCount: row.status === "error" ? 1 : 0,
    lastNavigatedAt: row.lastCrawledAt?.toISOString() ?? null,
    nextNavigateAt: row.nextCrawlAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createSourceAccess(config: SourceAccessConfig = {}): SourceAccess {
  const connectionString = config.connectionString ?? process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new Error("DATABASE_URL or connectionString is required");
  }

  const db = createDatabase(connectionString);
  const ops = createDbOperations(db);

  return {
    async onboardSource(
      tenantId: string,
      name: string,
      url: string,
      options?: { category?: string; platform?: string; feedUrl?: string }
    ): Promise<string> {
      const id = await ops.insertSource({
        tenantId,
        name,
        url,
        category: options?.category ?? "web_page",
        platform: options?.platform,
        feedUrl: options?.feedUrl,
        status: "paused",
      });
      return id;
    },

    async commissionSource(tenantId: string, sourceId: string): Promise<void> {
      const row = await ops.findSource(sourceId, tenantId);
      if (!row) {
        throw new Error(`Source ${sourceId} not found for tenant ${tenantId}`);
      }
      if (row.status === "active") return;
      if (row.status === "archived") {
        throw new Error(
          `Cannot commission source: status is 'archived' (retired sources cannot be reactivated)`
        );
      }

      const rowsUpdated = await ops.updateSourceStatus(sourceId, tenantId, "active", row.version);
      if (rowsUpdated === 0) {
        throw new Error(
          `Concurrent modification conflict: source ${sourceId} version ${row.version} was modified by another process`
        );
      }
    },

    async decommissionSource(tenantId: string, sourceId: string): Promise<void> {
      const row = await ops.findSource(sourceId, tenantId);
      if (!row) {
        throw new Error(`Source ${sourceId} not found for tenant ${tenantId}`);
      }
      if (row.status === "paused") return;
      if (row.status === "archived") {
        throw new Error(`Cannot decommission source: status is 'archived'`);
      }

      const rowsUpdated = await ops.updateSourceStatus(sourceId, tenantId, "paused", row.version);
      if (rowsUpdated === 0) {
        throw new Error(
          `Concurrent modification conflict: source ${sourceId} version ${row.version} was modified by another process`
        );
      }
    },

    async retireSource(tenantId: string, sourceId: string): Promise<void> {
      const row = await ops.findSource(sourceId, tenantId);
      if (!row) {
        throw new Error(`Source ${sourceId} not found for tenant ${tenantId}`);
      }
      if (row.status === "archived") return;

      const rowsUpdated = await ops.updateSourceStatus(sourceId, tenantId, "archived", row.version);
      if (rowsUpdated === 0) {
        throw new Error(
          `Concurrent modification conflict: source ${sourceId} version ${row.version} was modified by another process`
        );
      }
    },

    async reportNavigationFailure(tenantId: string, sourceId: string): Promise<void> {
      const row = await ops.findSource(sourceId, tenantId);
      if (!row) {
        throw new Error(`Source ${sourceId} not found for tenant ${tenantId}`);
      }

      const rowsUpdated = await ops.incrementFailureCount(sourceId, tenantId);
      if (rowsUpdated === 0) {
        throw new Error(`Failed to update source ${sourceId}`);
      }
    },

    async acknowledgeNavigationSuccess(tenantId: string, sourceId: string): Promise<void> {
      const row = await ops.findSource(sourceId, tenantId);
      if (!row) {
        throw new Error(`Source ${sourceId} not found for tenant ${tenantId}`);
      }

      const rowsUpdated = await ops.resetFailureCountAndTouch(sourceId, tenantId);
      if (rowsUpdated === 0) {
        throw new Error(`Failed to update source ${sourceId}`);
      }
    },

    async nominateForNavigation(tenantId: string, limit: number): Promise<SourceRecord[]> {
      const rows = await ops.findSourcesDueForNavigation(tenantId, limit, new Date());
      return rows.map(toSourceRecord);
    },

    async resolveNavigationBrief(tenantId: string, sourceId: string): Promise<NavigationBrief> {
      const row = await ops.findSource(sourceId, tenantId);
      if (!row) {
        throw new Error(`Source ${sourceId} not found for tenant ${tenantId}`);
      }

      return {
        sourceId: row.id,
        name: row.name,
        url: row.url,
        feedUrl: row.feedUrl,
        category: row.category,
        crawlConfig: row.crawlConfig,
        lastNavigatedAt: row.lastCrawledAt?.toISOString() ?? null,
        failureCount: row.status === "error" ? 1 : 0,
      };
    },
  };
}
