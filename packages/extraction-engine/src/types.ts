/**
 * E2: Extraction Engine — Public Interface
 *
 * Encapsulates bundle-to-event transformation — how observation bundles
 * become structured event data.
 * E2 calls R3 (recallCapture) to access the bundle for extraction.
 * Technology-agnostic interface.
 */

export interface ExtractedEvent {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  url: string | null;
  organizer: string | null;
  confidence: number;
}

export interface ExtractionResult {
  captureId: string;
  events: ExtractedEvent[];
  extractedAt: string;
  warnings: string[];
}

export interface FeedContent {
  format: "rss" | "json" | "ical";
  rawContent: string;
  sourceUrl: string;
}

export interface ExtractionEngine {
  /** Transform an observation bundle into structured event data. */
  extractEvents(tenantId: string, captureId: string): Promise<ExtractionResult>;

  /** Transform structured feed content (RSS/JSON/iCal) into event data. */
  extractFromFeed(tenantId: string, feed: FeedContent): Promise<ExtractionResult>;
}

export interface ExtractionEngineConfig {
  aiGateway?: unknown;
  captureAccess?: unknown;
}
