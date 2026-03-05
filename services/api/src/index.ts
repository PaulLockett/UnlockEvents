import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { Connection, Client } from "@temporalio/client";
import { TASK_QUEUES } from "@unlock-events/temporal-interfaces";
import type { DiscoveryRequest } from "@unlock-events/temporal-interfaces";

const app = new Hono();

// ─── Temporal Client (lazy-initialized) ─────────────────────────────────────

let temporalClient: Client | null = null;

async function getTemporalClient(): Promise<Client> {
  if (temporalClient) return temporalClient;

  const address = process.env["TEMPORAL_ADDRESS"] || "localhost:7233";
  const namespace = process.env["TEMPORAL_NAMESPACE"] || "default";
  const apiKey = process.env["TEMPORAL_API_KEY"];

  const connection = await Connection.connect({
    address,
    tls: apiKey ? true : undefined,
    metadata: apiKey ? { "temporal-namespace": namespace } : undefined,
    apiKey: apiKey || undefined,
  });

  temporalClient = new Client({ connection, namespace });
  return temporalClient;
}

// ─── Health ─────────────────────────────────────────────────────────────────

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "unlock-events-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (c) => {
  return c.json({
    name: "UnlockEvents API",
    version: "0.0.1",
    endpoints: {
      health: "/health",
      discovery: "/api/v1/discovery",
      events: "/api/v1/events (coming soon)",
    },
  });
});

// ─── Discovery Workflows (M1) ──────────────────────────────────────────────

app.post("/api/v1/discovery", async (c) => {
  const body = await c.req.json<DiscoveryRequest>();

  if (!body.sourceId || !body.tenantId) {
    return c.json({ error: "sourceId and tenantId are required" }, 400);
  }

  const client = await getTemporalClient();
  const workflowId = `discovery-${body.tenantId}-${body.sourceId}-${Date.now()}`;

  const handle = await client.workflow.start("orchestrateDiscoveryCycle", {
    taskQueue: TASK_QUEUES.INGESTION_MANAGER,
    workflowId,
    args: [body],
  });

  return c.json({
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
    status: "started",
  });
});

app.get("/api/v1/discovery/:workflowId", async (c) => {
  const workflowId = c.req.param("workflowId");

  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  const description = await handle.describe();

  return c.json({
    workflowId: description.workflowId,
    status: description.status.name,
    startTime: description.startTime,
    closeTime: description.closeTime,
  });
});

// ─── Event Processing Workflows (M2) ───────────────────────────────────────

app.post("/api/v1/events/process", async (c) => {
  const body = await c.req.json<{ tenantId: string; eventIds: string[] }>();

  if (!body.tenantId || !body.eventIds?.length) {
    return c.json({ error: "tenantId and eventIds (non-empty array) are required" }, 400);
  }

  const client = await getTemporalClient();
  const workflowId = `event-batch-${body.tenantId}-${Date.now()}`;

  const handle = await client.workflow.start("processBatch", {
    taskQueue: TASK_QUEUES.EVENT_MANAGER,
    workflowId,
    args: [body.tenantId, body.eventIds],
  });

  return c.json({
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
    status: "started",
  });
});

// ─── Server ─────────────────────────────────────────────────────────────────

const port = Number(process.env["PORT"]) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`UnlockEvents API running on port ${info.port}`);
});
