import Browserbase from "@browserbasehq/sdk";
import { chromium, type Browser, type Page } from "playwright-core";

export interface BrowserSession {
  sessionId: string;
  browser: Browser;
  page: Page;
}

export interface BrowserProvider {
  createSession(): Promise<BrowserSession>;
  closeSession(session: BrowserSession): Promise<void>;
}

export function createBrowserProvider(apiKey: string, projectId: string): BrowserProvider {
  const bb = new Browserbase({ apiKey });

  return {
    async createSession(): Promise<BrowserSession> {
      const session = await bb.sessions.create({ projectId });

      const browser = await chromium.connectOverCDP(session.connectUrl);
      const context = browser.contexts()[0]!;
      const page = context.pages()[0] ?? (await context.newPage());

      return {
        sessionId: session.id,
        browser,
        page,
      };
    },

    async closeSession(session: BrowserSession): Promise<void> {
      await session.page.close().catch(() => {});
      await session.browser.close().catch(() => {});
    },
  };
}
