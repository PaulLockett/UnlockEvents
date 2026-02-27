import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock state ----

let createdSessions: string[] = [];
let _closedSessions: string[] = [];
let navigatedUrls: string[] = [];
let executedActions: Array<{ type: string; selector?: string; value?: string }> = [];
let pageContent = "<html><body>test content</body></html>";
let pageUrl = "about:blank";
let sessionCounter = 0;

const mockPage = {
  url: vi.fn(() => pageUrl),
  content: vi.fn(async () => pageContent),
  screenshot: vi.fn(async () => Buffer.from("fake-png-data")),
  goto: vi.fn(async (url: string) => {
    navigatedUrls.push(url);
    pageUrl = url;
  }),
  click: vi.fn(async (selector: string) => {
    executedActions.push({ type: "click", selector });
  }),
  fill: vi.fn(async (selector: string, value: string) => {
    executedActions.push({ type: "fill", selector, value });
  }),
  evaluate: vi.fn(async () => {
    executedActions.push({ type: "scroll" });
  }),
  hover: vi.fn(async (selector: string) => {
    executedActions.push({ type: "hover", selector });
  }),
  waitForTimeout: vi.fn(async (ms: number) => {
    executedActions.push({ type: "wait", value: String(ms) });
  }),
  close: vi.fn(async () => {}),
};

// ---- Mocks ----

vi.mock("@browserbasehq/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    sessions: {
      create: vi.fn(async () => {
        sessionCounter++;
        const id = `bb-session-${sessionCounter}`;
        createdSessions.push(id);
        return { id, connectUrl: `wss://browserbase.test/${id}` };
      }),
    },
  })),
}));

vi.mock("playwright-core", () => ({
  chromium: {
    connectOverCDP: vi.fn(async () => ({
      contexts: () => [
        {
          pages: () => [mockPage],
          newPage: vi.fn(async () => mockPage),
        },
      ],
      close: vi.fn(async () => {}),
    })),
  },
}));

import { createEnvironmentNavigator } from "../src/environment-navigator.js";
import type { EnvironmentNavigator } from "../src/types.js";

