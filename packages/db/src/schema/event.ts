import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { tenant } from "./tenant.js";
import { source, crawledPage, type Provenance } from "./source.js";
import { organization } from "./organization.js";
import { person } from "./person.js";
import { location } from "./location.js";

/**
 * Event status
 */
export type EventStatus = "draft" | "published" | "cancelled" | "postponed";

/**
 * Note: search_vector is a tsvector column for full-text search.
 * Migration should create it as a generated column:
 *
 * search_vector tsvector GENERATED ALWAYS AS (
 *   setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
 *   setweight(to_tsvector('english', coalesce(description, '')), 'B')
 * ) STORED
 *
 * And add GIN index:
 * CREATE INDEX idx_event_search ON event USING GIN(search_vector);
 */

export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    version: integer("version").notNull().default(1),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    timezone: text("timezone").notNull(),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurrenceRule: text("recurrence_rule"),
    recurrenceParentId: uuid("recurrence_parent_id"),
    status: text("status").notNull().default("draft").$type<EventStatus>(),
    isFree: boolean("is_free").notNull().default(false),
    priceMin: decimal("price_min", { precision: 10, scale: 2 }),
    priceMax: decimal("price_max", { precision: 10, scale: 2 }),
    priceCurrency: text("price_currency").default("USD"),
    registrationUrl: text("registration_url"),
    imageUrl: text("image_url"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    provenance: jsonb("provenance").default({}).$type<Provenance>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("event_tenant_idx").on(table.tenantId),
    index("event_dates_idx").on(table.tenantId, table.startsAt, table.endsAt),
  ]
);

// ============================================================================
// Junction Tables
// ============================================================================

export const eventSource = pgTable(
  "event_source",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => source.id),
    crawledPageId: uuid("crawled_page_id").references(() => crawledPage.id),
    externalId: text("external_id"),
    sourceUrl: text("source_url"),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_source_tenant_idx").on(table.tenantId),
    index("event_source_event_idx").on(table.eventId),
    index("event_source_source_idx").on(table.sourceId),
  ]
);

export type LocationRole = "primary" | "secondary" | "overflow";

export const eventLocation = pgTable(
  "event_location",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => location.id),
    role: text("role").default("primary").$type<LocationRole>(),
    sortOrder: integer("sort_order").default(0),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_location_tenant_idx").on(table.tenantId),
    index("event_location_event_idx").on(table.eventId),
    index("event_location_location_idx").on(table.locationId),
  ]
);

export type OrganizationRole = "host" | "sponsor" | "partner" | "vendor";

export const eventOrganization = pgTable(
  "event_organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    role: text("role").default("host").$type<OrganizationRole>(),
    sortOrder: integer("sort_order").default(0),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_org_tenant_idx").on(table.tenantId),
    index("event_org_event_idx").on(table.eventId),
    index("event_org_org_idx").on(table.organizationId),
  ]
);

export type PersonRole = "organizer" | "speaker" | "performer" | "panelist" | "moderator";

export const eventPerson = pgTable(
  "event_person",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id),
    role: text("role").default("organizer").$type<PersonRole>(),
    sortOrder: integer("sort_order").default(0),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_person_tenant_idx").on(table.tenantId),
    index("event_person_event_idx").on(table.eventId),
    index("event_person_person_idx").on(table.personId),
  ]
);

export type EventRelationshipType = "parent" | "series" | "sequel" | "related" | "supersedes";

export const eventRelationship = pgTable(
  "event_relationship",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    fromEventId: uuid("from_event_id")
      .notNull()
      .references(() => event.id),
    toEventId: uuid("to_event_id")
      .notNull()
      .references(() => event.id),
    relationshipType: text("relationship_type").notNull().$type<EventRelationshipType>(),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_rel_tenant_idx").on(table.tenantId),
    index("event_rel_from_idx").on(table.fromEventId),
    index("event_rel_to_idx").on(table.toEventId),
  ]
);

export type AttendanceSource = "registration" | "manual" | "estimate";

export const eventAttendance = pgTable(
  "event_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id),
    expectedCount: integer("expected_count"),
    actualCount: integer("actual_count"),
    source: text("source").$type<AttendanceSource>(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_attendance_tenant_idx").on(table.tenantId),
    index("event_attendance_event_idx").on(table.eventId),
  ]
);
