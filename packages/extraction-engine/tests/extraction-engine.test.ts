import { describe, it, expect } from "vitest";
import { createExtractionEngine } from "../src/extraction-engine.js";

const TENANT = "t-test";

describe("ExtractionEngine", () => {
  const engine = createExtractionEngine({});

  describe("extractEvents", () => {
    it("returns an ExtractionResult", async () => {
      const result = await engine.extractEvents(TENANT, "cap-1");
      expect(result).toHaveProperty("captureId", "cap-1");
      expect(result).toHaveProperty("events");
      expect(result).toHaveProperty("extractedAt");
      expect(result).toHaveProperty("warnings");
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe("extractFromFeed", () => {
    it("returns an ExtractionResult for RSS feed", async () => {
      const result = await engine.extractFromFeed(TENANT, {
        format: "rss",
        rawContent: "<rss>stub</rss>",
        sourceUrl: "https://example.com/feed.xml",
      });
      expect(result).toHaveProperty("events");
      expect(result).toHaveProperty("extractedAt");
      expect(Array.isArray(result.events)).toBe(true);
    });

    it("returns an ExtractionResult for JSON feed", async () => {
      const result = await engine.extractFromFeed(TENANT, {
        format: "json",
        rawContent: "[]",
        sourceUrl: "https://example.com/events.json",
      });
      expect(result).toHaveProperty("events");
      expect(Array.isArray(result.events)).toBe(true);
    });
  });
});
