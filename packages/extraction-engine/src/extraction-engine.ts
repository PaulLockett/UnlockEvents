import type {
  ExtractionEngine,
  ExtractionEngineConfig,
  ExtractionResult,
  FeedContent,
} from "./types.js";

export function createExtractionEngine(config: ExtractionEngineConfig = {}): ExtractionEngine {
  void config;

  return {
    async extractEvents(tenantId: string, captureId: string): Promise<ExtractionResult> {
      console.log(`[E2:stub] extractEvents tenant=${tenantId} capture=${captureId}`);
      return {
        captureId,
        events: [],
        extractedAt: new Date().toISOString(),
        warnings: ["stub extraction — no real processing performed"],
      };
    },

    async extractFromFeed(tenantId: string, feed: FeedContent): Promise<ExtractionResult> {
      console.log(
        `[E2:stub] extractFromFeed tenant=${tenantId} format=${feed.format} url=${feed.sourceUrl}`
      );
      return {
        captureId: "feed-" + crypto.randomUUID(),
        events: [],
        extractedAt: new Date().toISOString(),
        warnings: ["stub feed extraction — no real processing performed"],
      };
    },
  };
}
