import { createClient } from "@supabase/supabase-js";
import { createDatabase } from "@unlock-events/db";
import { createStorage } from "./storage.js";
import { createDbOperations } from "./db-operations.js";
import type {
  CaptureAccess,
  CaptureAccessConfig,
  ObservationBundle,
  EnvironmentDrift,
} from "./types.js";

/** Simple hash for content drift detection. */
function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

export function createCaptureAccess(config: CaptureAccessConfig = {}): CaptureAccess {
  const connectionString = config.connectionString ?? process.env["DATABASE_URL"];
  const supabaseUrl = config.supabaseUrl ?? process.env["SUPABASE_URL"];
  const supabaseKey = config.supabaseKey ?? process.env["SUPABASE_SERVICE_KEY"];
  const bucket = config.storageBucket ?? "captures";

  if (!connectionString) throw new Error("DATABASE_URL or connectionString is required");
  if (!supabaseUrl) throw new Error("SUPABASE_URL or supabaseUrl is required");
  if (!supabaseKey) throw new Error("SUPABASE_SERVICE_KEY or supabaseKey is required");

  const db = createDatabase(connectionString);
  const supabase = createClient(supabaseUrl, supabaseKey);
  const storage = createStorage(supabase, bucket);
  const ops = createDbOperations(db);

  return {
    async preserveCapture(
      tenantId: string,
      bundle: Omit<ObservationBundle, "id">
    ): Promise<string> {
      const contentHash = bundle.html ? simpleHash(bundle.html) : null;
      const tempId = crypto.randomUUID();
      const storagePath = `captures/${bundle.sourceId}/${tempId}.json`;

      await storage.upload(storagePath, bundle);

      const id = await ops.insertCrawledPage({
        tenantId,
        sourceId: bundle.sourceId,
        url: bundle.url,
        contentHash,
        storagePath,
        status: "fetched",
        metadata: {
          sessionId: bundle.sessionId,
          screenshotUrl: bundle.screenshotUrl,
          networkLogUrl: bundle.networkLogUrl,
          videoUrl: bundle.videoUrl,
          ...bundle.metadata,
        },
      });

      return id;
    },

    async recallCapture(tenantId: string, captureId: string): Promise<ObservationBundle> {
      const row = await ops.findCrawledPage(captureId, tenantId);
      if (!row) {
        throw new Error(`Capture ${captureId} not found for tenant ${tenantId}`);
      }

      if (!row.storagePath) {
        throw new Error(`Capture ${captureId} has no stored bundle`);
      }

      const data = (await storage.download(row.storagePath)) as Record<string, unknown>;

      return {
        id: row.id,
        sourceId: row.sourceId,
        sessionId: (row.metadata["sessionId"] as string) ?? "",
        url: row.url,
        html: (data["html"] as string) ?? null,
        screenshotUrl: (data["screenshotUrl"] as string) ?? null,
        networkLogUrl: (data["networkLogUrl"] as string) ?? null,
        videoUrl: (data["videoUrl"] as string) ?? null,
        metadata: (data["metadata"] as Record<string, unknown>) ?? {},
        capturedAt: row.fetchedAt?.toISOString() ?? row.createdAt.toISOString(),
      };
    },

    async confirmExtraction(tenantId: string, captureId: string): Promise<void> {
      const row = await ops.findCrawledPage(captureId, tenantId);
      if (!row) {
        throw new Error(`Capture ${captureId} not found for tenant ${tenantId}`);
      }
      if (row.status === "parsed") return;

      const rowsUpdated = await ops.updateStatus(captureId, tenantId, "parsed", row.version);
      if (rowsUpdated === 0) {
        throw new Error(
          `Concurrent modification conflict: capture ${captureId} version ${row.version} was modified by another process`
        );
      }
    },

    async detectEnvironmentDrift(tenantId: string, sourceId: string): Promise<EnvironmentDrift> {
      const captures = await ops.findLatestTwoCapturesForSource(sourceId, tenantId);

      if (captures.length === 0) {
        return { hasDrifted: false, previousCaptureId: null, driftSignals: [] };
      }

      if (captures.length === 1) {
        return {
          hasDrifted: false,
          previousCaptureId: captures[0]!.id,
          driftSignals: [],
        };
      }

      const [latest, previous] = captures as [(typeof captures)[0], (typeof captures)[0]];
      const driftSignals: string[] = [];

      if (
        latest!.contentHash &&
        previous!.contentHash &&
        latest!.contentHash !== previous!.contentHash
      ) {
        driftSignals.push("content_hash_changed");
      }

      if (latest!.url !== previous!.url) {
        driftSignals.push("url_changed");
      }

      return {
        hasDrifted: driftSignals.length > 0,
        previousCaptureId: previous!.id,
        driftSignals,
      };
    },
  };
}
