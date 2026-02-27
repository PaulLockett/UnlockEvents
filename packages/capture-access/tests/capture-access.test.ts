import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock state ----

const TENANT = "t-00000000-0000-0000-0000-000000000001";

let crawledPageRow: Record<string, unknown> | null = null;
let latestCaptures: Array<Record<string, unknown>> = [];
let storageData: Map<string, unknown> = new Map();
let updateRowCount = 1;

let uuidCounter = 0;
const nextUuid = () => {
  uuidCounter++;
  return `uuid-${uuidCounter}`;
};

// ---- Mocks ----

vi.mock("postgres", () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn(() => "mock-db"),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => "mock-supabase"),
}));

vi.mock("../src/storage.js", () => ({
  createStorage: vi.fn(() => ({
    upload: vi.fn(async (path: string, data: unknown) => {
      storageData.set(path, data);
    }),
    download: vi.fn(async (path: string) => {
      const result = storageData.get(path);
      if (result === undefined) throw new Error(`Not found in storage: ${path}`);
      return result;
    }),
  })),
}));

vi.mock("@unlock-events/db", () => ({
  crawledPage: { id: "crawledPage.id", tenantId: "crawledPage.tenant_id" },
  createDatabase: vi.fn(),
}));

vi.mock("../src/db-operations.js", () => ({
  createDbOperations: vi.fn(() => ({
    insertCrawledPage: vi.fn(async () => {
      return nextUuid();
    }),
    findCrawledPage: vi.fn(async () => crawledPageRow),
    updateStatus: vi.fn(async () => updateRowCount),
    findLatestTwoCapturesForSource: vi.fn(async () => latestCaptures),
  })),
}));

import { createCaptureAccess } from "../src/capture-access.js";
import type { CaptureAccess } from "../src/types.js";

