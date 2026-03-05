import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";

createAndRunWorker({
  taskQueue: "dedup-engine",
  workflowsPath: new URL("./workflows/index.js", import.meta.url).pathname,
}).catch((err) => {
  console.error("Dedup engine worker failed:", err);
  process.exit(1);
});
