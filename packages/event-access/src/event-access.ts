import type { EventAccess, EventAccessConfig, EventRecord, EventSchedule } from "./types.js";

export function createEventAccess(config: EventAccessConfig = {}): EventAccess {
  const _connectionString = config.connectionString ?? process.env["DATABASE_URL"];

  return {
    async ingestEvent(
      tenantId: string,
      sourceId: string,
      eventData: Omit<EventRecord, "id" | "status" | "canonicalId" | "createdAt">
    ): Promise<string> {
      console.log(
        `[R2:stub] ingestEvent tenant=${tenantId} source=${sourceId} title=${eventData.title}`
      );
      return crypto.randomUUID();
    },

    async publishEvent(tenantId: string, eventId: string): Promise<void> {
      console.log(`[R2:stub] publishEvent tenant=${tenantId} event=${eventId}`);
    },

    async cancelEvent(tenantId: string, eventId: string): Promise<void> {
      console.log(`[R2:stub] cancelEvent tenant=${tenantId} event=${eventId}`);
    },

    async consolidateEvents(
      tenantId: string,
      duplicateId: string,
      canonicalId: string
    ): Promise<void> {
      console.log(
        `[R2:stub] consolidateEvents tenant=${tenantId} duplicate=${duplicateId} canonical=${canonicalId}`
      );
    },

    async compileEventSchedule(
      tenantId: string,
      periodStart: string,
      periodEnd: string
    ): Promise<EventSchedule> {
      console.log(
        `[R2:stub] compileEventSchedule tenant=${tenantId} ${periodStart} to ${periodEnd}`
      );
      return {
        events: [],
        periodStart,
        periodEnd,
        total: 0,
      };
    },

    async resolveEventForProcessing(tenantId: string, eventId: string): Promise<EventRecord> {
      console.log(`[R2:stub] resolveEventForProcessing tenant=${tenantId} event=${eventId}`);
      return {
        id: eventId,
        title: "stub-event",
        description: null,
        startDate: new Date().toISOString(),
        endDate: null,
        location: null,
        sourceId: "stub-source",
        status: "ingested",
        canonicalId: null,
        createdAt: new Date().toISOString(),
      };
    },
  };
}