describe("CaptureAccess", () => {
  let access: CaptureAccess;

  const sampleBundle = {
    sourceId: "src-1",
    sessionId: "sess-1",
    url: "https://example.com/events",
    html: "<div>event list</div>",
    screenshotUrl: null,
    networkLogUrl: null,
    videoUrl: null,
    metadata: { userAgent: "test-bot" },
    capturedAt: "2026-01-15T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    crawledPageRow = null;
    latestCaptures = [];
    storageData = new Map();
    updateRowCount = 1;
    access = createCaptureAccess({
      connectionString: "postgres://test",
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "test-key",
    });
  });

  describe("config validation", () => {
    it("throws when no connection string provided", () => {
      const original = process.env["DATABASE_URL"];
      delete process.env["DATABASE_URL"];
      try {
        expect(() => createCaptureAccess({ supabaseUrl: "u", supabaseKey: "k" })).toThrow(
          "DATABASE_URL or connectionString is required"
        );
      } finally {
        if (original) process.env["DATABASE_URL"] = original;
      }
    });

    it("throws when no supabase URL provided", () => {
      const original = process.env["SUPABASE_URL"];
      delete process.env["SUPABASE_URL"];
      try {
        expect(() => createCaptureAccess({ connectionString: "pg://x", supabaseKey: "k" })).toThrow(
          "SUPABASE_URL or supabaseUrl is required"
        );
      } finally {
        if (original) process.env["SUPABASE_URL"] = original;
      }
    });

    it("throws when no supabase key provided", () => {
      const original = process.env["SUPABASE_SERVICE_KEY"];
      delete process.env["SUPABASE_SERVICE_KEY"];
      try {
        expect(() => createCaptureAccess({ connectionString: "pg://x", supabaseUrl: "u" })).toThrow(
          "SUPABASE_SERVICE_KEY or supabaseKey is required"
        );
      } finally {
        if (original) process.env["SUPABASE_SERVICE_KEY"] = original;
      }
    });
  });

  describe("preserveCapture", () => {
    it("returns a UUID for the new capture", async () => {
      const id = await access.preserveCapture(TENANT, sampleBundle);
      expect(id).toBe("uuid-1");
    });

    it("uploads bundle to storage", async () => {
      await access.preserveCapture(TENANT, sampleBundle);
      expect(storageData.size).toBe(1);
      const stored = [...storageData.values()][0] as Record<string, unknown>;
      expect(stored["html"]).toBe("<div>event list</div>");
    });
  });

  describe("recallCapture", () => {
    it("returns the full observation bundle", async () => {
      const bundleData = {
        html: "<div>events</div>",
        screenshotUrl: "https://storage/screenshot.png",
        networkLogUrl: null,
        videoUrl: null,
        metadata: { userAgent: "test-bot" },
      };
      storageData.set("captures/src-1/cap-1.json", bundleData);

      crawledPageRow = {
        id: "cap-1",
        tenantId: TENANT,
        sourceId: "src-1",
        version: 1,
        url: "https://example.com/events",
        contentHash: "abc123",
        storagePath: "captures/src-1/cap-1.json",
        status: "fetched",
        metadata: { sessionId: "sess-1" },
        fetchedAt: new Date("2026-01-15T10:00:00.000Z"),
        createdAt: new Date("2026-01-15T10:00:00.000Z"),
      };

      const bundle = await access.recallCapture(TENANT, "cap-1");
      expect(bundle.id).toBe("cap-1");
      expect(bundle.sourceId).toBe("src-1");
      expect(bundle.html).toBe("<div>events</div>");
      expect(bundle.screenshotUrl).toBe("https://storage/screenshot.png");
      expect(bundle.sessionId).toBe("sess-1");
    });

    it("throws when capture not found", async () => {
      crawledPageRow = null;
      await expect(access.recallCapture(TENANT, "cap-missing")).rejects.toThrow(
        "Capture cap-missing not found"
      );
    });

    it("throws when capture has no storage path", async () => {
      crawledPageRow = {
        id: "cap-1",
        tenantId: TENANT,
        sourceId: "src-1",
        version: 1,
        url: "https://example.com",
        contentHash: null,
        storagePath: null,
        status: "pending",
        metadata: {},
        fetchedAt: null,
        createdAt: new Date(),
      };
      await expect(access.recallCapture(TENANT, "cap-1")).rejects.toThrow("has no stored bundle");
    });
  });

  describe("confirmExtraction", () => {
    it("marks capture as extracted", async () => {
      crawledPageRow = {
        id: "cap-1",
        tenantId: TENANT,
        version: 1,
        status: "fetched",
      };
      await expect(access.confirmExtraction(TENANT, "cap-1")).resolves.toBeUndefined();
    });

    it("is idempotent for already parsed captures", async () => {
      crawledPageRow = {
        id: "cap-1",
        tenantId: TENANT,
        version: 2,
        status: "parsed",
      };
      await expect(access.confirmExtraction(TENANT, "cap-1")).resolves.toBeUndefined();
    });

    it("throws when capture not found", async () => {
      crawledPageRow = null;
      await expect(access.confirmExtraction(TENANT, "cap-missing")).rejects.toThrow(
        "Capture cap-missing not found"
      );
    });

    it("detects concurrent modification", async () => {
      crawledPageRow = {
        id: "cap-1",
        tenantId: TENANT,
        version: 1,
        status: "fetched",
      };
      updateRowCount = 0;
      await expect(access.confirmExtraction(TENANT, "cap-1")).rejects.toThrow(
        "Concurrent modification conflict"
      );
    });
  });

  describe("detectEnvironmentDrift", () => {
    it("returns no drift when no captures exist", async () => {
      latestCaptures = [];
      const drift = await access.detectEnvironmentDrift(TENANT, "src-1");
      expect(drift.hasDrifted).toBe(false);
      expect(drift.previousCaptureId).toBeNull();
      expect(drift.driftSignals).toEqual([]);
    });

    it("returns no drift when only one capture exists", async () => {
      latestCaptures = [{ id: "cap-1", contentHash: "abc", url: "https://example.com" }];
      const drift = await access.detectEnvironmentDrift(TENANT, "src-1");
      expect(drift.hasDrifted).toBe(false);
      expect(drift.previousCaptureId).toBe("cap-1");
    });

    it("detects content hash drift", async () => {
      latestCaptures = [
        { id: "cap-2", contentHash: "def456", url: "https://example.com" },
        { id: "cap-1", contentHash: "abc123", url: "https://example.com" },
      ];
      const drift = await access.detectEnvironmentDrift(TENANT, "src-1");
      expect(drift.hasDrifted).toBe(true);
      expect(drift.previousCaptureId).toBe("cap-1");
      expect(drift.driftSignals).toContain("content_hash_changed");
    });

    it("detects URL drift", async () => {
      latestCaptures = [
        { id: "cap-2", contentHash: "abc", url: "https://example.com/v2" },
        { id: "cap-1", contentHash: "abc", url: "https://example.com/v1" },
      ];
      const drift = await access.detectEnvironmentDrift(TENANT, "src-1");
      expect(drift.hasDrifted).toBe(true);
      expect(drift.driftSignals).toContain("url_changed");
    });

    it("detects no drift when content is identical", async () => {
      latestCaptures = [
        { id: "cap-2", contentHash: "abc", url: "https://example.com" },
        { id: "cap-1", contentHash: "abc", url: "https://example.com" },
      ];
      const drift = await access.detectEnvironmentDrift(TENANT, "src-1");
      expect(drift.hasDrifted).toBe(false);
      expect(drift.driftSignals).toEqual([]);
    });
  });
});
