import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";
import * as activities from "./activities.js";

createAndRunWorker({
  taskQueue: "capture-access",
  activities,
}).catch((err) => {
  console.error("Capture access worker failed:", err);
  process.exit(1);
});
