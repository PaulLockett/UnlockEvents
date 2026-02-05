import { createExaClient } from "./exa-client.js";
import { createSearchProgram } from "./search-program.js";
import type { WebSearch, WebSearchConfig } from "./types.js";

/** Creates a web search instance that uses AI to decompose queries and Exa to execute them */
export function createWebSearch(config: WebSearchConfig): WebSearch {
  const exaClient = createExaClient(config.exa);
  const searchProgram = createSearchProgram(config.aiService, exaClient, config.searchProgram);

  return {
    search: (query: string) => searchProgram.execute(query),
  };
}
