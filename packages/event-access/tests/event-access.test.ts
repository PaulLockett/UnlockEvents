import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock state ----

const TENANT = "t-00000000-0000-0000-0000-000000000001";

let eventRow: Record<string, unknown> | null = null;
let eventSourceRow: Record<string, unknown> | null = null;
let publishedEvents: Array<Record<string, unknown>> = [];
let updateRowCount = 1;
let insertedRelationships: Array<Record<string, unknown>> = [];

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
  event: { id: "event.id", tenantId: "event.tenant_id" },
  eventSource: { eventId: "eventSource.event_id", sourceId: "eventSource.source_id" },
  eventRelationship: { id: "eventRelationship.id" },
  createDatabase: vi.fn(),
}));

vi.mock("../src/db-operations.js", () => ({
  createDbOperations: vi.fn(() => ({
    insertEvent: vi.fn(async () => nextUuid()),
    insertEventSource: vi.fn(async () => {}),
    insertEventRelationship: vi.fn(async (values: Record<string, unknown>) => {
      insertedRelationships.push(values);
    }),
    findEvent: vi.fn(async (_eventId: string, _tenantId: string) => eventRow),
    findEventSourceLink: vi.fn(async () => eventSourceRow),
    updateEventStatus: vi.fn(async () => updateRowCount),
    findPublishedEventsByDateRange: vi.fn(async () => publishedEvents),
  })),
}));

import { createEventAccess } from "../src/event-access.js";
import type { EventAccess, EventData } from "../src/types.js";

