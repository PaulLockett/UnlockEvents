import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";
import * as activities from "./activities.js";

createAndRunWorker({
  taskQueue: "ai-gateway",
  activities,
}).catch((err) => {
  console.error("AI Gateway worker failed:", err);
  process.exit(1);
});
