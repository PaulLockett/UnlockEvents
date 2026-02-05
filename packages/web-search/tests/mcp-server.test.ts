import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleWebSearch } from "../src/mcp-server.js";
import type { WebSearch, WebSearchResult } from "../src/types.js";

describe("handleWebSearch", () => {
  let mockWebSearch: WebSearch;

  const sampleResults: WebSearchResult[] = [
    {
      url: "https://example.com/event1",
      title: "Alabama Tech Conference",
      publishedDate: "2024-06-15",
      author: "Event Org",
      sourceQuery: "tech conferences Alabama",
    },
    {
      url: "https://example.com/event2",
      title: "Business Summit",
      sourceQuery: "business events Alabama",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSearch = {
      search: vi.fn().mockResolvedValue(sampleResults),
    };
  });

  it("returns results as MCP text content", async () => {
    const response = await handleWebSearch(mockWebSearch, "events in Alabama");

    expect(response.content).toHaveLength(1);
    expect(response.content[0]!.type).toBe("text");

    const parsed = JSON.parse(response.content[0]!.text);
    expect(parsed).toEqual(sampleResults);
  });

  it("passes query to web search", async () => {
    await handleWebSearch(mockWebSearch, "tech events");

    expect(mockWebSearch.search).toHaveBeenCalledWith("tech events");
  });

  it("returns error content on failure", async () => {
    vi.mocked(mockWebSearch.search).mockRejectedValue(new Error("Search failed"));

    const response = await handleWebSearch(mockWebSearch, "test");

    expect(response.isError).toBe(true);
    expect(response.content[0]!.text).toContain("Search failed");
  });

  it("serializes results as formatted JSON", async () => {
    const response = await handleWebSearch(mockWebSearch, "test");

    const text = response.content[0]!.text;
    // Should be pretty-printed JSON
    expect(text).toContain("\n");
    expect(JSON.parse(text)).toEqual(sampleResults);
  });
});
