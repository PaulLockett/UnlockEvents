import { createCaptureAccess } from "@unlock-events/capture-access";
import type {
  CaptureAccess,
  ObservationBundle,
  EnvironmentDrift,
} from "@unlock-events/capture-access";

let instance: CaptureAccess | null = null;

function getInstance(): CaptureAccess {
  if (!instance) {
    instance = createCaptureAccess({
      connectionString: process.env["DATABASE_URL"],
      storageBucket: process.env["SUPABASE_STORAGE_BUCKET"],
    });
  }
  return instance;
}

export async function preserveCapture(
  tenantId: string,
  bundle: Omit<ObservationBundle, "id">
): Promise<string> {
  return getInstance().preserveCapture(tenantId, bundle);
}

export async function recallCapture(
  tenantId: string,
  captureId: string
): Promise<ObservationBundle> {
  return getInstance().recallCapture(tenantId, captureId);
}

export async function confirmExtraction(tenantId: string, captureId: string): Promise<void> {
  return getInstance().confirmExtraction(tenantId, captureId);
}

export async function detectEnvironmentDrift(
  tenantId: string,
  sourceId: string
): Promise<EnvironmentDrift> {
  return getInstance().detectEnvironmentDrift(tenantId, sourceId);
}
