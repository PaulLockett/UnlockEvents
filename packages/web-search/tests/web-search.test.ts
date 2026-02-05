import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWebSearch } from "../src/web-search.js";
import type { AxAIService, WebSearchResult } from "../src/types.js";

// Mock sub-modules
vi.mock("../src/exa-client.js", () => ({
  createExaClient: vi.fn().mockReturnValue({
    search: vi.fn(),
  }),
}));

vi.mock("../src/search-program.js", () => ({
  createSearchProgram: vi.fn().mockReturnValue({
    execute: vi.fn(),
  }),
}));

import { createExaClient } from "../src/exa-client.js";
import { createSearchProgram } from "../src/search-program.js";

describe("createWebSearch", () => {
  let mockAiService: AxAIService;

  const sampleResults: WebSearchResult[] = [
    {
      url: "https://example.com",
      title: "Example",
      sourceQuery: "test query",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAiService = {} as AxAIService;

    // Set up mock chain
    const mockExecute = vi.fn().mockResolvedValue(sampleResults);
    vi.mocked(createSearchProgram).mockReturnValue({ execute: mockExecute });
  });

  it("creates an ExaClient with provided config", () => {
    createWebSearch({
      aiService: mockAiService,
      exa: { apiKey: "test-key", numResults: 5 },
    });

    expect(createExaClient).toHaveBeenCalledWith({
      apiKey: "test-key",
      numResults: 5,
    });
  });

  it("creates a SearchProgram with aiService, exaClient, and config", () => {
    const mockExaClient = { search: vi.fn() };
    vi.mocked(createExaClient).mockReturnValue(mockExaClient);

    createWebSearch({
      aiService: mockAiService,
      searchProgram: { maxQueries: 5 },
    });

    expect(createSearchProgram).toHaveBeenCalledWith(mockAiService, mockExaClient, {
      maxQueries: 5,
    });
  });

  it("delegates search() to the search program", async () => {
    const ws = createWebSearch({ aiService: mockAiService });

    const results = await ws.search("find events");

    const mockExecute = vi.mocked(createSearchProgram).mock.results[0]!.value.execute;
    expect(mockExecute).toHaveBeenCalledWith("find events");
    expect(results).toEqual(sampleResults);
  });

  it("propagates errors from search program", async () => {
    const mockExecute = vi.fn().mockRejectedValue(new Error("search failed"));
    vi.mocked(createSearchProgram).mockReturnValue({ execute: mockExecute });

    const ws = createWebSearch({ aiService: mockAiService });

    await expect(ws.search("test")).rejects.toThrow("search failed");
  });

  it("passes undefined exa config when not provided", () => {
    createWebSearch({ aiService: mockAiService });

    expect(createExaClient).toHaveBeenCalledWith(undefined);
  });
});
