import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ExperimentConfig, BudgetUsageEntry } from "../src/types.js";

// ---- Mock setup ----

const TENANT_ID = "t-00000000-0000-0000-0000-000000000001";
const SOURCE_ID = "s-00000000-0000-0000-0000-000000000001";
const EXP_ID = "e-00000000-0000-0000-0000-000000000001";
const ANALYSIS_ID = "a-00000000-0000-0000-0000-000000000001";
const _OUTCOME_ID = "o-00000000-0000-0000-0000-000000000001";

// Track all DB operations
let dbInserts: Array<{ table: string; values: Record<string, unknown> }> = [];
let dbUpdates: Array<{ table: string; values: Record<string, unknown>; where: string }> = [];
let dbSelects: Array<{ table: string; result: unknown }> = [];

// Storage operations
let storageUploads: Array<{ path: string; data: unknown }> = [];
let storageDownloads: Map<string, unknown> = new Map();

// Configurable query results
let experimentRow: Record<string, unknown> | null = null;
let analysisRow: Record<string, unknown> | null = null;
let budgetRows: Array<Record<string, unknown>> = [];
let updateRowCount = 1;

// UUID counter for deterministic IDs
let uuidCounter = 0;
const nextUuid = () => {
  uuidCounter++;
  return `uuid-${uuidCounter}`;
};

// Mock postgres module
vi.mock("postgres", () => {
  return {
    default: vi.fn(() => vi.fn()),
  };
});

// Mock drizzle-orm
vi.mock("drizzle-orm/postgres-js", () => {
  return {
    drizzle: vi.fn(() => "mock-db"),
  };
});

// Mock @supabase/supabase-js
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => "mock-supabase"),
  };
});

// Mock the internal storage module
vi.mock("../src/storage.js", () => {
  return {
    createStorage: vi.fn(() => ({
      upload: vi.fn(async (path: string, data: unknown) => {
        storageUploads.push({ path, data });
      }),
      download: vi.fn(async (path: string) => {
        const result = storageDownloads.get(path);
        if (result === undefined) throw new Error(`Not found in storage: ${path}`);
        return result;
      }),
    })),
  };
});

// Mock @unlock-events/db schema — we need the table references for drizzle queries
vi.mock("@unlock-events/db", () => {
  return {
    experiment: { id: "experiment.id", tenantId: "experiment.tenant_id" },
    experimentBudget: { id: "experimentBudget.id" },
    analysisRequest: { id: "analysisRequest.id" },
    experimentOutcome: { id: "experimentOutcome.id" },
    createDatabase: vi.fn(),
  };
});

