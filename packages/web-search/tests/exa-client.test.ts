import { describe, it, expect, vi, beforeEach } from "vitest";
import { createExaClient } from "../src/exa-client.js";
import type { RateLimiter } from "../src/types.js";

// Mock exa-js
vi.mock("exa-js", () => {
  return {
    Exa: vi.fn().mockImplementation(() => ({
      search: vi.fn(),
    })),
  };
});

import { Exa } from "exa-js";

describe("createExaClient", () => {
  let mockRateLimiter: RateLimiter;
  let mockExaSearch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimiter = { acquire: vi.fn().mockResolvedValue(undefined) };

    // Get reference to the mock search function
    mockExaSearch = vi.fn().mockResolvedValue({
      results: [
        {
          url: "https://example.com/1",
          title: "Result 1",
          publishedDate: "2024-01-15",
          author: "Author 1",
          id: "abc",
          score: 0.95,
        },
        {
          url: "https://example.com/2",
          title: null,
          id: "def",
          score: 0.8,
        },
      ],
    });

    vi.mocked(Exa).mockImplementation(
      () =>
        ({
          search: mockExaSearch,
        }) as unknown as InstanceType<typeof Exa>
    );
  });

  it("maps Exa results to WebSearchResult format", async () => {
    const client = createExaClient({
      apiKey: "test-key",
      rateLimiter: mockRateLimiter,
    });

    const results = await client.search("test query");

    expect(results).toEqual([
      {
        url: "https://example.com/1",
        title: "Result 1",
        publishedDate: "2024-01-15",
        author: "Author 1",
        sourceQuery: "test query",
      },
      {
        url: "https://example.com/2",
        title: "",
        publishedDate: undefined,
        author: undefined,
        sourceQuery: "test query",
      },
    ]);
  });

  it("calls rateLimiter.acquire before each search", async () => {
    const client = createExaClient({
      apiKey: "test-key",
      rateLimiter: mockRateLimiter,
    });

    await client.search("query 1");
    await client.search("query 2");

    expect(mockRateLimiter.acquire).toHaveBeenCalledTimes(2);
  });

  it("passes numResults and searchType to Exa", async () => {
    const client = createExaClient({
      apiKey: "test-key",
      rateLimiter: mockRateLimiter,
      numResults: 5,
      searchType: "neural",
    });

    await client.search("test query");

    expect(mockExaSearch).toHaveBeenCalledWith("test query", {
      numResults: 5,
      type: "neural",
      contents: false,
    });
  });

  it("uses default numResults and searchType when not configured", async () => {
    const client = createExaClient({
      apiKey: "test-key",
      rateLimiter: mockRateLimiter,
    });

    await client.search("test query");

    expect(mockExaSearch).toHaveBeenCalledWith("test query", {
      numResults: 10,
      type: "auto",
      contents: false,
    });
  });

  it("passes API key to Exa constructor", () => {
    createExaClient({
      apiKey: "my-api-key",
      rateLimiter: mockRateLimiter,
    });

    expect(Exa).toHaveBeenCalledWith("my-api-key");
  });

  it("propagates Exa errors", async () => {
    mockExaSearch.mockRejectedValueOnce(new Error("Exa API error"));

    const client = createExaClient({
      apiKey: "test-key",
      rateLimiter: mockRateLimiter,
    });

    await expect(client.search("test")).rejects.toThrow("Exa API error");
  });
});