describe("EnvironmentNavigator", () => {
  let navigator: EnvironmentNavigator;

  beforeEach(() => {
    vi.clearAllMocks();
    createdSessions = [];
    _closedSessions = [];
    navigatedUrls = [];
    executedActions = [];
    pageContent = "<html><body>test content</body></html>";
    pageUrl = "about:blank";
    sessionCounter = 0;

    navigator = createEnvironmentNavigator({
      browserbaseApiKey: "test-api-key",
      browserbaseProjectId: "test-project-id",
    });
  });

  describe("config validation", () => {
    it("throws when no API key provided", () => {
      const original = process.env["BROWSERBASE_API_KEY"];
      delete process.env["BROWSERBASE_API_KEY"];
      try {
        expect(() => createEnvironmentNavigator({ browserbaseProjectId: "proj" })).toThrow(
          "BROWSERBASE_API_KEY"
        );
      } finally {
        if (original) process.env["BROWSERBASE_API_KEY"] = original;
      }
    });

    it("throws when no project ID provided", () => {
      const original = process.env["BROWSERBASE_PROJECT_ID"];
      delete process.env["BROWSERBASE_PROJECT_ID"];
      try {
        expect(() => createEnvironmentNavigator({ browserbaseApiKey: "key" })).toThrow(
          "BROWSERBASE_PROJECT_ID"
        );
      } finally {
        if (original) process.env["BROWSERBASE_PROJECT_ID"] = original;
      }
    });
  });

  describe("enterEnvironment", () => {
    it("creates a Browserbase session and returns session info", async () => {
      const session = await navigator.enterEnvironment("src-1");

      expect(session.sessionId).toBe("bb-session-1");
      expect(session.sourceId).toBe("src-1");
      expect(session.startedAt).toBeDefined();
      expect(createdSessions).toHaveLength(1);
    });

    it("creates separate sessions for different sources", async () => {
      const s1 = await navigator.enterEnvironment("src-1");
      const s2 = await navigator.enterEnvironment("src-2");

      expect(s1.sessionId).not.toBe(s2.sessionId);
      expect(createdSessions).toHaveLength(2);
    });
  });

  describe("traverseTo", () => {
    it("navigates to URL and returns observation bundle", async () => {
      const session = await navigator.enterEnvironment("src-1");
      pageContent = "<html><body>events page</body></html>";
      pageUrl = "https://example.com/events";

      const bundle = await navigator.traverseTo(session.sessionId, "https://example.com/events");

      expect(navigatedUrls).toContain("https://example.com/events");
      expect(bundle.html).toBe("<html><body>events page</body></html>");
      expect(bundle.url).toBe("https://example.com/events");
      expect(bundle.screenshotBase64).toBeDefined();
      expect(bundle.timestamp).toBeDefined();
    });

    it("throws for unknown session ID", async () => {
      await expect(navigator.traverseTo("nonexistent", "https://example.com")).rejects.toThrow(
        "Session nonexistent not found"
      );
    });
  });

  describe("performAction", () => {
    it("executes click action", async () => {
      const session = await navigator.enterEnvironment("src-1");

      const bundle = await navigator.performAction(session.sessionId, {
        type: "click",
        selector: "#next-page",
      });

      expect(executedActions).toContainEqual({
        type: "click",
        selector: "#next-page",
      });
      expect(bundle.html).toBeDefined();
    });

    it("executes fill action", async () => {
      const session = await navigator.enterEnvironment("src-1");

      await navigator.performAction(session.sessionId, {
        type: "fill",
        selector: "#search",
        value: "alabama events",
      });

      expect(executedActions).toContainEqual({
        type: "fill",
        selector: "#search",
        value: "alabama events",
      });
    });

    it("executes scroll action", async () => {
      const session = await navigator.enterEnvironment("src-1");

      await navigator.performAction(session.sessionId, {
        type: "scroll",
      });

      expect(executedActions).toContainEqual({ type: "scroll" });
    });

    it("executes hover action", async () => {
      const session = await navigator.enterEnvironment("src-1");

      await navigator.performAction(session.sessionId, {
        type: "hover",
        selector: ".dropdown",
      });

      expect(executedActions).toContainEqual({
        type: "hover",
        selector: ".dropdown",
      });
    });

    it("executes wait action", async () => {
      const session = await navigator.enterEnvironment("src-1");

      await navigator.performAction(session.sessionId, {
        type: "wait",
        value: "2000",
      });

      expect(executedActions).toContainEqual({
        type: "wait",
        value: "2000",
      });
    });

    it("throws when click has no selector", async () => {
      const session = await navigator.enterEnvironment("src-1");

      await expect(navigator.performAction(session.sessionId, { type: "click" })).rejects.toThrow(
        "click action requires a selector"
      );
    });

    it("throws when fill has no selector", async () => {
      const session = await navigator.enterEnvironment("src-1");

      await expect(
        navigator.performAction(session.sessionId, { type: "fill", value: "test" })
      ).rejects.toThrow("fill action requires a selector");
    });

    it("throws when hover has no selector", async () => {
      const session = await navigator.enterEnvironment("src-1");

      await expect(navigator.performAction(session.sessionId, { type: "hover" })).rejects.toThrow(
        "hover action requires a selector"
      );
    });

    it("throws for unknown session ID", async () => {
      await expect(
        navigator.performAction("nonexistent", { type: "click", selector: "#x" })
      ).rejects.toThrow("Session nonexistent not found");
    });
  });

  describe("exitEnvironment", () => {
    it("closes the browser session", async () => {
      const session = await navigator.enterEnvironment("src-1");
      await navigator.exitEnvironment(session.sessionId);

      // Session should be removed — subsequent calls should not find it
      await expect(navigator.traverseTo(session.sessionId, "https://example.com")).rejects.toThrow(
        "not found"
      );
    });

    it("is idempotent for already-closed sessions", async () => {
      await expect(navigator.exitEnvironment("already-gone")).resolves.toBeUndefined();
    });
  });
});