// Mock the internal db-operations module
vi.mock("../src/db-operations.js", () => {
  return {
    createDbOperations: vi.fn(() => ({
      insertExperiment: vi.fn(async (values: Record<string, unknown>) => {
        const id = nextUuid();
        dbInserts.push({ table: "experiment", values: { ...values, id } });
        return id;
      }),
      insertBudgetAllocations: vi.fn(
        async (experimentId: string, tenantId: string, allocations: unknown[]) => {
          for (const alloc of allocations) {
            dbInserts.push({
              table: "experiment_budget",
              values: { experimentId, tenantId, ...(alloc as Record<string, unknown>) },
            });
          }
        }
      ),
      insertAnalysisRequest: vi.fn(async (values: Record<string, unknown>) => {
        const id = nextUuid();
        dbInserts.push({ table: "analysis_request", values: { ...values, id } });
        return id;
      }),
      insertOutcome: vi.fn(async (values: Record<string, unknown>) => {
        const id = nextUuid();
        dbInserts.push({ table: "experiment_outcome", values: { ...values, id } });
        return id;
      }),
      findExperiment: vi.fn(async (expKey: string, tenantId: string) => {
        dbSelects.push({ table: "experiment", result: experimentRow });
        if (!experimentRow) return null;
        if (experimentRow["tenantId"] !== tenantId) return null;
        return { ...experimentRow, id: expKey };
      }),
      findAnalysisRequest: vi.fn(async (analysisKey: string, tenantId: string) => {
        dbSelects.push({ table: "analysis_request", result: analysisRow });
        if (!analysisRow) return null;
        if (analysisRow["tenantId"] !== tenantId) return null;
        return { ...analysisRow, id: analysisKey };
      }),
      findBudgetEntries: vi.fn(async (_expKey: string) => {
        return budgetRows;
      }),
      updateAnalysisRequestStatus: vi.fn(
        async (analysisKey: string, status: string, updates: Record<string, unknown>) => {
          dbUpdates.push({
            table: "analysis_request",
            values: { id: analysisKey, status, ...updates },
            where: `id = ${analysisKey}`,
          });
        }
      ),
      updateExperimentPhase: vi.fn(
        async (expKey: string, tenantId: string, newPhase: string, currentVersion: number) => {
          dbUpdates.push({
            table: "experiment",
            values: { phase: newPhase, version: currentVersion + 1 },
            where: `id = ${expKey} AND version = ${currentVersion}`,
          });
          return updateRowCount;
        }
      ),
      completeExperiment: vi.fn(
        async (expKey: string, tenantId: string, currentVersion: number) => {
          dbUpdates.push({
            table: "experiment",
            values: { status: "completed", version: currentVersion + 1 },
            where: `id = ${expKey} AND status = active AND version = ${currentVersion}`,
          });
          return updateRowCount;
        }
      ),
      consumeBudget: vi.fn(
        async (expKey: string, platform: string, dimension: string, amount: number) => {
          const row = budgetRows.find(
            (r) => r["platform"] === platform && r["dimension"] === dimension
          );
          if (!row) return 0;
          dbUpdates.push({
            table: "experiment_budget",
            values: { used: (row["used"] as number) + amount },
            where: `experiment_id = ${expKey} AND platform = ${platform} AND dimension = ${dimension}`,
          });
          return 1;
        }
      ),
    })),
  };
});

// Import after mocks
import { createExperimentAccess } from "../src/experiment-access.js";

