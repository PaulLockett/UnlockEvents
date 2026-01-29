import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { tenant } from "./tenant.js";
import type { Provenance } from "./source.js";

/**
 * Note: PostGIS geography type requires the postgis extension.
 * For Drizzle, we store coordinates as text in "lat,lng" format
 * and handle PostGIS operations in raw SQL when needed.
 *
 * Migration should create the column as:
 * coordinates geography(Point, 4326)
 *
 * And add spatial index:
 * CREATE INDEX idx_location_geo ON location USING GIST(coordinates);
 */

export const location = pgTable(
  "location",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    venueName: text("venue_name"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").default("US"),
    // Stored as "lat,lng" string - PostGIS operations use raw SQL
    coordinates: text("coordinates"),
    timezone: text("timezone"),
    isVirtual: boolean("is_virtual").notNull().default(false),
    virtualUrl: text("virtual_url"),
    virtualPlatform: text("virtual_platform"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    provenance: jsonb("provenance").default({}).$type<Provenance>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("location_tenant_idx").on(table.tenantId)]
);
