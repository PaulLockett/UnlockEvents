import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";
import * as activities from "./activities.js";

createAndRunWorker({
  taskQueue: "memory",
  activities,
}).catch((err) => {
  console.error("Memory worker failed:", err);
  process.exit(1);
});
