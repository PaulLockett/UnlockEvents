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

export const person = pgTable(
  "person",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    version: integer("version").notNull().default(1),
    fullName: text("full_name").notNull(),
    bio: text("bio"),
    profileUrl: text("profile_url"),
    avatarUrl: text("avatar_url"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    provenance: jsonb("provenance").default({}).$type<Provenance>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("person_tenant_idx").on(table.tenantId)]
);

export type EmailLabel = "work" | "personal" | "other";

export const personEmail = pgTable(
  "person_email",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id),
    email: text("email").notNull(),
    label: text("label").default("other").$type<EmailLabel>(),
    isPrimary: boolean("is_primary").notNull().default(false),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("person_email_tenant_idx").on(table.tenantId),
    index("person_email_person_idx").on(table.personId),
    index("person_email_lookup_idx").on(table.tenantId, table.email),
  ]
);

export type PhoneLabel = "work" | "mobile" | "other";

export const personPhone = pgTable(
  "person_phone",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id),
    phone: text("phone").notNull(),
    label: text("label").default("other").$type<PhoneLabel>(),
    isPrimary: boolean("is_primary").notNull().default(false),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("person_phone_tenant_idx").on(table.tenantId),
    index("person_phone_person_idx").on(table.personId),
  ]
);

export const personSocial = pgTable(
  "person_social",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id),
    platform: text("platform").notNull(),
    handle: text("handle"),
    profileUrl: text("profile_url"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("person_social_tenant_idx").on(table.tenantId),
    index("person_social_person_idx").on(table.personId),
  ]
);
