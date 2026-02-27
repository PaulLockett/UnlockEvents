/**
 * R2: Event Access — Public Interface
 *
 * Encapsulates event lifecycle from ingestion through publication —
 * how events enter, mature, and become visible to consumers.
 * Technology-agnostic interface. No storage types leak through this boundary.
 */

export type EventStatus = "ingested" | "published" | "cancelled" | "consolidated";

export interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  sourceId: string;
  status: EventStatus;
  canonicalId: string | null;
  createdAt: string;
}

export interface EventSchedule {
  events: EventRecord[];
  periodStart: string;
  periodEnd: string;
  total: number;
}

export interface EventAccess {
  /** New event enters from the extraction pipeline. Returns event key (UUID). */
  ingestEvent(
    tenantId: string,
    sourceId: string,
    eventData: Omit<EventRecord, "id" | "status" | "canonicalId" | "createdAt">
  ): Promise<string>;

  /** Event becomes visible to consumers. */
  publishEvent(tenantId: string, eventId: string): Promise<void>;

  /** Event is no longer happening. */
  cancelEvent(tenantId: string, eventId: string): Promise<void>;

  /** Fold a duplicate into its canonical event. */
  consolidateEvents(tenantId: string, duplicateId: string, canonicalId: string): Promise<void>;

  /** Assemble events for a time period for consumer display. */
  compileEventSchedule(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<EventSchedule>;

  /** Provide event data for pipeline processing (dedup, enrichment). */
  resolveEventForProcessing(tenantId: string, eventId: string): Promise<EventRecord>;
}

export interface EventAccessConfig {
  connectionString?: string;
}
