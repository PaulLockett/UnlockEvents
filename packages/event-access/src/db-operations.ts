import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";
import type { Database } from "@unlock-events/db";
import { event, eventSource, eventRelationship } from "@unlock-events/db";

export interface EventRow {
  id: string;
  tenantId: string;
  version: number;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  status: string;
  isFree: boolean;
  registrationUrl: string | null;
  imageUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface EventSourceRow {
  eventId: string;
  sourceId: string;
}

export interface DbOperations {
  insertEvent(values: {
    tenantId: string;
    title: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date | null;
    timezone: string;
    status: string;
    isFree: boolean;
    registrationUrl: string | null;
    imageUrl: string | null;
    metadata: Record<string, unknown>;
  }): Promise<string>;

  insertEventSource(values: { tenantId: string; eventId: string; sourceId: string }): Promise<void>;

  insertEventRelationship(values: {
    tenantId: string;
    fromEventId: string;
    toEventId: string;
    relationshipType: string;
  }): Promise<void>;

  findEvent(eventId: string, tenantId: string): Promise<EventRow | null>;

  findEventSourceLink(eventId: string, tenantId: string): Promise<EventSourceRow | null>;

  updateEventStatus(
    eventId: string,
    tenantId: string,
    newStatus: string,
    currentVersion: number,
    metadataUpdates?: Record<string, unknown>
  ): Promise<number>;

  findPublishedEventsByDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<EventRow & { sourceId: string }>>;
}

export function createDbOperations(db: Database): DbOperations {
  return {
    async insertEvent(values) {
      const [row] = await db
        .insert(event)
        .values({
          tenantId: values.tenantId,
          title: values.title,
          description: values.description,
          startsAt: values.startsAt,
          endsAt: values.endsAt,
          timezone: values.timezone,
          status: values.status as "draft",
          isFree: values.isFree,
          registrationUrl: values.registrationUrl,
          imageUrl: values.imageUrl,
          metadata: values.metadata,
        })
        .returning({ id: event.id });
      return row!.id;
    },

    async insertEventSource(values) {
      await db.insert(eventSource).values({
        tenantId: values.tenantId,
        eventId: values.eventId,
        sourceId: values.sourceId,
      });
    },

    async insertEventRelationship(values) {
      await db.insert(eventRelationship).values({
        tenantId: values.tenantId,
        fromEventId: values.fromEventId,
        toEventId: values.toEventId,
        relationshipType: values.relationshipType as "supersedes",
      });
    },

    async findEvent(eventId, tenantId) {
      const rows = await db
        .select()
        .from(event)
        .where(and(eq(event.id, eventId), eq(event.tenantId, tenantId), isNull(event.deletedAt)))
        .limit(1);
      if (rows.length === 0) return null;
      const row = rows[0]!;
      return {
        id: row.id,
        tenantId: row.tenantId,
        version: row.version,
        title: row.title,
        description: row.description,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        timezone: row.timezone,
        status: row.status,
        isFree: row.isFree,
        registrationUrl: row.registrationUrl,
        imageUrl: row.imageUrl,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        createdAt: row.createdAt,
      };
    },

    async findEventSourceLink(eventId, tenantId) {
      const rows = await db
        .select({ eventId: eventSource.eventId, sourceId: eventSource.sourceId })
        .from(eventSource)
        .where(and(eq(eventSource.eventId, eventId), eq(eventSource.tenantId, tenantId)))
        .limit(1);
      if (rows.length === 0) return null;
      return rows[0]!;
    },

    async updateEventStatus(eventId, tenantId, newStatus, currentVersion, metadataUpdates) {
      const setValues: Record<string, unknown> = {
        status: newStatus,
        version: currentVersion + 1,
        updatedAt: new Date(),
      };
      if (metadataUpdates) {
        setValues["metadata"] =
          sql`COALESCE(${event.metadata}, '{}'::jsonb) || ${JSON.stringify(metadataUpdates)}::jsonb`;
      }

      const result = await db
        .update(event)
        .set(setValues)
        .where(
          and(
            eq(event.id, eventId),
            eq(event.tenantId, tenantId),
            eq(event.version, currentVersion),
            isNull(event.deletedAt)
          )
        )
        .returning({ id: event.id });
      return result.length;
    },

    async findPublishedEventsByDateRange(tenantId, startDate, endDate) {
      const rows = await db
        .select({
          id: event.id,
          tenantId: event.tenantId,
          version: event.version,
          title: event.title,
          description: event.description,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          timezone: event.timezone,
          status: event.status,
          isFree: event.isFree,
          registrationUrl: event.registrationUrl,
          imageUrl: event.imageUrl,
          metadata: event.metadata,
          createdAt: event.createdAt,
          sourceId: eventSource.sourceId,
        })
        .from(event)
        .leftJoin(
          eventSource,
          and(eq(event.id, eventSource.eventId), eq(event.tenantId, eventSource.tenantId))
        )
        .where(
          and(
            eq(event.tenantId, tenantId),
            eq(event.status, "published"),
            isNull(event.deletedAt),
            gte(event.startsAt, startDate),
            lte(event.startsAt, endDate)
          )
        )
        .orderBy(event.startsAt);

      return rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        version: row.version,
        title: row.title,
        description: row.description,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        timezone: row.timezone,
        status: row.status,
        isFree: row.isFree,
        registrationUrl: row.registrationUrl,
        imageUrl: row.imageUrl,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        createdAt: row.createdAt,
        sourceId: row.sourceId ?? "",
      }));
    },
  };
}
