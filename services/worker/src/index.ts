import { NativeConnection, Worker } from "@temporalio/worker";

const TASK_QUEUE = "unlock-events-ingestion";

async function run() {
  const address = process.env["TEMPORAL_ADDRESS"] || "localhost:7233";
  const namespace = process.env["TEMPORAL_NAMESPACE"] || "default";

  console.log(`Connecting to Temporal at ${address} (namespace: ${namespace})`);

  const tlsCert = process.env["TEMPORAL_TLS_CERT"];
  const tlsKey = process.env["TEMPORAL_TLS_KEY"];

  const connection = await NativeConnection.connect({
    address,
    tls:
      tlsCert && tlsKey
        ? {
            clientCertPair: {
              crt: Buffer.from(tlsCert, "base64"),
              key: Buffer.from(tlsKey, "base64"),
            },
          }
        : undefined,
  });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: TASK_QUEUE,
    workflowsPath: new URL("./workflows/index.js", import.meta.url).pathname,
    activities: await import("./activities/index.js"),
  });

  console.log(`Worker started on task queue: ${TASK_QUEUE}`);
  await worker.run();
}

run().catch((err) => {
  console.error("Worker failed:", err);
  process.exit(1);
});
