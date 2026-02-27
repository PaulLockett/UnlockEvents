import { createBrowserProvider, type BrowserSession } from "./browser-provider.js";
import type {
  EnvironmentNavigator,
  EnvironmentNavigatorConfig,
  NavigationSession,
  ObservationBundle,
  EnvironmentAction,
} from "./types.js";

async function captureObservation(session: BrowserSession): Promise<ObservationBundle> {
  const page = session.page;
  const url = page.url();
  const html = await page.content();

  let screenshotBase64: string | null = null;
  try {
    const buffer = await page.screenshot({ type: "png" });
    screenshotBase64 = buffer.toString("base64");
  } catch {
    // Screenshot may fail in some contexts; non-critical
  }

  return {
    url,
    html,
    screenshotBase64,
    networkLog: [],
    timestamp: new Date().toISOString(),
    metadata: { sessionId: session.sessionId },
  };
}

export function createEnvironmentNavigator(
  config: EnvironmentNavigatorConfig = {}
): EnvironmentNavigator {
  const apiKey = config.browserbaseApiKey ?? process.env["BROWSERBASE_API_KEY"];
  const projectId = config.browserbaseProjectId ?? process.env["BROWSERBASE_PROJECT_ID"];

  if (!apiKey) throw new Error("BROWSERBASE_API_KEY or browserbaseApiKey is required");
  if (!projectId) throw new Error("BROWSERBASE_PROJECT_ID or browserbaseProjectId is required");

  const provider = createBrowserProvider(apiKey, projectId);
  const sessions = new Map<string, BrowserSession>();

  function getSession(sessionId: string): BrowserSession {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found or already closed`);
    }
    return session;
  }

  return {
    async enterEnvironment(sourceId: string): Promise<NavigationSession> {
      const session = await provider.createSession();
      sessions.set(session.sessionId, session);

      return {
        sessionId: session.sessionId,
        sourceId,
        startedAt: new Date().toISOString(),
      };
    },

    async traverseTo(sessionId: string, url: string): Promise<ObservationBundle> {
      const session = getSession(sessionId);
      await session.page.goto(url, { waitUntil: "domcontentloaded" });
      return captureObservation(session);
    },

    async performAction(sessionId: string, action: EnvironmentAction): Promise<ObservationBundle> {
      const session = getSession(sessionId);
      const page = session.page;

      switch (action.type) {
        case "click":
          if (!action.selector) throw new Error("click action requires a selector");
          await page.click(action.selector);
          break;
        case "fill":
          if (!action.selector) throw new Error("fill action requires a selector");
          await page.fill(action.selector, action.value ?? "");
          break;
        case "scroll":
          await page.evaluate((sel: string | null) => {
            if (sel) {
              (
                globalThis as unknown as {
                  document: { querySelector(s: string): { scrollIntoView(): void } | null };
                }
              ).document
                .querySelector(sel)
                ?.scrollIntoView();
            } else {
              (globalThis as unknown as { scrollBy(x: number, y: number): void }).scrollBy(0, 500);
            }
          }, action.selector ?? null);
          break;
        case "hover":
          if (!action.selector) throw new Error("hover action requires a selector");
          await page.hover(action.selector);
          break;
        case "wait":
          await page.waitForTimeout(Number(action.value) || 1000);
          break;
      }

      return captureObservation(session);
    },

    async exitEnvironment(sessionId: string): Promise<void> {
      const session = sessions.get(sessionId);
      if (!session) return;

      await provider.closeSession(session);
      sessions.delete(sessionId);
    },
  };
}
