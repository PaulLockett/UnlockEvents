import { createEnvironmentNavigator } from "@unlock-events/environment-navigator";
import type {
  EnvironmentNavigator,
  NavigationSession,
  ObservationBundle,
  EnvironmentAction,
} from "@unlock-events/environment-navigator";

let instance: EnvironmentNavigator | null = null;

function getInstance(): EnvironmentNavigator {
  if (!instance) {
    instance = createEnvironmentNavigator({
      browserbaseApiKey: process.env["BROWSERBASE_API_KEY"],
      browserbaseProjectId: process.env["BROWSERBASE_PROJECT_ID"],
    });
  }
  return instance;
}

export async function enterEnvironment(sourceId: string): Promise<NavigationSession> {
  return getInstance().enterEnvironment(sourceId);
}

export async function traverseTo(sessionId: string, url: string): Promise<ObservationBundle> {
  return getInstance().traverseTo(sessionId, url);
}

export async function performAction(
  sessionId: string,
  action: EnvironmentAction
): Promise<ObservationBundle> {
  return getInstance().performAction(sessionId, action);
}

export async function exitEnvironment(sessionId: string): Promise<void> {
  return getInstance().exitEnvironment(sessionId);
}
