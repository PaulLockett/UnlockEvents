import { describe, it, expect } from "vitest";
import { createEventManager } from "../src/event-manager.js";

const TENANT = "t-test";

describe("EventManager", () => {
  const manager = createEventManager({});

  describe("processNewEvent", () => {
    it("returns an EventProcessingResult", async () => {
      const result = await manager.processNewEvent(TENANT, "evt-1");
      expect(result.eventId).toBe("evt-1");
      expect(result).toHaveProperty("outcome");
      expect(result).toHaveProperty("details");
      expect(["published", "consolidated", "quarantined", "failed"]).toContain(result.outcome);
    });
  });

  describe("processBatch", () => {
    it("processes all events and returns summary", async () => {
      const result = await manager.processBatch(TENANT, ["evt-1", "evt-2", "evt-3"]);
      expect(result.totalProcessed).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.published + result.consolidated + result.quarantined + result.failed).toBe(3);
    });

    it("handles empty batch", async () => {
      const result = await manager.processBatch(TENANT, []);
      expect(result.totalProcessed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });
});
