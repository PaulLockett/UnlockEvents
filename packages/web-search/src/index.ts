// Public API
export { createWebSearch } from "./web-search.js";

// Types
export type {
  WebSearch,
  WebSearchConfig,
  WebSearchResult,
  ExaClient,
  ExaClientConfig,
  SearchProgram,
  SearchProgramConfig,
  RateLimiter,
  RateLimiterConfig,
} from "./types.js";

// Building blocks (for advanced usage)
export { createExaClient } from "./exa-client.js";
export { createSearchProgram } from "./search-program.js";
export { createRateLimiter } from "./rate-limiter.js";
