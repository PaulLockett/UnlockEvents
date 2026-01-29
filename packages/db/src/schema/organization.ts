import { pgTable, uuid, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { tenant } from "./tenant.js";
import type { Provenance } from "./source.js";

export const organization = pgTable(
  "organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    description: text("description"),
    website: text("website"),
    logoUrl: text("logo_url"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    provenance: jsonb("provenance").default({}).$type<Provenance>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("organization_tenant_idx").on(table.tenantId)]
);

export const organizationSocial = pgTable(
  "organization_social",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    platform: text("platform").notNull(),
    handle: text("handle"),
    profileUrl: text("profile_url"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("org_social_tenant_idx").on(table.tenantId),
    index("org_social_org_idx").on(table.organizationId),
  ]
);
