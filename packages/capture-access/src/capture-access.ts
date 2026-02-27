import type {
  CaptureAccess,
  CaptureAccessConfig,
  ObservationBundle,
  EnvironmentDrift,
} from "./types.js";

export function createCaptureAccess(config: CaptureAccessConfig = {}): CaptureAccess {
  const _connectionString = config.connectionString ?? process.env["DATABASE_URL"];

  return {
    async preserveCapture(
      tenantId: string,
      bundle: Omit<ObservationBundle, "id">
    ): Promise<string> {
      console.log(`[R3:stub] preserveCapture tenant=${tenantId} source=${bundle.sourceId}`);
      return crypto.randomUUID();
    },

    async recallCapture(tenantId: string, captureId: string): Promise<ObservationBundle> {
      console.log(`[R3:stub] recallCapture tenant=${tenantId} capture=${captureId}`);
      return {
        id: captureId,
        sourceId: "stub-source",
        sessionId: "stub-session",
        html: null,
        screenshotUrl: null,
        networkLogUrl: null,
        videoUrl: null,
        metadata: {},
        capturedAt: new Date().toISOString(),
      };
    },

    async confirmExtraction(tenantId: string, captureId: string): Promise<void> {
      console.log(`[R3:stub] confirmExtraction tenant=${tenantId} capture=${captureId}`);
    },

    async detectEnvironmentDrift(tenantId: string, sourceId: string): Promise<EnvironmentDrift> {
      console.log(`[R3:stub] detectEnvironmentDrift tenant=${tenantId} source=${sourceId}`);
      return {
        hasDrifted: false,
        previousCaptureId: null,
        driftSignals: [],
      };
    },
  };
}
