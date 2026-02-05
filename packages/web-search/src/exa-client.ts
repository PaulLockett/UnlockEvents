import { Exa } from "exa-js";
import { createRateLimiter } from "./rate-limiter.js";
import type { ExaClient, ExaClientConfig, WebSearchResult } from "./types.js";

const DEFAULT_NUM_RESULTS = 10;
const DEFAULT_SEARCH_TYPE = "auto" as const;

/** Creates an Exa search client with rate limiting */
export function createExaClient(config?: ExaClientConfig): ExaClient {
  const apiKey = config?.apiKey ?? process.env["EXA_API_KEY"] ?? "";
  const rateLimiter = config?.rateLimiter ?? createRateLimiter();
  const numResults = config?.numResults ?? DEFAULT_NUM_RESULTS;
  const searchType = config?.searchType ?? DEFAULT_SEARCH_TYPE;

  const exa = new Exa(apiKey);

  async function search(query: string): Promise<WebSearchResult[]> {
    await rateLimiter.acquire();

    const response = await exa.search(query, {
      numResults,
      type: searchType,
      contents: false,
    });

    return response.results.map((result) => ({
      url: result.url,
      title: result.title ?? "",
      publishedDate: result.publishedDate ?? undefined,
      author: result.author ?? undefined,
      sourceQuery: query,
    }));
  }

  return { search };
}
