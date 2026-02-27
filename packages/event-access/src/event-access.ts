import { createDatabase } from "@unlock-events/db";
import { createDbOperations } from "./db-operations.js";
import type { EventRow } from "./db-operations.js";
import type {
  EventAccess,
  EventAccessConfig,
  EventRecord,
  EventData,
  EventStatus,
  EventSchedule,
} from "./types.js";

function toPublicStatus(dbStatus: string, metadata: Record<string, unknown>): EventStatus {
  if (metadata["canonicalEventId"]) return "consolidated";
  switch (dbStatus) {
    case "published":
      return "published";
    case "cancelled":
      return "cancelled";
    default:
      return "ingested";
  }
}

function toEventRecord(row: EventRow, sourceId: string): EventRecord {
  const canonicalId = (row.metadata["canonicalEventId"] as string) ?? null;
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    timezone: row.timezone,
    sourceId,
    status: toPublicStatus(row.status, row.metadata),
    isFree: row.isFree,
    registrationUrl: row.registrationUrl,
    imageUrl: row.imageUrl,
    canonicalId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createEventAccess(config: EventAccessConfig = {}): EventAccess {
  const connectionString = config.connectionString ?? process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new Error("DATABASE_URL or connectionString is required");
  }

  const db = createDatabase(connectionString);
  const ops = createDbOperations(db);

  return {
    async ingestEvent(tenantId: string, sourceId: string, eventData: EventData): Promise<string> {
      const eventId = await ops.insertEvent({
        tenantId,
        title: eventData.title,
        description: eventData.description,
        startsAt: new Date(eventData.startsAt),
        endsAt: eventData.endsAt ? new Date(eventData.endsAt) : null,
        timezone: eventData.timezone,
        status: "draft",
        isFree: eventData.isFree ?? false,
        registrationUrl: eventData.registrationUrl ?? null,
        imageUrl: eventData.imageUrl ?? null,
        metadata: eventData.metadata ?? {},
      });

      await ops.insertEventSource({ tenantId, eventId, sourceId });

      return eventId;
    },

    async publishEvent(tenantId: string, eventId: string): Promise<void> {
      const row = await ops.findEvent(eventId, tenantId);
      if (!row) {
        throw new Error(`Event ${eventId} not found for tenant ${tenantId}`);
      }
      if (row.status === "published") return;
      if (row.status === "cancelled") {
        throw new Error(`Cannot publish event: status is 'cancelled'`);
      }

      const rowsUpdated = await ops.updateEventStatus(eventId, tenantId, "published", row.version);
      if (rowsUpdated === 0) {
        throw new Error(
          `Concurrent modification conflict: event ${eventId} version ${row.version} was modified by another process`
        );
      }
    },

    async cancelEvent(tenantId: string, eventId: string): Promise<void> {
      const row = await ops.findEvent(eventId, tenantId);
      if (!row) {
        throw new Error(`Event ${eventId} not found for tenant ${tenantId}`);
      }
      if (row.status === "cancelled") return;

      const rowsUpdated = await ops.updateEventStatus(eventId, tenantId, "cancelled", row.version);
      if (rowsUpdated === 0) {
        throw new Error(
          `Concurrent modification conflict: event ${eventId} version ${row.version} was modified by another process`
        );
      }
    },

    async consolidateEvents(
      tenantId: string,
      duplicateId: string,
      canonicalId: string
    ): Promise<void> {
      const duplicate = await ops.findEvent(duplicateId, tenantId);
      if (!duplicate) {
        throw new Error(`Duplicate event ${duplicateId} not found for tenant ${tenantId}`);
      }
      const canonical = await ops.findEvent(canonicalId, tenantId);
      if (!canonical) {
        throw new Error(`Canonical event ${canonicalId} not found for tenant ${tenantId}`);
      }

      const rowsUpdated = await ops.updateEventStatus(
        duplicateId,
        tenantId,
        "cancelled",
        duplicate.version,
        { canonicalEventId: canonicalId }
      );
      if (rowsUpdated === 0) {
        throw new Error(
          `Concurrent modification conflict: event ${duplicateId} version ${duplicate.version} was modified by another process`
        );
      }

      await ops.insertEventRelationship({
        tenantId,
        fromEventId: duplicateId,
        toEventId: canonicalId,
        relationshipType: "supersedes",
      });
    },

    async compileEventSchedule(
      tenantId: string,
      periodStart: string,
      periodEnd: string
    ): Promise<EventSchedule> {
      const rows = await ops.findPublishedEventsByDateRange(
        tenantId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      const events: EventRecord[] = rows.map((row) => toEventRecord(row, row.sourceId));

      return {
        events,
        periodStart,
        periodEnd,
        total: events.length,
      };
    },

    async resolveEventForProcessing(tenantId: string, eventId: string): Promise<EventRecord> {
      const row = await ops.findEvent(eventId, tenantId);
      if (!row) {
        throw new Error(`Event ${eventId} not found for tenant ${tenantId}`);
      }

      const link = await ops.findEventSourceLink(eventId, tenantId);
      const sourceId = link?.sourceId ?? "";

      return toEventRecord(row, sourceId);
    },
  };
}
