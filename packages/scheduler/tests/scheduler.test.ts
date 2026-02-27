import { describe, it, expect } from "vitest";
import { createScheduler } from "../src/scheduler.js";

describe("Scheduler", () => {
  const scheduler = createScheduler({});

  describe("scheduleNextNavigation", () => {
    it("returns a SourceSchedule with future navigation time", async () => {
      const schedule = await scheduler.scheduleNextNavigation("src-1", "daily", null);
      expect(schedule.sourceId).toBe("src-1");
      expect(schedule.frequency).toBe("daily");
      expect(new Date(schedule.nextNavigationAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("assembleNavigationRoster", () => {
    it("returns empty roster from stub", async () => {
      const roster = await scheduler.assembleNavigationRoster(["src-1", "src-2"]);
      expect(roster).toEqual([]);
    });
  });

  describe("adjustCadence", () => {
    it("returns a CadenceAdjustment record", async () => {
      const adjustment = await scheduler.adjustCadence("src-1", "weekly", "low activity");
      expect(adjustment.newFrequency).toBe("weekly");
      expect(adjustment.reason).toBe("low activity");
      expect(adjustment).toHaveProperty("previousFrequency");
    });
  });
});
