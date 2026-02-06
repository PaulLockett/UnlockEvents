-- Experiment tables for R5: Experiment Access
-- Manages experiment lifecycle state shared between M1 (Ingestion Manager) and E1 (Discovery Engine)

CREATE TABLE IF NOT EXISTS "experiment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "source_id" uuid NOT NULL REFERENCES "source"("id"),
  "version" integer NOT NULL DEFAULT 1,
  "name" text NOT NULL,
  "notes" text,
  "phase" text NOT NULL DEFAULT 'exploration',
  "status" text NOT NULL DEFAULT 'active',
  "budget_strategy" text NOT NULL,
  "program" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "experiment_tenant_idx" ON "experiment" ("tenant_id");
CREATE INDEX IF NOT EXISTS "experiment_tenant_source_idx" ON "experiment" ("tenant_id", "source_id");
CREATE INDEX IF NOT EXISTS "experiment_tenant_status_idx" ON "experiment" ("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "experiment_budget" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "experiment_id" uuid NOT NULL REFERENCES "experiment"("id"),
  "platform" text NOT NULL,
  "dimension" text NOT NULL,
  "total" numeric NOT NULL,
  "used" numeric NOT NULL DEFAULT 0,
  "unit" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "experiment_budget_experiment_idx" ON "experiment_budget" ("experiment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "experiment_budget_unique_idx" ON "experiment_budget" ("experiment_id", "platform", "dimension");

CREATE TABLE IF NOT EXISTS "analysis_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "experiment_id" uuid NOT NULL REFERENCES "experiment"("id"),
  "snapshot_path" text,
  "context_path" text,
  "verdict_path" text,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "analysis_request_experiment_idx" ON "analysis_request" ("experiment_id");
CREATE INDEX IF NOT EXISTS "analysis_request_experiment_status_idx" ON "analysis_request" ("experiment_id", "status");

CREATE TABLE IF NOT EXISTS "experiment_outcome" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "experiment_id" uuid NOT NULL REFERENCES "experiment"("id"),
  "outcome_path" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "experiment_outcome_experiment_idx" ON "experiment_outcome" ("experiment_id");
