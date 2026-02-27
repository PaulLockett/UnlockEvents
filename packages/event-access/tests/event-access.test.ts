import { describe, it, expect } from "vitest";
import { createEventAccess } from "../src/event-access.js";

const TENANT = "t-test";

describe("EventAccess", () => {
  const access = createEventAccess({});

  const sampleEvent = {
    title: "Test Event",
    description: "A test event",
    startDate: "2026-03-01T10:00:00Z",
    endDate: "2026-03-01T12:00:00Z",
    location: "Birmingham, AL",
    sourceId: "src-1",
  };

  describe("ingestEvent", () => {
    it("returns a UUID", async () => {
      const id = await access.ingestEvent(TENANT, "src-1", sampleEvent);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe("publishEvent", () => {
    it("resolves without error", async () => {
      await expect(access.publishEvent(TENANT, "evt-1")).resolves.toBeUndefined();
    });
  });

  describe("cancelEvent", () => {
    it("resolves without error", async () => {
      await expect(access.cancelEvent(TENANT, "evt-1")).resolves.toBeUndefined();
    });
  });

  describe("consolidateEvents", () => {
    it("resolves without error", async () => {
      await expect(
        access.consolidateEvents(TENANT, "evt-dup", "evt-canonical")
      ).resolves.toBeUndefined();
    });
  });

  describe("compileEventSchedule", () => {
    it("returns empty schedule from stub", async () => {
      const schedule = await access.compileEventSchedule(TENANT, "2026-03-01", "2026-03-31");
      expect(schedule.events).toEqual([]);
      expect(schedule.total).toBe(0);
      expect(schedule.periodStart).toBe("2026-03-01");
      expect(schedule.periodEnd).toBe("2026-03-31");
    });
  });

  describe("resolveEventForProcessing", () => {
    it("returns an EventRecord", async () => {
      const event = await access.resolveEventForProcessing(TENANT, "evt-1");
      expect(event).toHaveProperty("id", "evt-1");
      expect(event).toHaveProperty("title");
      expect(event).toHaveProperty("status");
    });
  });
});
