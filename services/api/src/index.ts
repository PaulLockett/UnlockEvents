import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

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
      events: "/api/v1/events (coming soon)",
    },
  });
});

const port = Number(process.env["PORT"]) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`UnlockEvents API running on port ${info.port}`);
});
