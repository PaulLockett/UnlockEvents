import { describe, it, expect } from "vitest";
import { createCaptureAccess } from "../src/capture-access.js";

const TENANT = "t-test";

describe("CaptureAccess", () => {
  const access = createCaptureAccess({});

  const sampleBundle = {
    sourceId: "src-1",
    sessionId: "sess-1",
    html: "<div>events</div>",
    screenshotUrl: null,
    networkLogUrl: null,
    videoUrl: null,
    metadata: { url: "https://example.com" },
    capturedAt: new Date().toISOString(),
  };

  describe("preserveCapture", () => {
    it("returns a UUID", async () => {
      const id = await access.preserveCapture(TENANT, sampleBundle);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe("recallCapture", () => {
    it("returns an ObservationBundle", async () => {
      const bundle = await access.recallCapture(TENANT, "cap-1");
      expect(bundle).toHaveProperty("id", "cap-1");
      expect(bundle).toHaveProperty("sourceId");
      expect(bundle).toHaveProperty("metadata");
    });
  });

  describe("confirmExtraction", () => {
    it("resolves without error", async () => {
      await expect(access.confirmExtraction(TENANT, "cap-1")).resolves.toBeUndefined();
    });
  });

  describe("detectEnvironmentDrift", () => {
    it("returns drift assessment", async () => {
      const drift = await access.detectEnvironmentDrift(TENANT, "src-1");
      expect(drift).toHaveProperty("hasDrifted");
      expect(drift).toHaveProperty("driftSignals");
      expect(Array.isArray(drift.driftSignals)).toBe(true);
    });
  });
});
