import { describe, it, expect } from "vitest";
import { createEnvironmentNavigator } from "../src/environment-navigator.js";

describe("EnvironmentNavigator", () => {
  const navigator = createEnvironmentNavigator({});

  describe("enterEnvironment", () => {
    it("returns a NavigationSession with UUID", async () => {
      const session = await navigator.enterEnvironment("src-1");
      expect(session.sessionId).toMatch(/^[0-9a-f-]{36}$/);
      expect(session.sourceId).toBe("src-1");
      expect(session).toHaveProperty("startedAt");
    });
  });

  describe("traverseTo", () => {
    it("returns an ObservationBundle", async () => {
      const bundle = await navigator.traverseTo("sess-1", "https://example.com");
      expect(bundle.url).toBe("https://example.com");
      expect(bundle).toHaveProperty("html");
      expect(bundle).toHaveProperty("networkLog");
      expect(bundle).toHaveProperty("timestamp");
    });
  });

  describe("performAction", () => {
    it("returns an ObservationBundle after action", async () => {
      const bundle = await navigator.performAction("sess-1", {
        type: "click",
        selector: "#next",
      });
      expect(bundle).toHaveProperty("html");
      expect(bundle).toHaveProperty("metadata");
    });
  });

  describe("exitEnvironment", () => {
    it("resolves without error", async () => {
      await expect(navigator.exitEnvironment("sess-1")).resolves.toBeUndefined();
    });
  });
});
