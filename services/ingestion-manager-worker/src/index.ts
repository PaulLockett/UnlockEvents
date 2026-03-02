import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";

createAndRunWorker({
  taskQueue: "ingestion-manager",
  workflowsPath: new URL("./workflows/index.js", import.meta.url).pathname,
}).catch((err) => {
  console.error("Ingestion manager worker failed:", err);
  process.exit(1);
});
