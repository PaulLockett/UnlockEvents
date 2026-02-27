import { describe, it, expect } from "vitest";
import { createIngestionManager } from "../src/ingestion-manager.js";

describe("IngestionManager", () => {
  const manager = createIngestionManager({});

  describe("orchestrateDiscoveryCycle", () => {
    it("returns a DiscoveryResult", async () => {
      const result = await manager.orchestrateDiscoveryCycle({
        sourceId: "src-1",
        tenantId: "t-test",
      });
      expect(result.sourceId).toBe("src-1");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("eventsIngested");
      expect(result).toHaveProperty("captureIds");
      expect(result).toHaveProperty("startedAt");
      expect(result).toHaveProperty("completedAt");
    });

    it("accepts optional experimentKey", async () => {
      const result = await manager.orchestrateDiscoveryCycle({
        sourceId: "src-1",
        tenantId: "t-test",
        experimentKey: "exp-1",
      });
      expect(result.status).toBe("completed");
    });
  });

  describe("resumeDiscovery", () => {
    it("returns a DiscoveryResult", async () => {
      const result = await manager.resumeDiscovery(
        { sourceId: "src-1", tenantId: "t-test" },
        "checkpoint-1"
      );
      expect(result.sourceId).toBe("src-1");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("completedAt");
    });
  });
});
