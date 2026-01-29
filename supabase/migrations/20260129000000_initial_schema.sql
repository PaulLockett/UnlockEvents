CREATE TABLE "crawled_page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"parent_page_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"url" text NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"content_hash" text,
	"storage_path" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"provenance" jsonb DEFAULT '{}'::jsonb,
	"fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dedup_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"auto_merge_threshold" numeric(5, 4) DEFAULT '0.95' NOT NULL,
	"review_threshold" numeric(5, 4) DEFAULT '0.70' NOT NULL,
	"rejection_threshold" numeric(5, 4) DEFAULT '0.30' NOT NULL,
	"field_weights" jsonb DEFAULT '{"title":0.3,"date":0.25,"location":0.2,"organization":0.15,"description":0.1}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dedup_match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_a_id" uuid NOT NULL,
	"event_b_id" uuid NOT NULL,
	"confidence_score" numeric(5, 4) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"match_reasons" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"timezone" text NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_rule" text,
	"recurrence_parent_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"price_min" numeric(10, 2),
	"price_max" numeric(10, 2),
	"price_currency" text DEFAULT 'USD',
	"registration_url" text,
	"image_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"provenance" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"expected_count" integer,
	"actual_count" integer,
	"source" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"role" text DEFAULT 'primary',
	"sort_order" integer DEFAULT 0,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text DEFAULT 'host',
	"sort_order" integer DEFAULT 0,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" text DEFAULT 'organizer',
	"sort_order" integer DEFAULT 0,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_relationship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_event_id" uuid NOT NULL,
	"to_event_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"crawled_page_id" uuid,
	"external_id" text,
	"source_url" text,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"venue_name" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text DEFAULT 'US',
	"coordinates" text,
	"timezone" text,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"virtual_url" text,
	"virtual_platform" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"provenance" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"website" text,
	"logo_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"provenance" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_social" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"handle" text,
	"profile_url" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"full_name" text NOT NULL,
	"bio" text,
	"profile_url" text,
	"avatar_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"provenance" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "person_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"email" text NOT NULL,
	"label" text DEFAULT 'other',
	"is_primary" boolean DEFAULT false NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_phone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"label" text DEFAULT 'other',
	"is_primary" boolean DEFAULT false NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_social" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"handle" text,
	"profile_url" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"category" text NOT NULL,
	"platform" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"feed_url" text,
	"description" text,
	"crawl_config" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"last_crawled_at" timestamp with time zone,
	"next_crawl_at" timestamp with time zone,
	"provenance" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "crawled_page" ADD CONSTRAINT "crawled_page_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawled_page" ADD CONSTRAINT "crawled_page_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedup_config" ADD CONSTRAINT "dedup_config_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedup_match" ADD CONSTRAINT "dedup_match_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedup_match" ADD CONSTRAINT "dedup_match_event_a_id_event_id_fk" FOREIGN KEY ("event_a_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedup_match" ADD CONSTRAINT "dedup_match_event_b_id_event_id_fk" FOREIGN KEY ("event_b_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_location" ADD CONSTRAINT "event_location_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_location" ADD CONSTRAINT "event_location_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_location" ADD CONSTRAINT "event_location_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organization" ADD CONSTRAINT "event_organization_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organization" ADD CONSTRAINT "event_organization_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organization" ADD CONSTRAINT "event_organization_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_person" ADD CONSTRAINT "event_person_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_person" ADD CONSTRAINT "event_person_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_person" ADD CONSTRAINT "event_person_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_relationship" ADD CONSTRAINT "event_relationship_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_relationship" ADD CONSTRAINT "event_relationship_from_event_id_event_id_fk" FOREIGN KEY ("from_event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_relationship" ADD CONSTRAINT "event_relationship_to_event_id_event_id_fk" FOREIGN KEY ("to_event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_source" ADD CONSTRAINT "event_source_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_source" ADD CONSTRAINT "event_source_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_source" ADD CONSTRAINT "event_source_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_source" ADD CONSTRAINT "event_source_crawled_page_id_crawled_page_id_fk" FOREIGN KEY ("crawled_page_id") REFERENCES "public"."crawled_page"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_social" ADD CONSTRAINT "organization_social_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_social" ADD CONSTRAINT "organization_social_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_email" ADD CONSTRAINT "person_email_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_email" ADD CONSTRAINT "person_email_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_phone" ADD CONSTRAINT "person_phone_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_phone" ADD CONSTRAINT "person_phone_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_social" ADD CONSTRAINT "person_social_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_social" ADD CONSTRAINT "person_social_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crawled_page_tenant_idx" ON "crawled_page" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "crawled_page_source_idx" ON "crawled_page" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crawled_page_url_idx" ON "crawled_page" USING btree ("tenant_id","url");--> statement-breakpoint
CREATE INDEX "dedup_config_tenant_idx" ON "dedup_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "dedup_match_tenant_idx" ON "dedup_match" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "dedup_match_event_a_idx" ON "dedup_match" USING btree ("event_a_id");--> statement-breakpoint
CREATE INDEX "dedup_match_event_b_idx" ON "dedup_match" USING btree ("event_b_id");--> statement-breakpoint
CREATE INDEX "dedup_match_pending_idx" ON "dedup_match" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "event_tenant_idx" ON "event" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_dates_idx" ON "event" USING btree ("tenant_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "event_attendance_tenant_idx" ON "event_attendance" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_attendance_event_idx" ON "event_attendance" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_location_tenant_idx" ON "event_location" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_location_event_idx" ON "event_location" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_location_location_idx" ON "event_location" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "event_org_tenant_idx" ON "event_organization" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_org_event_idx" ON "event_organization" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_org_org_idx" ON "event_organization" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "event_person_tenant_idx" ON "event_person" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_person_event_idx" ON "event_person" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_person_person_idx" ON "event_person" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "event_rel_tenant_idx" ON "event_relationship" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_rel_from_idx" ON "event_relationship" USING btree ("from_event_id");--> statement-breakpoint
CREATE INDEX "event_rel_to_idx" ON "event_relationship" USING btree ("to_event_id");--> statement-breakpoint
CREATE INDEX "event_source_tenant_idx" ON "event_source" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_source_event_idx" ON "event_source" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_source_source_idx" ON "event_source" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "location_tenant_idx" ON "location" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "organization_tenant_idx" ON "organization" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "org_social_tenant_idx" ON "organization_social" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "org_social_org_idx" ON "organization_social" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "person_tenant_idx" ON "person" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "person_email_tenant_idx" ON "person_email" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "person_email_person_idx" ON "person_email" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "person_email_lookup_idx" ON "person_email" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "person_phone_tenant_idx" ON "person_phone" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "person_phone_person_idx" ON "person_phone" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "person_social_tenant_idx" ON "person_social" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "person_social_person_idx" ON "person_social" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "source_tenant_idx" ON "source" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "source_next_crawl_idx" ON "source" USING btree ("tenant_id","next_crawl_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_slug_idx" ON "tenant" USING btree ("slug");