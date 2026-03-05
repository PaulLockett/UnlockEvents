import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";

createAndRunWorker({
  taskQueue: "event-manager",
  workflowsPath: new URL("./workflows/index.js", import.meta.url).pathname,
}).catch((err) => {
  console.error("Event manager worker failed:", err);
  process.exit(1);
});
