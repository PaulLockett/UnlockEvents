import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";

createAndRunWorker({
  taskQueue: "discovery-engine",
  workflowsPath: new URL("./workflows/index.js", import.meta.url).pathname,
}).catch((err) => {
  console.error("Discovery engine worker failed:", err);
  process.exit(1);
});
