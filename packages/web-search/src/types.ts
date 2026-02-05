import type { AxAIService } from "@unlock-events/ai-gateway";

// Re-export for consumers
export type { AxAIService };

/** A single search result from a web search */
export interface WebSearchResult {
  /** The URL of the search result */
  url: string;
  /** The title of the page */
  title: string;
  /** When the content was published, if available */
  publishedDate?: string;
  /** The author of the content, if available */
  author?: string;
  /** Which generated query produced this result */
  sourceQuery: string;
}

/** Configuration for the rate limiter */
export interface RateLimiterConfig {
  /** Maximum number of requests allowed in the window (default: 10) */
  maxRequests?: number;
  /** Time window in milliseconds (default: 60000) */
  windowMs?: number;
}

/** Rate limiter interface */
export interface RateLimiter {
  /** Acquire permission to make a request. Resolves when allowed. */
  acquire(): Promise<void>;
}

/** Configuration for the Exa search client */
export interface ExaClientConfig {
  /** Exa API key (defaults to EXA_API_KEY env var) */
  apiKey?: string;
  /** Rate limiter instance (created automatically if not provided) */
  rateLimiter?: RateLimiter;
  /** Number of results per query (default: 10) */
  numResults?: number;
  /** Exa search type (default: "auto") */
  searchType?: "auto" | "neural" | "keyword";
}

/** Exa client interface for searching */
export interface ExaClient {
  /** Execute a search query and return results */
  search(query: string): Promise<WebSearchResult[]>;
}

/** Configuration for the search program */
export interface SearchProgramConfig {
  /** Maximum number of queries to decompose into (default: 3) */
  maxQueries?: number;
}

/** Search program interface */
export interface SearchProgram {
  /** Decompose a natural language query into sub-queries and execute them */
  execute(query: string): Promise<WebSearchResult[]>;
}

/** Configuration for creating a WebSearch instance */
export interface WebSearchConfig {
  /** Ax AI service instance (injected from ai-gateway) */
  aiService: AxAIService;
  /** Exa client configuration */
  exa?: ExaClientConfig;
  /** Search program configuration */
  searchProgram?: SearchProgramConfig;
}

/** The web search instance returned by createWebSearch */
export interface WebSearch {
  /** Search the web with a natural language query */
  search(query: string): Promise<WebSearchResult[]>;
}
