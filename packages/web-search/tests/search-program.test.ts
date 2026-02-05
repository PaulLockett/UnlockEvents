import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSearchProgram } from "../src/search-program.js";
import type { ExaClient, WebSearchResult, AxAIService } from "../src/types.js";

const mockForward = vi.fn();

// Mock AxGen and AxSignature from ai-gateway
vi.mock("@unlock-events/ai-gateway", () => {
  return {
    AxGen: vi.fn().mockImplementation(() => ({
      forward: mockForward,
    })),
    AxSignature: vi.fn().mockImplementation(() => ({
      setDescription: vi.fn(),
    })),
  };
});

describe("createSearchProgram", () => {
  let mockAiService: AxAIService;
  let mockExaClient: ExaClient;

  const makeResult = (url: string, query: string): WebSearchResult => ({
    url,
    title: `Title for ${url}`,
    sourceQuery: query,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockAiService = {} as AxAIService;

    mockExaClient = {
      search: vi
        .fn()
        .mockImplementation((query: string) =>
          Promise.resolve([makeResult(`https://example.com/${query}`, query)])
        ),
    };
  });

  it("decomposes a query and executes sub-queries", async () => {
    mockForward.mockResolvedValue({
      queries: ["query A", "query B"],
    });

    const program = createSearchProgram(mockAiService, mockExaClient);
    const results = await program.execute("find events in Alabama");

    expect(mockExaClient.search).toHaveBeenCalledTimes(2);
    expect(mockExaClient.search).toHaveBeenCalledWith("query A");
    expect(mockExaClient.search).toHaveBeenCalledWith("query B");
    expect(results).toHaveLength(2);
  });

  it("passes aiService to the Ax program", async () => {
    mockForward.mockResolvedValue({
      queries: ["q1"],
    });

    const program = createSearchProgram(mockAiService, mockExaClient);
    await program.execute("test");

    expect(mockForward).toHaveBeenCalledWith(
      mockAiService,
      expect.objectContaining({ searchRequest: "test" })
    );
  });

  it("flattens results from multiple sub-queries", async () => {
    vi.mocked(mockExaClient.search).mockImplementation((query: string) =>
      Promise.resolve([
        makeResult(`https://a.com/${query}`, query),
        makeResult(`https://b.com/${query}`, query),
      ])
    );

    mockForward.mockResolvedValue({
      queries: ["q1", "q2", "q3"],
    });

    const program = createSearchProgram(mockAiService, mockExaClient);
    const results = await program.execute("events");

    expect(results).toHaveLength(6); // 2 results × 3 queries
  });

  it("executes sub-queries in parallel", async () => {
    const callOrder: string[] = [];

    vi.mocked(mockExaClient.search).mockImplementation(async (query: string) => {
      callOrder.push(`start:${query}`);
      // All should start before any completes (parallel execution)
      await Promise.resolve();
      callOrder.push(`end:${query}`);
      return [makeResult(`https://example.com/${query}`, query)];
    });

    mockForward.mockResolvedValue({
      queries: ["q1", "q2"],
    });

    const program = createSearchProgram(mockAiService, mockExaClient);
    await program.execute("test");

    // Both searches should start before either ends (parallel)
    expect(callOrder[0]).toBe("start:q1");
    expect(callOrder[1]).toBe("start:q2");
  });

  it("respects maxQueries configuration", async () => {
    mockForward.mockResolvedValue({
      queries: ["q1"],
    });

    const program = createSearchProgram(mockAiService, mockExaClient, {
      maxQueries: 5,
    });
    await program.execute("test");

    expect(mockForward).toHaveBeenCalled();
  });

  it("handles empty queries array from LLM", async () => {
    mockForward.mockResolvedValue({
      queries: [],
    });

    const program = createSearchProgram(mockAiService, mockExaClient);
    const results = await program.execute("test");

    expect(results).toEqual([]);
    expect(mockExaClient.search).not.toHaveBeenCalled();
  });
});
