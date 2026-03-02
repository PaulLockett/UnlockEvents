import { describe, it, expect, beforeEach } from "vitest";
import { createScheduler } from "../src/scheduler.js";
import type { Scheduler } from "../src/types.js";

describe("Scheduler", () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    scheduler = createScheduler({});
  });

  describe("scheduleNextNavigation", () => {
    it("schedules immediately when source has never been navigated", async () => {
      const before = Date.now();
      const schedule = await scheduler.scheduleNextNavigation("src-1", "daily", null);

      expect(schedule.sourceId).toBe("src-1");
      expect(schedule.frequency).toBe("daily");
      expect(schedule.lastNavigatedAt).toBeNull();
      const nextTime = new Date(schedule.nextNavigationAt).getTime();
      expect(nextTime).toBeGreaterThanOrEqual(before);
      expect(nextTime).toBeLessThanOrEqual(Date.now() + 100);
    });

    it("schedules hourly source 1 hour after last navigation", async () => {
      const lastNav = "2026-01-15T10:00:00.000Z";
      const schedule = await scheduler.scheduleNextNavigation("src-1", "hourly", lastNav);

      expect(schedule.nextNavigationAt).toBe("2026-01-15T11:00:00.000Z");
    });

    it("schedules daily source 24 hours after last navigation", async () => {
      const lastNav = "2026-01-15T10:00:00.000Z";
      const schedule = await scheduler.scheduleNextNavigation("src-1", "daily", lastNav);

      expect(schedule.nextNavigationAt).toBe("2026-01-16T10:00:00.000Z");
    });

    it("schedules weekly source 7 days after last navigation", async () => {
      const lastNav = "2026-01-15T10:00:00.000Z";
      const schedule = await scheduler.scheduleNextNavigation("src-1", "weekly", lastNav);

      expect(schedule.nextNavigationAt).toBe("2026-01-22T10:00:00.000Z");
    });

    it("schedules monthly source 30 days after last navigation", async () => {
      const lastNav = "2026-01-01T00:00:00.000Z";
      const schedule = await scheduler.scheduleNextNavigation("src-1", "monthly", lastNav);

      expect(schedule.nextNavigationAt).toBe("2026-01-31T00:00:00.000Z");
    });

    it("uses custom interval from config", async () => {
      const customScheduler = createScheduler({ customIntervalMs: 2 * 60 * 60 * 1000 });
      const lastNav = "2026-01-15T10:00:00.000Z";
      const schedule = await customScheduler.scheduleNextNavigation("src-1", "custom", lastNav);

      expect(schedule.nextNavigationAt).toBe("2026-01-15T12:00:00.000Z");
    });

    it("preserves lastNavigatedAt in the returned schedule", async () => {
      const lastNav = "2026-01-15T10:00:00.000Z";
      const schedule = await scheduler.scheduleNextNavigation("src-1", "daily", lastNav);

      expect(schedule.lastNavigatedAt).toBe(lastNav);
    });

    it("overwrites previous schedule for same source", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-15T10:00:00.000Z");
      const updated = await scheduler.scheduleNextNavigation(
        "src-1",
        "hourly",
        "2026-01-15T14:00:00.000Z"
      );

      expect(updated.frequency).toBe("hourly");
      expect(updated.nextNavigationAt).toBe("2026-01-15T15:00:00.000Z");
    });
  });

  describe("assembleNavigationRoster", () => {
    it("returns empty roster when no sources are registered", async () => {
      const roster = await scheduler.assembleNavigationRoster(["src-1", "src-2"]);
      expect(roster).toEqual([]);
    });

    it("includes sources that are due for navigation", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-14T10:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-16T10:00:00.000Z"
      );

      expect(roster).toHaveLength(1);
      expect(roster[0]!.sourceId).toBe("src-1");
    });

    it("excludes sources that are not yet due", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-15T10:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-15T12:00:00.000Z"
      );

      expect(roster).toEqual([]);
    });

    it("excludes sources not in the requested list", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-14T10:00:00.000Z");
      await scheduler.scheduleNextNavigation("src-2", "daily", "2026-01-14T10:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-16T10:00:00.000Z"
      );

      expect(roster).toHaveLength(1);
      expect(roster[0]!.sourceId).toBe("src-1");
    });

    it("sorts by priority descending (most overdue first)", async () => {
      await scheduler.scheduleNextNavigation("src-recent", "daily", "2026-01-15T00:00:00.000Z");
      await scheduler.scheduleNextNavigation("src-stale", "daily", "2026-01-10T00:00:00.000Z");
      await scheduler.scheduleNextNavigation("src-middle", "daily", "2026-01-13T00:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["src-recent", "src-stale", "src-middle"],
        "2026-01-17T00:00:00.000Z"
      );

      expect(roster).toHaveLength(3);
      expect(roster[0]!.sourceId).toBe("src-stale");
      expect(roster[1]!.sourceId).toBe("src-middle");
      expect(roster[2]!.sourceId).toBe("src-recent");
    });

    it("computes priority as ratio of overdue time to interval", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-14T00:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-16T00:00:00.000Z"
      );

      // Due at Jan 15, checked at Jan 16 → 1 day overdue / 1 day interval = 1.0
      expect(roster[0]!.priority).toBe(1);
    });

    it("includes source scheduled exactly at cutoff time", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-15T00:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-16T00:00:00.000Z"
      );

      expect(roster).toHaveLength(1);
      expect(roster[0]!.priority).toBe(0);
    });

    it("uses current time when asOf is not provided", async () => {
      const pastTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      await scheduler.scheduleNextNavigation("src-1", "daily", pastTime);

      const roster = await scheduler.assembleNavigationRoster(["src-1"]);
      expect(roster).toHaveLength(1);
    });
  });

  describe("adjustCadence", () => {
    it("returns adjustment record with previous and new frequency", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-15T10:00:00.000Z");

      const adjustment = await scheduler.adjustCadence("src-1", "weekly", "low activity");

      expect(adjustment.sourceId).toBe("src-1");
      expect(adjustment.previousFrequency).toBe("daily");
      expect(adjustment.newFrequency).toBe("weekly");
      expect(adjustment.reason).toBe("low activity");
    });

    it("recalculates next navigation time with new frequency", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-15T10:00:00.000Z");

      const adjustment = await scheduler.adjustCadence("src-1", "weekly", "low activity");

      // Weekly from Jan 15 = Jan 22
      expect(adjustment.nextNavigationAt).toBe("2026-01-22T10:00:00.000Z");
    });

    it("uses default frequency as previous when source is not registered", async () => {
      const adjustment = await scheduler.adjustCadence("src-new", "hourly", "high priority");

      expect(adjustment.previousFrequency).toBe("daily");
      expect(adjustment.newFrequency).toBe("hourly");
    });

    it("respects custom default frequency from config", async () => {
      const customScheduler = createScheduler({ defaultFrequency: "weekly" });
      const adjustment = await customScheduler.adjustCadence("src-new", "hourly", "urgent");

      expect(adjustment.previousFrequency).toBe("weekly");
    });

    it("subsequent roster reflects the adjusted cadence", async () => {
      await scheduler.scheduleNextNavigation("src-1", "monthly", "2026-01-01T00:00:00.000Z");

      // Monthly → next at Jan 31. Check on Jan 10 → not due.
      const rosterBefore = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-10T00:00:00.000Z"
      );
      expect(rosterBefore).toHaveLength(0);

      // Adjust to daily → next at Jan 2. Check on Jan 10 → due.
      await scheduler.adjustCadence("src-1", "daily", "needs more frequent checks");

      const rosterAfter = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-10T00:00:00.000Z"
      );
      expect(rosterAfter).toHaveLength(1);
    });
  });

  describe("mixed-frequency roster ordering", () => {
    it("prioritizes hourly source over daily when both 2h overdue", async () => {
      // Hourly source: due at 10:00, checked at 12:00 → 2h overdue / 1h interval = 2.0
      await scheduler.scheduleNextNavigation("hourly-src", "hourly", "2026-01-15T09:00:00.000Z");
      // Daily source: due at 10:00 (Jan 14 + 24h), checked at 12:00 → 2h overdue / 24h interval ≈ 0.08
      await scheduler.scheduleNextNavigation("daily-src", "daily", "2026-01-14T10:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["hourly-src", "daily-src"],
        "2026-01-15T12:00:00.000Z"
      );

      expect(roster).toHaveLength(2);
      expect(roster[0]!.sourceId).toBe("hourly-src");
      expect(roster[0]!.priority).toBe(2);
      expect(roster[1]!.sourceId).toBe("daily-src");
      expect(roster[1]!.priority).toBeLessThan(0.1);
    });

    it("weekly source far overdue outranks recently-due hourly source", async () => {
      // Weekly source: last Jan 1 → due Jan 8 00:00. Check at Jan 22 00:00 → 14d / 7d = 2.0
      await scheduler.scheduleNextNavigation("weekly-src", "weekly", "2026-01-01T00:00:00.000Z");
      // Hourly source: last Jan 21 23:00 → due Jan 22 00:00. Check at Jan 22 01:00 → 1h / 1h = 1.0
      await scheduler.scheduleNextNavigation("hourly-src", "hourly", "2026-01-21T23:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["weekly-src", "hourly-src"],
        "2026-01-22T01:00:00.000Z"
      );

      expect(roster).toHaveLength(2);
      expect(roster[0]!.sourceId).toBe("weekly-src");
      // 13d + 1h overdue = 13.04... / 7 = 1.86 — still much higher than hourly
      expect(roster[0]!.priority).toBeGreaterThan(1.5);
      expect(roster[1]!.sourceId).toBe("hourly-src");
      expect(roster[1]!.priority).toBe(1);
    });
  });

  describe("priority precision", () => {
    it("rounds priority to two decimal places", async () => {
      // Daily source: due Jan 16, checked Jan 16 + 8h → 8h overdue / 24h interval = 0.333...
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-15T00:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-16T08:00:00.000Z"
      );

      expect(roster[0]!.priority).toBe(0.33);
    });

    it("handles very small overdue producing near-zero priority", async () => {
      // Monthly source: due Jan 31, checked Jan 31 + 1h → 1h / 720h = 0.001388...
      await scheduler.scheduleNextNavigation("src-1", "monthly", "2026-01-01T00:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-31T01:00:00.000Z"
      );

      expect(roster).toHaveLength(1);
      expect(roster[0]!.priority).toBe(0);
    });
  });

  describe("custom frequency in roster", () => {
    it("uses custom interval for priority calculation", async () => {
      // Custom 2-hour interval: due at 12:00, checked at 16:00 → 4h overdue / 2h interval = 2.0
      const customScheduler = createScheduler({ customIntervalMs: 2 * 60 * 60 * 1000 });
      await customScheduler.scheduleNextNavigation("src-1", "custom", "2026-01-15T10:00:00.000Z");

      const roster = await customScheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-15T16:00:00.000Z"
      );

      expect(roster[0]!.priority).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("returns empty roster for empty sourceIds array", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-14T00:00:00.000Z");

      const roster = await scheduler.assembleNavigationRoster([]);
      expect(roster).toEqual([]);
    });

    it("adjustCadence for source with null lastNavigatedAt schedules immediately", async () => {
      const before = Date.now();
      await scheduler.scheduleNextNavigation("src-1", "weekly", null);

      const adjustment = await scheduler.adjustCadence("src-1", "daily", "needs faster checks");

      // lastNavigatedAt was null → next should be approximately now
      const nextTime = new Date(adjustment.nextNavigationAt).getTime();
      expect(nextTime).toBeGreaterThanOrEqual(before);
      expect(nextTime).toBeLessThanOrEqual(Date.now() + 100);
    });

    it("multiple sequential adjustments track state correctly", async () => {
      await scheduler.scheduleNextNavigation("src-1", "hourly", "2026-01-15T10:00:00.000Z");

      const adj1 = await scheduler.adjustCadence("src-1", "daily", "slowing down");
      expect(adj1.previousFrequency).toBe("hourly");
      expect(adj1.newFrequency).toBe("daily");

      const adj2 = await scheduler.adjustCadence("src-1", "weekly", "slowing further");
      expect(adj2.previousFrequency).toBe("daily");
      expect(adj2.newFrequency).toBe("weekly");
      expect(adj2.nextNavigationAt).toBe("2026-01-22T10:00:00.000Z");

      const adj3 = await scheduler.adjustCadence("src-1", "hourly", "back to fast");
      expect(adj3.previousFrequency).toBe("weekly");
      expect(adj3.newFrequency).toBe("hourly");
      expect(adj3.nextNavigationAt).toBe("2026-01-15T11:00:00.000Z");
    });

    it("re-scheduling after adjustment overwrites adjustment state", async () => {
      await scheduler.scheduleNextNavigation("src-1", "daily", "2026-01-15T10:00:00.000Z");
      await scheduler.adjustCadence("src-1", "weekly", "slowing down");

      // Re-schedule with fresh lastNavigatedAt — should overwrite the adjusted state
      const schedule = await scheduler.scheduleNextNavigation(
        "src-1",
        "hourly",
        "2026-01-20T14:00:00.000Z"
      );

      expect(schedule.frequency).toBe("hourly");
      expect(schedule.nextNavigationAt).toBe("2026-01-20T15:00:00.000Z");

      // Roster should use the re-scheduled state, not the adjusted state
      const roster = await scheduler.assembleNavigationRoster(
        ["src-1"],
        "2026-01-21T00:00:00.000Z"
      );
      expect(roster).toHaveLength(1);
      expect(roster[0]!.sourceId).toBe("src-1");
    });

    it("scheduling many sources and filtering to subset works correctly", async () => {
      for (let i = 0; i < 10; i++) {
        const lastNav = `2026-01-${String(5 + i).padStart(2, "0")}T00:00:00.000Z`;
        await scheduler.scheduleNextNavigation(`src-${i}`, "daily", lastNav);
      }

      // Only ask for 3 of the 10
      const roster = await scheduler.assembleNavigationRoster(
        ["src-0", "src-4", "src-9"],
        "2026-01-20T00:00:00.000Z"
      );

      expect(roster).toHaveLength(3);
      // src-0 (due Jan 6) should be most overdue, src-9 (due Jan 15) least
      expect(roster[0]!.sourceId).toBe("src-0");
      expect(roster[2]!.sourceId).toBe("src-9");
    });
  });

  describe("config", () => {
    it("defaults to daily frequency", async () => {
      const adjustment = await scheduler.adjustCadence("src-1", "hourly", "test");
      expect(adjustment.previousFrequency).toBe("daily");
    });

    it("custom interval defaults to daily when not specified", async () => {
      const lastNav = "2026-01-15T10:00:00.000Z";
      const schedule = await scheduler.scheduleNextNavigation("src-1", "custom", lastNav);
      // Custom with no config → uses daily interval
      expect(schedule.nextNavigationAt).toBe("2026-01-16T10:00:00.000Z");
    });
  });
});
