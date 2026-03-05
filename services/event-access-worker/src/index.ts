import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";
import * as activities from "./activities.js";

createAndRunWorker({
  taskQueue: "event-access",
  activities,
}).catch((err) => {
  console.error("Event access worker failed:", err);
  process.exit(1);
});
