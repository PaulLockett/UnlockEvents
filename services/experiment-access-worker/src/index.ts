import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";
import * as activities from "./activities.js";

createAndRunWorker({
  taskQueue: "experiment-access",
  activities,
}).catch((err) => {
  console.error("Experiment access worker failed:", err);
  process.exit(1);
});
