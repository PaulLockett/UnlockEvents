/**
 * R3: Capture Access — Public Interface
 *
 * Encapsulates observation bundle lifecycle — how captured environmental data
 * (screenshots, network logs, HTML, video, etc.) is archived and tracked
 * through the extraction pipeline.
 * Technology-agnostic interface. No storage types leak through this boundary.
 */

export type CaptureStatus = "preserved" | "extracted" | "expired";

export interface ObservationBundle {
  id: string;
  sourceId: string;
  sessionId: string;
  html: string | null;
  screenshotUrl: string | null;
  networkLogUrl: string | null;
  videoUrl: string | null;
  metadata: Record<string, unknown>;
  capturedAt: string;
}

export interface CaptureRecord {
  id: string;
  sourceId: string;
  sessionId: string;
  status: CaptureStatus;
  bundlePath: string;
  capturedAt: string;
  extractedAt: string | null;
}

export interface EnvironmentDrift {
  hasDrifted: boolean;
  previousCaptureId: string | null;
  driftSignals: string[];
}

export interface CaptureAccess {
  /** Archive an observation bundle from a navigation session. Returns capture key (UUID). */
  preserveCapture(tenantId: string, bundle: Omit<ObservationBundle, "id">): Promise<string>;

  /** Provide a previously archived bundle for extraction. */
  recallCapture(tenantId: string, captureId: string): Promise<ObservationBundle>;

  /** Extraction pipeline completed processing this bundle. */
  confirmExtraction(tenantId: string, captureId: string): Promise<void>;

  /** Determine if the environment has changed since the last capture. */
  detectEnvironmentDrift(tenantId: string, sourceId: string): Promise<EnvironmentDrift>;
}

export interface CaptureAccessConfig {
  connectionString?: string;
  storageBucket?: string;
}
