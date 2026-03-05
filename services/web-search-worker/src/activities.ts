import { createWebSearch } from "@unlock-events/web-search";
import { createAIGateway } from "@unlock-events/ai-gateway";
import type { WebSearch, WebSearchResult } from "@unlock-events/web-search";

let instance: WebSearch | null = null;

function getInstance(): WebSearch {
  if (!instance) {
    const gateway = createAIGateway({
      apiKey: process.env["OPENROUTER_API_KEY"] || "",
    });
    instance = createWebSearch({
      aiService: gateway.ai,
      exa: {
        apiKey: process.env["EXA_API_KEY"],
      },
    });
  }
  return instance;
}

export async function search(query: string): Promise<WebSearchResult[]> {
  return getInstance().search(query);
}
