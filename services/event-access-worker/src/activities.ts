import { createEventAccess } from "@unlock-events/event-access";
import type { EventAccess, EventRecord, EventSchedule } from "@unlock-events/event-access";

let instance: EventAccess | null = null;

function getInstance(): EventAccess {
  if (!instance) {
    instance = createEventAccess({
      connectionString: process.env["DATABASE_URL"],
    });
  }
  return instance;
}

export async function ingestEvent(
  tenantId: string,
  sourceId: string,
  eventData: Omit<EventRecord, "id" | "status" | "canonicalId" | "createdAt">
): Promise<string> {
  return getInstance().ingestEvent(tenantId, sourceId, eventData);
}

export async function publishEvent(tenantId: string, eventId: string): Promise<void> {
  return getInstance().publishEvent(tenantId, eventId);
}

export async function cancelEvent(tenantId: string, eventId: string): Promise<void> {
  return getInstance().cancelEvent(tenantId, eventId);
}

export async function consolidateEvents(
  tenantId: string,
  duplicateId: string,
  canonicalId: string
): Promise<void> {
  return getInstance().consolidateEvents(tenantId, duplicateId, canonicalId);
}

export async function compileEventSchedule(
  tenantId: string,
  periodStart: string,
  periodEnd: string
): Promise<EventSchedule> {
  return getInstance().compileEventSchedule(tenantId, periodStart, periodEnd);
}

export async function resolveEventForProcessing(
  tenantId: string,
  eventId: string
): Promise<EventRecord> {
  return getInstance().resolveEventForProcessing(tenantId, eventId);
}
