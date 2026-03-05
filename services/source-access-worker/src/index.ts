import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";
import * as activities from "./activities.js";

createAndRunWorker({
  taskQueue: "source-access",
  activities,
}).catch((err) => {
  console.error("Source access worker failed:", err);
  process.exit(1);
});
