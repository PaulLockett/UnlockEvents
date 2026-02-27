import type {
  EnvironmentNavigator,
  EnvironmentNavigatorConfig,
  NavigationSession,
  ObservationBundle,
  EnvironmentAction,
} from "./types.js";

export function createEnvironmentNavigator(
  config: EnvironmentNavigatorConfig = {}
): EnvironmentNavigator {
  const _apiKey = config.browserbaseApiKey ?? process.env["BROWSERBASE_API_KEY"];

  return {
    async enterEnvironment(sourceId: string): Promise<NavigationSession> {
      console.log(`[R4:stub] enterEnvironment source=${sourceId}`);
      return {
        sessionId: crypto.randomUUID(),
        sourceId,
        startedAt: new Date().toISOString(),
      };
    },

    async traverseTo(sessionId: string, url: string): Promise<ObservationBundle> {
      console.log(`[R4:stub] traverseTo session=${sessionId} url=${url}`);
      return {
        url,
        html: "<html><body>stub</body></html>",
        screenshotBase64: null,
        networkLog: [],
        timestamp: new Date().toISOString(),
        metadata: { sessionId },
      };
    },

    async performAction(sessionId: string, action: EnvironmentAction): Promise<ObservationBundle> {
      console.log(`[R4:stub] performAction session=${sessionId} type=${action.type}`);
      return {
        url: "https://example.com",
        html: "<html><body>stub-after-action</body></html>",
        screenshotBase64: null,
        networkLog: [],
        timestamp: new Date().toISOString(),
        metadata: { sessionId, action: action.type },
      };
    },

    async exitEnvironment(sessionId: string): Promise<void> {
      console.log(`[R4:stub] exitEnvironment session=${sessionId}`);
    },
  };
}
