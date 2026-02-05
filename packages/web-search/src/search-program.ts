import { AxGen, AxSignature } from "@unlock-events/ai-gateway";
import type {
  AxAIService,
  ExaClient,
  SearchProgram,
  SearchProgramConfig,
  WebSearchResult,
} from "./types.js";

const DEFAULT_MAX_QUERIES = 3;

interface DecomposeInput {
  [key: string]: string | string[] | number | boolean | object | null | undefined;
  searchRequest: string;
}

interface DecomposeOutput {
  [key: string]: string | string[] | number | boolean | object | null | undefined;
  queries: string[];
}

/** Creates a search program that decomposes NL queries and executes them via Exa */
export function createSearchProgram(
  aiService: AxAIService,
  exaClient: ExaClient,
  config?: SearchProgramConfig
): SearchProgram {
  const maxQueries = config?.maxQueries ?? DEFAULT_MAX_QUERIES;

  const sig = new AxSignature(
    `searchRequest:string -> queries:string[] "2 to ${maxQueries} specific search queries"`
  );
  sig.setDescription("Decompose a search request into effective web search queries");

  const queryDecomposer = new AxGen<DecomposeInput, DecomposeOutput>(sig);

  async function execute(query: string): Promise<WebSearchResult[]> {
    const result = await queryDecomposer.forward(aiService, {
      searchRequest: query,
    });

    const queries: string[] = result.queries ?? [];

    if (queries.length === 0) {
      return [];
    }

    // Execute all sub-queries in parallel
    const resultArrays = await Promise.all(queries.map((q) => exaClient.search(q)));

    return resultArrays.flat();
  }

  return { execute };
}
