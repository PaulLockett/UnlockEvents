import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock state ----

const TENANT = "t-00000000-0000-0000-0000-000000000001";

let sourceRow: Record<string, unknown> | null = null;
let navigationRows: Array<Record<string, unknown>> = [];
let insertedId = "uuid-1";
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

vi.mock("@unlock-events/db", () => ({
  source: { id: "source.id", tenantId: "source.tenant_id" },
  createDatabase: vi.fn(),
}));

vi.mock("../src/db-operations.js", () => ({
  createDbOperations: vi.fn(() => ({
    insertSource: vi.fn(async () => {
      insertedId = nextUuid();
      return insertedId;
    }),
    findSource: vi.fn(async (_sourceId: string, _tenantId: string) => {
      return sourceRow;
    }),
    updateSourceStatus: vi.fn(async () => updateRowCount),
    incrementFailureCount: vi.fn(async () => updateRowCount),
    resetFailureCountAndTouch: vi.fn(async () => updateRowCount),
    findSourcesDueForNavigation: vi.fn(async () => navigationRows),
  })),
}));

import { createSourceAccess } from "../src/source-access.js";
import type { SourceAccess } from "../src/types.js";

describe("SourceAccess", () => {
  let access: SourceAccess;

  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    sourceRow = null;
    navigationRows = [];
    updateRowCount = 1;
    access = createSourceAccess({ connectionString: "postgres://test" });
  });

  describe("config validation", () => {
    it("throws when no connection string provided", () => {
      const original = process.env["DATABASE_URL"];
      delete process.env["DATABASE_URL"];
      try {
        expect(() => createSourceAccess({})).toThrow(
          "DATABASE_URL or connectionString is required"
        );
      } finally {
        if (original) process.env["DATABASE_URL"] = original;
      }
    });
  });

  describe("onboardSource", () => {
    it("returns a UUID for the new source", async () => {
      const id = await access.onboardSource(TENANT, "Birmingham Events", "https://bham.gov/events");
      expect(id).toBe("uuid-1");
    });

    it("accepts optional category, platform, and feedUrl", async () => {
      const id = await access.onboardSource(TENANT, "Feed Source", "https://example.com", {
        category: "feed",
        platform: "RSS",
        feedUrl: "https://example.com/feed.xml",
      });
      expect(id).toBe("uuid-1");
    });
  });

  describe("commissionSource", () => {
    it("activates a paused source", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "paused" };
      await expect(access.commissionSource(TENANT, "src-1")).resolves.toBeUndefined();
    });

    it("throws when source not found", async () => {
      sourceRow = null;
      await expect(access.commissionSource(TENANT, "src-missing")).rejects.toThrow(
        "Source src-missing not found"
      );
    });

    it("throws when source is archived (retired)", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "archived" };
      await expect(access.commissionSource(TENANT, "src-1")).rejects.toThrow(
        "retired sources cannot be reactivated"
      );
    });

    it("is idempotent for already active sources", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "active" };
      await expect(access.commissionSource(TENANT, "src-1")).resolves.toBeUndefined();
    });

    it("detects concurrent modification", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "paused" };
      updateRowCount = 0;
      await expect(access.commissionSource(TENANT, "src-1")).rejects.toThrow(
        "Concurrent modification conflict"
      );
    });
  });

  describe("decommissionSource", () => {
    it("pauses an active source", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "active" };
      await expect(access.decommissionSource(TENANT, "src-1")).resolves.toBeUndefined();
    });

    it("throws when source not found", async () => {
      sourceRow = null;
      await expect(access.decommissionSource(TENANT, "src-missing")).rejects.toThrow(
        "Source src-missing not found"
      );
    });

    it("throws when source is archived", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "archived" };
      await expect(access.decommissionSource(TENANT, "src-1")).rejects.toThrow(
        "Cannot decommission source"
      );
    });

    it("is idempotent for already paused sources", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "paused" };
      await expect(access.decommissionSource(TENANT, "src-1")).resolves.toBeUndefined();
    });
  });

  describe("retireSource", () => {
    it("archives an active source", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "active" };
      await expect(access.retireSource(TENANT, "src-1")).resolves.toBeUndefined();
    });

    it("throws when source not found", async () => {
      sourceRow = null;
      await expect(access.retireSource(TENANT, "src-missing")).rejects.toThrow(
        "Source src-missing not found"
      );
    });

    it("is idempotent for already archived sources", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "archived" };
      await expect(access.retireSource(TENANT, "src-1")).resolves.toBeUndefined();
    });

    it("detects concurrent modification", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "active" };
      updateRowCount = 0;
      await expect(access.retireSource(TENANT, "src-1")).rejects.toThrow(
        "Concurrent modification conflict"
      );
    });
  });

  describe("reportNavigationFailure", () => {
    it("records a navigation failure", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "active" };
      await expect(access.reportNavigationFailure(TENANT, "src-1")).resolves.toBeUndefined();
    });

    it("throws when source not found", async () => {
      sourceRow = null;
      await expect(access.reportNavigationFailure(TENANT, "src-missing")).rejects.toThrow(
        "Source src-missing not found"
      );
    });
  });

  describe("acknowledgeNavigationSuccess", () => {
    it("resets failure state and touches lastCrawledAt", async () => {
      sourceRow = { id: "src-1", tenantId: TENANT, version: 1, status: "error" };
      await expect(access.acknowledgeNavigationSuccess(TENANT, "src-1")).resolves.toBeUndefined();
    });

    it("throws when source not found", async () => {
      sourceRow = null;
      await expect(access.acknowledgeNavigationSuccess(TENANT, "src-missing")).rejects.toThrow(
        "Source src-missing not found"
      );
    });
  });

  describe("nominateForNavigation", () => {
    it("returns sources due for navigation as SourceRecords", async () => {
      navigationRows = [
        {
          id: "src-1",
          tenantId: TENANT,
          version: 1,
          name: "Source 1",
          url: "https://example.com",
          feedUrl: null,
          category: "web_page",
          platform: null,
          status: "active",
          crawlConfig: {},
          lastCrawledAt: new Date("2026-01-10"),
          nextCrawlAt: null,
          createdAt: new Date("2026-01-01"),
          metadata: {},
        },
      ];

      const results = await access.nominateForNavigation(TENANT, 10);
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe("src-1");
      expect(results[0]!.status).toBe("active");
      expect(results[0]!.lastNavigatedAt).toBe("2026-01-10T00:00:00.000Z");
    });

    it("returns empty array when no sources due", async () => {
      navigationRows = [];
      const results = await access.nominateForNavigation(TENANT, 10);
      expect(results).toEqual([]);
    });
  });

  describe("resolveNavigationBrief", () => {
    it("returns navigation brief for a source", async () => {
      sourceRow = {
        id: "src-1",
        tenantId: TENANT,
        version: 1,
        name: "Birmingham Events",
        url: "https://bham.gov/events",
        feedUrl: null,
        category: "web_page",
        platform: null,
        status: "active",
        crawlConfig: { depth: 2, frequencyHours: 24 },
        lastCrawledAt: new Date("2026-01-15T10:00:00.000Z"),
        nextCrawlAt: null,
        createdAt: new Date("2026-01-01"),
        metadata: {},
      };

      const brief = await access.resolveNavigationBrief(TENANT, "src-1");
      expect(brief.sourceId).toBe("src-1");
      expect(brief.name).toBe("Birmingham Events");
      expect(brief.url).toBe("https://bham.gov/events");
      expect(brief.crawlConfig).toEqual({ depth: 2, frequencyHours: 24 });
      expect(brief.lastNavigatedAt).toBe("2026-01-15T10:00:00.000Z");
      expect(brief.failureCount).toBe(0);
    });

    it("reports failure count for sources in error state", async () => {
      sourceRow = {
        id: "src-1",
        tenantId: TENANT,
        version: 1,
        name: "Failing Source",
        url: "https://broken.example.com",
        feedUrl: null,
        category: "web_page",
        platform: null,
        status: "error",
        crawlConfig: {},
        lastCrawledAt: null,
        nextCrawlAt: null,
        createdAt: new Date("2026-01-01"),
        metadata: {},
      };

      const brief = await access.resolveNavigationBrief(TENANT, "src-1");
      expect(brief.failureCount).toBe(1);
    });

    it("throws when source not found", async () => {
      sourceRow = null;
      await expect(access.resolveNavigationBrief(TENANT, "src-missing")).rejects.toThrow(
        "Source src-missing not found"
      );
    });
  });
});