describe("ExperimentAccess", () => {
  const defaultConfig: ExperimentConfig = {
    name: "Test Experiment",
    notes: "Testing crawl strategy",
    budget: {
      strategy: "hard_cap",
      allocations: [
        { platform: "openrouter", dimension: "tokens", total: 100000, unit: "tokens" },
        { platform: "browserbase", dimension: "minutes", total: 60, unit: "minutes" },
      ],
    },
  };

  let access: ReturnType<typeof createExperimentAccess>;

  beforeEach(() => {
    vi.clearAllMocks();
    dbInserts = [];
    dbUpdates = [];
    dbSelects = [];
    storageUploads = [];
    storageDownloads = new Map();
    experimentRow = null;
    analysisRow = null;
    budgetRows = [];
    updateRowCount = 1;
    uuidCounter = 0;

    access = createExperimentAccess({
      connectionString: "postgresql://test:test@localhost/test",
      supabaseUrl: "http://localhost:54321",
      supabaseKey: "test-key",
      storageBucket: "experiments",
    });
  });

  // ---- beginExperiment ----

  describe("beginExperiment", () => {
    it("creates experiment and budget rows, returns UUID", async () => {
      const expKey = await access.beginExperiment(TENANT_ID, SOURCE_ID, defaultConfig);

      expect(expKey).toBe("uuid-1");

      // Verify experiment insert
      const expInsert = dbInserts.find((i) => i.table === "experiment");
      expect(expInsert).toBeDefined();
      expect(expInsert!.values["tenantId"]).toBe(TENANT_ID);
      expect(expInsert!.values["sourceId"]).toBe(SOURCE_ID);
      expect(expInsert!.values["name"]).toBe("Test Experiment");
      expect(expInsert!.values["notes"]).toBe("Testing crawl strategy");
      expect(expInsert!.values["phase"]).toBe("exploration");
      expect(expInsert!.values["status"]).toBe("active");
      expect(expInsert!.values["budgetStrategy"]).toBe("hard_cap");

      // Verify budget inserts
      const budgetInserts = dbInserts.filter((i) => i.table === "experiment_budget");
      expect(budgetInserts).toHaveLength(2);
      expect(budgetInserts[0]!.values["platform"]).toBe("openrouter");
      expect(budgetInserts[0]!.values["dimension"]).toBe("tokens");
      expect(budgetInserts[1]!.values["platform"]).toBe("browserbase");
    });

    it("sets default phase to exploration and status to active", async () => {
      await access.beginExperiment(TENANT_ID, SOURCE_ID, {
        name: "Minimal",
        budget: { strategy: "soft_limit", allocations: [] },
      });

      const expInsert = dbInserts.find((i) => i.table === "experiment");
      expect(expInsert!.values["phase"]).toBe("exploration");
      expect(expInsert!.values["status"]).toBe("active");
    });
  });

  // ---- submitForAnalysis ----

  describe("submitForAnalysis", () => {
    it("validates tenant, uploads snapshot, creates request", async () => {
      experimentRow = {
        tenantId: TENANT_ID,
        sourceId: SOURCE_ID,
        status: "active",
        phase: "exploration",
        version: 1,
      };

      const snapshot = { html: "<div>events</div>", url: "https://example.com" };
      const analysisKey = await access.submitForAnalysis(TENANT_ID, EXP_ID, snapshot);

      expect(analysisKey).toBe("uuid-1");

      // Snapshot uploaded to storage
      expect(storageUploads).toHaveLength(1);
      expect(storageUploads[0]!.path).toContain(`experiments/${EXP_ID}/snapshots/`);
      expect(storageUploads[0]!.data).toEqual(snapshot);

      // Analysis request created
      const arInsert = dbInserts.find((i) => i.table === "analysis_request");
      expect(arInsert).toBeDefined();
      expect(arInsert!.values["tenantId"]).toBe(TENANT_ID);
      expect(arInsert!.values["experimentId"]).toBe(EXP_ID);
      expect(arInsert!.values["status"]).toBe("pending");
    });

    it("throws when experiment not found", async () => {
      experimentRow = null;

      await expect(access.submitForAnalysis(TENANT_ID, EXP_ID, { data: "test" })).rejects.toThrow();
    });

    it("throws on tenant mismatch", async () => {
      experimentRow = { tenantId: "other-tenant", status: "active" };

      await expect(access.submitForAnalysis(TENANT_ID, EXP_ID, { data: "test" })).rejects.toThrow();
    });
  });

  // ---- prepareAnalysisContext ----

  describe("prepareAnalysisContext", () => {
    it("enforces status=pending, builds context, uploads it", async () => {
      const snapshot = { html: "<div>events</div>" };
      const snapshotPath = `experiments/${EXP_ID}/snapshots/${ANALYSIS_ID}.json`;

      analysisRow = {
        tenantId: TENANT_ID,
        experimentId: EXP_ID,
        snapshotPath,
        status: "pending",
      };
      experimentRow = {
        tenantId: TENANT_ID,
        phase: "exploration",
        budgetStrategy: "hard_cap",
        program: null,
        name: "Test",
        notes: "Notes",
      };
      budgetRows = [
        {
          platform: "openrouter",
          dimension: "tokens",
          total: "100000",
          used: "5000",
          unit: "tokens",
        },
      ];
      storageDownloads.set(snapshotPath, snapshot);

      const context = (await access.prepareAnalysisContext(TENANT_ID, ANALYSIS_ID)) as Record<
        string,
        unknown
      >;

      // Context was built
      expect(context).toHaveProperty("experiment");
      expect(context).toHaveProperty("budget");
      expect(context).toHaveProperty("snapshot");

      // Context uploaded to storage
      const contextUpload = storageUploads.find((u) => u.path.includes("contexts"));
      expect(contextUpload).toBeDefined();

      // Status updated
      const statusUpdate = dbUpdates.find(
        (u) => u.table === "analysis_request" && u.values["status"] === "context_prepared"
      );
      expect(statusUpdate).toBeDefined();
    });

    it("throws when status is not pending", async () => {
      analysisRow = {
        tenantId: TENANT_ID,
        experimentId: EXP_ID,
        status: "context_prepared",
      };

      await expect(access.prepareAnalysisContext(TENANT_ID, ANALYSIS_ID)).rejects.toThrow(
        /status/i
      );
    });

    it("throws on tenant mismatch", async () => {
      analysisRow = {
        tenantId: "other-tenant",
        experimentId: EXP_ID,
        status: "pending",
      };

      await expect(access.prepareAnalysisContext(TENANT_ID, ANALYSIS_ID)).rejects.toThrow();
    });

    it("throws when analysis request not found", async () => {
      analysisRow = null;

      await expect(access.prepareAnalysisContext(TENANT_ID, ANALYSIS_ID)).rejects.toThrow();
    });
  });

  // ---- provideVerdict ----

  describe("provideVerdict", () => {
    it("enforces status=context_prepared, uploads verdict", async () => {
      analysisRow = {
        tenantId: TENANT_ID,
        experimentId: EXP_ID,
        status: "context_prepared",
      };
      const verdict = { action: "continue", updatedProgram: { steps: [] } };

      await access.provideVerdict(TENANT_ID, ANALYSIS_ID, verdict);

      // Verdict uploaded
      const verdictUpload = storageUploads.find((u) => u.path.includes("verdicts"));
      expect(verdictUpload).toBeDefined();
      expect(verdictUpload!.data).toEqual(verdict);

      // Status updated
      const statusUpdate = dbUpdates.find(
        (u) => u.table === "analysis_request" && u.values["status"] === "verdict_provided"
      );
      expect(statusUpdate).toBeDefined();
    });

    it("throws when status is not context_prepared", async () => {
      analysisRow = {
        tenantId: TENANT_ID,
        experimentId: EXP_ID,
        status: "pending",
      };

      await expect(
        access.provideVerdict(TENANT_ID, ANALYSIS_ID, { action: "stop" })
      ).rejects.toThrow(/status/i);
    });

    it("throws when status is verdict_provided (already provided)", async () => {
      analysisRow = {
        tenantId: TENANT_ID,
        experimentId: EXP_ID,
        status: "verdict_provided",
      };

      await expect(
        access.provideVerdict(TENANT_ID, ANALYSIS_ID, { action: "stop" })
      ).rejects.toThrow(/status/i);
    });
  });

  // ---- acceptVerdict ----

  describe("acceptVerdict", () => {
    it("enforces status=verdict_provided, downloads and returns verdict", async () => {
      const verdict = { action: "continue", updatedProgram: { steps: ["click", "scroll"] } };
      const verdictPath = `experiments/${EXP_ID}/verdicts/${ANALYSIS_ID}.json`;

      analysisRow = {
        tenantId: TENANT_ID,
        experimentId: EXP_ID,
        verdictPath,
        status: "verdict_provided",
      };
      storageDownloads.set(verdictPath, verdict);

      const result = await access.acceptVerdict(TENANT_ID, ANALYSIS_ID);

      expect(result).toEqual(verdict);

      // Status updated to accepted
      const statusUpdate = dbUpdates.find(
        (u) => u.table === "analysis_request" && u.values["status"] === "accepted"
      );
      expect(statusUpdate).toBeDefined();
    });

    it("throws when status is not verdict_provided", async () => {
      analysisRow = {
        tenantId: TENANT_ID,
        experimentId: EXP_ID,
        status: "context_prepared",
      };

      await expect(access.acceptVerdict(TENANT_ID, ANALYSIS_ID)).rejects.toThrow(/status/i);
    });

    it("throws when analysis request not found", async () => {
      analysisRow = null;

      await expect(access.acceptVerdict(TENANT_ID, ANALYSIS_ID)).rejects.toThrow();
    });
  });

  // ---- recordOutcome ----

  describe("recordOutcome", () => {
    it("validates tenant, uploads outcome, creates record", async () => {
      experimentRow = {
        tenantId: TENANT_ID,
        status: "active",
        version: 1,
      };
      const outcome = { success: true, eventsFound: 42 };

      await access.recordOutcome(TENANT_ID, EXP_ID, outcome);

      // Outcome uploaded
      const outcomeUpload = storageUploads.find((u) => u.path.includes("outcomes"));
      expect(outcomeUpload).toBeDefined();
      expect(outcomeUpload!.data).toEqual(outcome);

      // Outcome record created
      const outcomeInsert = dbInserts.find((i) => i.table === "experiment_outcome");
      expect(outcomeInsert).toBeDefined();
      expect(outcomeInsert!.values["experimentId"]).toBe(EXP_ID);
      expect(outcomeInsert!.values["tenantId"]).toBe(TENANT_ID);
    });

    it("throws when experiment not found", async () => {
      experimentRow = null;

      await expect(access.recordOutcome(TENANT_ID, EXP_ID, { data: "test" })).rejects.toThrow();
    });

    it("throws on tenant mismatch", async () => {
      experimentRow = { tenantId: "other-tenant", status: "active" };

      await expect(access.recordOutcome(TENANT_ID, EXP_ID, { data: "test" })).rejects.toThrow();
    });
  });

  // ---- advancePhase ----

  describe("advancePhase", () => {
    it("uses optimistic locking to update phase", async () => {
      experimentRow = {
        tenantId: TENANT_ID,
        phase: "exploration",
        status: "active",
        version: 3,
      };

      await access.advancePhase(TENANT_ID, EXP_ID, "refinement");

      const phaseUpdate = dbUpdates.find(
        (u) => u.table === "experiment" && u.values["phase"] === "refinement"
      );
      expect(phaseUpdate).toBeDefined();
      expect(phaseUpdate!.where).toContain("version = 3");
    });

    it("throws on concurrent modification (0 rows updated)", async () => {
      experimentRow = {
        tenantId: TENANT_ID,
        phase: "exploration",
        status: "active",
        version: 3,
      };
      updateRowCount = 0;

      await expect(access.advancePhase(TENANT_ID, EXP_ID, "refinement")).rejects.toThrow(
        /concurrent|version|conflict/i
      );
    });

    it("throws when experiment not found", async () => {
      experimentRow = null;

      await expect(access.advancePhase(TENANT_ID, EXP_ID, "refinement")).rejects.toThrow();
    });

    it("throws on tenant mismatch", async () => {
      experimentRow = { tenantId: "other-tenant", phase: "exploration", version: 1 };

      await expect(access.advancePhase(TENANT_ID, EXP_ID, "refinement")).rejects.toThrow();
    });
  });

  // ---- completeExperiment ----

  describe("completeExperiment", () => {
    it("marks experiment as completed and returns program", async () => {
      const program = { steps: ["navigate", "click", "extract"] };
      experimentRow = {
        tenantId: TENANT_ID,
        status: "active",
        version: 5,
        program,
      };

      const result = await access.completeExperiment(TENANT_ID, EXP_ID);

      expect(result).toEqual(program);

      const statusUpdate = dbUpdates.find(
        (u) => u.table === "experiment" && u.values["status"] === "completed"
      );
      expect(statusUpdate).toBeDefined();
      expect(statusUpdate!.where).toContain("status = active");
      expect(statusUpdate!.where).toContain("version = 5");
    });

    it("returns null when experiment has no program", async () => {
      experimentRow = {
        tenantId: TENANT_ID,
        status: "active",
        version: 1,
        program: null,
      };

      const result = await access.completeExperiment(TENANT_ID, EXP_ID);
      expect(result).toBeNull();
    });

    it("throws on concurrent modification (0 rows updated)", async () => {
      experimentRow = {
        tenantId: TENANT_ID,
        status: "active",
        version: 1,
        program: null,
      };
      updateRowCount = 0;

      await expect(access.completeExperiment(TENANT_ID, EXP_ID)).rejects.toThrow(
        /concurrent|version|conflict/i
      );
    });

    it("throws when experiment not found", async () => {
      experimentRow = null;

      await expect(access.completeExperiment(TENANT_ID, EXP_ID)).rejects.toThrow();
    });
  });

  // ---- consumeBudget ----

  describe("consumeBudget", () => {
    it("updates per-dimension usage and returns summary", async () => {
      experimentRow = {
        tenantId: TENANT_ID,
        status: "active",
        budgetStrategy: "hard_cap",
        version: 1,
      };
      budgetRows = [
        {
          platform: "openrouter",
          dimension: "tokens",
          total: "100000",
          used: "5000",
          unit: "tokens",
        },
        { platform: "browserbase", dimension: "minutes", total: "60", used: "10", unit: "minutes" },
      ];

      const usage: BudgetUsageEntry[] = [
        { platform: "openrouter", dimension: "tokens", amount: 1500 },
      ];

      const summary = await access.consumeBudget(TENANT_ID, EXP_ID, usage);

      expect(summary.strategy).toBe("hard_cap");
      expect(summary.entries).toHaveLength(2);

      // The openrouter entry should show updated usage
      const openrouterEntry = summary.entries.find((e) => e.platform === "openrouter");
      expect(openrouterEntry).toBeDefined();
      expect(openrouterEntry!.total).toBe(100000);

      // Budget update should have been called
      const budgetUpdate = dbUpdates.find(
        (u) => u.table === "experiment_budget" && u.where.includes("openrouter")
      );
      expect(budgetUpdate).toBeDefined();
    });

    it("throws when experiment not found", async () => {
      experimentRow = null;

      await expect(
        access.consumeBudget(TENANT_ID, EXP_ID, [
          { platform: "openrouter", dimension: "tokens", amount: 100 },
        ])
      ).rejects.toThrow();
    });

    it("throws when budget dimension not found", async () => {
      experimentRow = {
        tenantId: TENANT_ID,
        status: "active",
        budgetStrategy: "hard_cap",
        version: 1,
      };
      budgetRows = [
        {
          platform: "openrouter",
          dimension: "tokens",
          total: "100000",
          used: "5000",
          unit: "tokens",
        },
      ];

      await expect(
        access.consumeBudget(TENANT_ID, EXP_ID, [
          { platform: "nonexistent", dimension: "tokens", amount: 100 },
        ])
      ).rejects.toThrow(/budget.*not found/i);
    });

    it("handles multiple usage entries in one call", async () => {
      experimentRow = {
        tenantId: TENANT_ID,
        status: "active",
        budgetStrategy: "soft_limit",
        version: 1,
      };
      budgetRows = [
        { platform: "openrouter", dimension: "tokens", total: "100000", used: "0", unit: "tokens" },
        { platform: "browserbase", dimension: "minutes", total: "60", used: "0", unit: "minutes" },
      ];

      const usage: BudgetUsageEntry[] = [
        { platform: "openrouter", dimension: "tokens", amount: 2000 },
        { platform: "browserbase", dimension: "minutes", amount: 5 },
      ];

      const summary = await access.consumeBudget(TENANT_ID, EXP_ID, usage);

      expect(summary.strategy).toBe("soft_limit");
      expect(summary.entries).toHaveLength(2);

      // Both dimensions should have been updated
      const budgetUpdates = dbUpdates.filter((u) => u.table === "experiment_budget");
      expect(budgetUpdates).toHaveLength(2);
    });
  });

  // ---- Full lifecycle ----

  describe("full analysis lifecycle", () => {
    it("enforces strict status ordering: pending → context_prepared → verdict_provided → accepted", async () => {
      // Cannot prepare context from context_prepared
      analysisRow = { tenantId: TENANT_ID, experimentId: EXP_ID, status: "context_prepared" };
      await expect(access.prepareAnalysisContext(TENANT_ID, ANALYSIS_ID)).rejects.toThrow();

      // Cannot provide verdict from pending
      analysisRow = { tenantId: TENANT_ID, experimentId: EXP_ID, status: "pending" };
      await expect(
        access.provideVerdict(TENANT_ID, ANALYSIS_ID, { action: "stop" })
      ).rejects.toThrow();

      // Cannot accept verdict from context_prepared
      analysisRow = { tenantId: TENANT_ID, experimentId: EXP_ID, status: "context_prepared" };
      await expect(access.acceptVerdict(TENANT_ID, ANALYSIS_ID)).rejects.toThrow();

      // Cannot accept verdict from pending
      analysisRow = { tenantId: TENANT_ID, experimentId: EXP_ID, status: "pending" };
      await expect(access.acceptVerdict(TENANT_ID, ANALYSIS_ID)).rejects.toThrow();
    });
  });
});
