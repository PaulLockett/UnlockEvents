/**
 * R4: Environment Navigator — Public Interface
 *
 * Encapsulates browser session lifecycle — how the agent enters, traverses,
 * observes, and exits web environments.
 * Volatility: which automation provider (Browserbase today, could change).
 * Technology-agnostic interface. No provider types leak through this boundary.
 */

export interface ObservationBundle {
  url: string;
  html: string;
  screenshotBase64: string | null;
  networkLog: NetworkEntry[];
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface NetworkEntry {
  url: string;
  method: string;
  status: number;
  contentType: string | null;
}

export interface NavigationSession {
  sessionId: string;
  sourceId: string;
  startedAt: string;
}

export type ActionType = "click" | "fill" | "scroll" | "hover" | "wait";

export interface EnvironmentAction {
  type: ActionType;
  selector?: string;
  value?: string;
  description?: string;
}

export interface EnvironmentNavigator {
  /** Open a browser session to navigate a web environment. Returns session info. */
  enterEnvironment(sourceId: string): Promise<NavigationSession>;

  /** Navigate to a location in the environment and observe. */
  traverseTo(sessionId: string, url: string): Promise<ObservationBundle>;

  /** Execute an interaction (click, fill, scroll) and observe the result. */
  performAction(sessionId: string, action: EnvironmentAction): Promise<ObservationBundle>;

  /** End the navigation session. */
  exitEnvironment(sessionId: string): Promise<void>;
}

export interface EnvironmentNavigatorConfig {
  browserbaseApiKey?: string;
  browserbaseProjectId?: string;
}
