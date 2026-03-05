import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";
import * as activities from "./activities.js";

createAndRunWorker({
  taskQueue: "environment-navigator",
  activities,
}).catch((err) => {
  console.error("Environment navigator worker failed:", err);
  process.exit(1);
});
