import { NativeConnection, Worker } from "@temporalio/worker";
import type { WorkerOptions } from "@temporalio/worker";

export interface TemporalConnectionConfig {
  /** Temporal server address (defaults to TEMPORAL_ADDRESS or localhost:7233) */
  address?: string;
  /** Temporal namespace (defaults to TEMPORAL_NAMESPACE or "default") */
  namespace?: string;
  /** Base64-encoded TLS cert (defaults to TEMPORAL_TLS_CERT) */
  tlsCert?: string;
  /** Base64-encoded TLS key (defaults to TEMPORAL_TLS_KEY) */
  tlsKey?: string;
  /** Temporal API key for cloud (defaults to TEMPORAL_API_KEY) */
  apiKey?: string;
}

export interface CreateWorkerConfig {
  /** Temporal task queue name */
  taskQueue: string;
  /** Connection config (reads env vars by default) */
  connection?: TemporalConnectionConfig;
  /** Activities to register (for activity workers) */
  activities?: WorkerOptions["activities"];
  /** Path to workflow bundle (for workflow workers) */
  workflowsPath?: string;
}

function resolveConnectionConfig(
  config?: TemporalConnectionConfig
): Required<Pick<TemporalConnectionConfig, "address" | "namespace">> &
  Pick<TemporalConnectionConfig, "tlsCert" | "tlsKey" | "apiKey"> {
  return {
    address: config?.address || process.env["TEMPORAL_ADDRESS"] || "localhost:7233",
    namespace: config?.namespace || process.env["TEMPORAL_NAMESPACE"] || "default",
    tlsCert: config?.tlsCert || process.env["TEMPORAL_TLS_CERT"],
    tlsKey: config?.tlsKey || process.env["TEMPORAL_TLS_KEY"],
    apiKey: config?.apiKey || process.env["TEMPORAL_API_KEY"],
  };
}

/** Create a NativeConnection to the Temporal server. */
export async function createTemporalConnection(
  config?: TemporalConnectionConfig
): Promise<{ connection: NativeConnection; namespace: string }> {
  const resolved = resolveConnectionConfig(config);

  console.log(`Connecting to Temporal at ${resolved.address} (namespace: ${resolved.namespace})`);

  const connection = await NativeConnection.connect({
    address: resolved.address,
    tls:
      resolved.tlsCert && resolved.tlsKey
        ? {
            clientCertPair: {
              crt: Buffer.from(resolved.tlsCert, "base64"),
              key: Buffer.from(resolved.tlsKey, "base64"),
            },
          }
        : resolved.apiKey
          ? true
          : undefined,
    metadata: resolved.apiKey ? { "temporal-namespace": resolved.namespace } : undefined,
    apiKey: resolved.apiKey || undefined,
  });

  return { connection, namespace: resolved.namespace };
}

/** Create and run a Temporal worker with standardized connection handling. */
export async function createAndRunWorker(config: CreateWorkerConfig): Promise<void> {
  const { connection, namespace } = await createTemporalConnection(config.connection);

  const workerOptions: WorkerOptions = {
    connection,
    namespace,
    taskQueue: config.taskQueue,
  };

  if (config.activities) {
    workerOptions.activities = config.activities;
  }

  if (config.workflowsPath) {
    workerOptions.workflowsPath = config.workflowsPath;
  }

  const worker = await Worker.create(workerOptions);
  console.log(`Worker started on task queue: ${config.taskQueue}`);
  await worker.run();
}
