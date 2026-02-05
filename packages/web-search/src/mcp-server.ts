#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createAIGateway } from "@unlock-events/ai-gateway";
import { createWebSearch } from "./web-search.js";
import type { WebSearch } from "./types.js";

/** Handles a web_search tool call — extracted for testability */
export async function handleWebSearch(
  webSearch: WebSearch,
  query: string
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const results = await webSearch.search(query);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}

async function main(): Promise<void> {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY environment variable is required");
    process.exit(1);
  }

  const gateway = createAIGateway({
    apiKey,
    defaultTier: "fast",
  });

  const webSearch = createWebSearch({
    aiService: gateway.ai,
  });

  const server = new McpServer(
    { name: "unlock-web-search", version: "0.0.1" },
    {
      capabilities: { tools: {} },
    }
  );

  server.registerTool(
    "web_search",
    {
      description:
        "Search the web for information about professional and business events in Alabama. " +
        "Takes a natural language query, decomposes it into optimized search queries, " +
        "and returns URLs with metadata.",
      inputSchema: {
        query: z.string().describe("Natural language search request"),
      },
    },
    async ({ query }) => {
      return handleWebSearch(webSearch, query);
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("unlock-web-search MCP server running on stdio");
}

// Only run main when executed directly (not imported for testing)
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("mcp-server.js") || process.argv[1].endsWith("mcp-server.ts"));

if (isDirectExecution) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
