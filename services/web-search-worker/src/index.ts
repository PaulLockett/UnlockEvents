import { createAndRunWorker } from "@unlock-events/temporal-worker-utils";
import * as activities from "./activities.js";

createAndRunWorker({
  taskQueue: "web-search",
  activities,
}).catch((err) => {
  console.error("Web Search worker failed:", err);
  process.exit(1);
});
