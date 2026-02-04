/** A single piece of knowledge E1 wants to persist */
export interface Learning {
  /** Which domain this learning applies to (e.g., "eventbrite.com") */
  domain: string;
  /** The insight in natural language (e.g., "This site uses infinite scroll pagination") */
  insight: string;
  /** Optional: what experiment/situation produced this insight */
  context?: string;
}

/** Result from recalling knowledge about a domain */
export interface RecallResult {
  domain: string;
  /** One synthesized answer per pattern queried */
  answers: Map<string, string>;
}

/** Configuration for creating a Memory instance */
export interface MemoryConfig {
  /** Honcho API key (defaults to HONCHO_API_KEY env var) */
  apiKey?: string;
  /** Honcho workspace ID (defaults to "unlock-events") */
  workspace?: string;
  /** Honcho environment (defaults to "production") */
  environment?: "production" | "local";
}

/** The Memory instance returned by createMemory */
export interface Memory {
  /**
   * Query Honcho for past knowledge about a domain.
   * Each pattern becomes a separate peer.chat() query.
   *
   * @param domain - The domain to ask about (e.g., "eventbrite.com")
   * @param patterns - Natural language queries (e.g., ["pagination strategy", "selector patterns"])
   * @returns Synthesized answers keyed by pattern
   */
  recall(domain: string, patterns: string[]): Promise<RecallResult>;

  /**
   * Store learnings so Honcho can build domain representations.
   * Internally groups by domain, creates sessions, and adds messages.
   *
   * @param learnings - Array of insights to persist
   */
  remember(learnings: Learning[]): Promise<void>;
}