describe("EventAccess", () => {
  let access: EventAccess;

  const sampleEventData: EventData = {
    title: "Alabama Tech Conference",
    description: "Annual tech conference in Birmingham",
    startsAt: "2026-03-15T09:00:00.000Z",
    endsAt: "2026-03-15T17:00:00.000Z",
    timezone: "America/Chicago",
    isFree: false,
    registrationUrl: "https://altech.example.com/register",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    eventRow = null;
    eventSourceRow = null;
    publishedEvents = [];
    updateRowCount = 1;
    insertedRelationships = [];
    access = createEventAccess({ connectionString: "postgres://test" });
  });

  describe("config validation", () => {
    it("throws when no connection string provided", () => {
      const original = process.env["DATABASE_URL"];
      delete process.env["DATABASE_URL"];
      try {
        expect(() => createEventAccess({})).toThrow("DATABASE_URL or connectionString is required");
      } finally {
        if (original) process.env["DATABASE_URL"] = original;
      }
    });
  });

  describe("ingestEvent", () => {
    it("returns a UUID for the new event", async () => {
      const id = await access.ingestEvent(TENANT, "src-1", sampleEventData);
      expect(id).toBe("uuid-1");
    });

    it("accepts minimal event data", async () => {
      const id = await access.ingestEvent(TENANT, "src-1", {
        title: "Simple Event",
        description: null,
        startsAt: "2026-04-01T10:00:00.000Z",
        endsAt: null,
        timezone: "America/Chicago",
      });
      expect(id).toBe("uuid-1");
    });
  });

  describe("publishEvent", () => {
    it("publishes a draft event", async () => {
      eventRow = {
        id: "evt-1",
        tenantId: TENANT,
        version: 1,
        status: "draft",
        metadata: {},
      };
      await expect(access.publishEvent(TENANT, "evt-1")).resolves.toBeUndefined();
    });

    it("throws when event not found", async () => {
      eventRow = null;
      await expect(access.publishEvent(TENANT, "evt-missing")).rejects.toThrow(
        "Event evt-missing not found"
      );
    });

    it("throws when event is cancelled", async () => {
      eventRow = {
        id: "evt-1",
        tenantId: TENANT,
        version: 1,
        status: "cancelled",
        metadata: {},
      };
      await expect(access.publishEvent(TENANT, "evt-1")).rejects.toThrow("Cannot publish event");
    });

    it("is idempotent for already published events", async () => {
      eventRow = {
        id: "evt-1",
        tenantId: TENANT,
        version: 2,
        status: "published",
        metadata: {},
      };
      await expect(access.publishEvent(TENANT, "evt-1")).resolves.toBeUndefined();
    });

    it("detects concurrent modification", async () => {
      eventRow = {
        id: "evt-1",
        tenantId: TENANT,
        version: 1,
        status: "draft",
        metadata: {},
      };
      updateRowCount = 0;
      await expect(access.publishEvent(TENANT, "evt-1")).rejects.toThrow(
        "Concurrent modification conflict"
      );
    });
  });

  describe("cancelEvent", () => {
    it("cancels a published event", async () => {
      eventRow = {
        id: "evt-1",
        tenantId: TENANT,
        version: 2,
        status: "published",
        metadata: {},
      };
      await expect(access.cancelEvent(TENANT, "evt-1")).resolves.toBeUndefined();
    });

    it("throws when event not found", async () => {
      eventRow = null;
      await expect(access.cancelEvent(TENANT, "evt-missing")).rejects.toThrow(
        "Event evt-missing not found"
      );
    });

    it("is idempotent for already cancelled events", async () => {
      eventRow = {
        id: "evt-1",
        tenantId: TENANT,
        version: 1,
        status: "cancelled",
        metadata: {},
      };
      await expect(access.cancelEvent(TENANT, "evt-1")).resolves.toBeUndefined();
    });

    it("detects concurrent modification", async () => {
      eventRow = {
        id: "evt-1",
        tenantId: TENANT,
        version: 1,
        status: "draft",
        metadata: {},
      };
      updateRowCount = 0;
      await expect(access.cancelEvent(TENANT, "evt-1")).rejects.toThrow(
        "Concurrent modification conflict"
      );
    });
  });

  describe("consolidateEvents", () => {
    it("marks duplicate as consolidated and creates relationship", async () => {
      const findEventMock = vi
        .fn()
        .mockResolvedValueOnce({
          id: "evt-dup",
          tenantId: TENANT,
          version: 1,
          status: "draft",
          metadata: {},
        })
        .mockResolvedValueOnce({
          id: "evt-canonical",
          tenantId: TENANT,
          version: 1,
          status: "published",
          metadata: {},
        });

      // Re-create access with updated mock
      const { createDbOperations } = await import("../src/db-operations.js");
      const mockOps = (createDbOperations as ReturnType<typeof vi.fn>).mock.results[0]!.value;
      mockOps.findEvent = findEventMock;

      await access.consolidateEvents(TENANT, "evt-dup", "evt-canonical");

      expect(insertedRelationships).toHaveLength(1);
      expect(insertedRelationships[0]).toEqual({
        tenantId: TENANT,
        fromEventId: "evt-dup",
        toEventId: "evt-canonical",
        relationshipType: "supersedes",
      });
    });

    it("throws when duplicate not found", async () => {
      eventRow = null;
      await expect(
        access.consolidateEvents(TENANT, "evt-missing", "evt-canonical")
      ).rejects.toThrow("Duplicate event evt-missing not found");
    });

    it("throws when canonical not found", async () => {
      const findEventMock = vi
        .fn()
        .mockResolvedValueOnce({
          id: "evt-dup",
          tenantId: TENANT,
          version: 1,
          status: "draft",
          metadata: {},
        })
        .mockResolvedValueOnce(null);

      const { createDbOperations } = await import("../src/db-operations.js");
      const mockOps = (createDbOperations as ReturnType<typeof vi.fn>).mock.results[0]!.value;
      mockOps.findEvent = findEventMock;

      await expect(access.consolidateEvents(TENANT, "evt-dup", "evt-missing")).rejects.toThrow(
        "Canonical event evt-missing not found"
      );
    });
  });

  describe("compileEventSchedule", () => {
    it("returns published events for a date range", async () => {
      publishedEvents = [
        {
          id: "evt-1",
          tenantId: TENANT,
          version: 2,
          title: "Event One",
          description: "First event",
          startsAt: new Date("2026-03-10T10:00:00.000Z"),
          endsAt: new Date("2026-03-10T12:00:00.000Z"),
          timezone: "America/Chicago",
          status: "published",
          isFree: true,
          registrationUrl: null,
          imageUrl: null,
          metadata: {},
          createdAt: new Date("2026-01-01"),
          sourceId: "src-1",
        },
      ];

      const schedule = await access.compileEventSchedule(
        TENANT,
        "2026-03-01T00:00:00.000Z",
        "2026-03-31T23:59:59.000Z"
      );

      expect(schedule.events).toHaveLength(1);
      expect(schedule.events[0]!.title).toBe("Event One");
      expect(schedule.events[0]!.status).toBe("published");
      expect(schedule.total).toBe(1);
      expect(schedule.periodStart).toBe("2026-03-01T00:00:00.000Z");
      expect(schedule.periodEnd).toBe("2026-03-31T23:59:59.000Z");
    });

    it("returns empty schedule when no events", async () => {
      publishedEvents = [];
      const schedule = await access.compileEventSchedule(TENANT, "2026-04-01", "2026-04-30");
      expect(schedule.events).toEqual([]);
      expect(schedule.total).toBe(0);
    });
  });

  describe("resolveEventForProcessing", () => {
    it("returns full event record for pipeline processing", async () => {
      eventRow = {
        id: "evt-1",
        tenantId: TENANT,
        version: 1,
        title: "Conference",
        description: "A conference",
        startsAt: new Date("2026-03-15T09:00:00.000Z"),
        endsAt: new Date("2026-03-15T17:00:00.000Z"),
        timezone: "America/Chicago",
        status: "draft",
        isFree: false,
        registrationUrl: "https://example.com/register",
        imageUrl: null,
        metadata: {},
        createdAt: new Date("2026-01-01"),
      };
      eventSourceRow = { eventId: "evt-1", sourceId: "src-1" };

      const record = await access.resolveEventForProcessing(TENANT, "evt-1");
      expect(record.id).toBe("evt-1");
      expect(record.title).toBe("Conference");
      expect(record.sourceId).toBe("src-1");
      expect(record.status).toBe("ingested");
      expect(record.startsAt).toBe("2026-03-15T09:00:00.000Z");
    });

    it("reports consolidated status when canonicalEventId in metadata", async () => {
      eventRow = {
        id: "evt-dup",
        tenantId: TENANT,
        version: 2,
        title: "Duplicate Event",
        description: null,
        startsAt: new Date("2026-03-15T09:00:00.000Z"),
        endsAt: null,
        timezone: "America/Chicago",
        status: "cancelled",
        isFree: false,
        registrationUrl: null,
        imageUrl: null,
        metadata: { canonicalEventId: "evt-canonical" },
        createdAt: new Date("2026-01-01"),
      };
      eventSourceRow = { eventId: "evt-dup", sourceId: "src-1" };

      const record = await access.resolveEventForProcessing(TENANT, "evt-dup");
      expect(record.status).toBe("consolidated");
      expect(record.canonicalId).toBe("evt-canonical");
    });

    it("throws when event not found", async () => {
      eventRow = null;
      await expect(access.resolveEventForProcessing(TENANT, "evt-missing")).rejects.toThrow(
        "Event evt-missing not found"
      );
    });
  });
});
