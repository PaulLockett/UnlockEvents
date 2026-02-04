import { describe, it, expect } from "vitest";
import { createMemory } from "../src/index.js";
import type { Learning, RecallResult, MemoryConfig, Memory } from "../src/index.js";

describe("Memory interface contract", () => {
  it("createMemory returns an object with recall and remember methods", () => {
    const memory = createMemory({ apiKey: "test-key" });
    expect(memory).toBeDefined();
    expect(typeof memory.recall).toBe("function");
    expect(typeof memory.remember).toBe("function");
  });

  it("createMemory accepts no arguments (uses env var defaults)", () => {
    // Should not throw — missing API key is a runtime error, not construction error
    const memory = createMemory();
    expect(memory).toBeDefined();
  });

  it("createMemory accepts full config", () => {
    const config: MemoryConfig = {
      apiKey: "test-key",
      workspace: "my-workspace",
      environment: "local",
    };
    const memory = createMemory(config);
    expect(memory).toBeDefined();
  });

  it("Learning type requires domain and insight", () => {
    const learning: Learning = {
      domain: "eventbrite.com",
      insight: "Uses infinite scroll pagination",
    };
    expect(learning.domain).toBe("eventbrite.com");
    expect(learning.insight).toBe("Uses infinite scroll pagination");
    expect(learning.context).toBeUndefined();
  });

  it("Learning type allows optional context", () => {
    const learning: Learning = {
      domain: "eventbrite.com",
      insight: "Uses infinite scroll pagination",
      context: "Discovered during experiment #42",
    };
    expect(learning.context).toBe("Discovered during experiment #42");
  });

  it("RecallResult has domain and answers Map", () => {
    const result: RecallResult = {
      domain: "eventbrite.com",
      answers: new Map([["pagination strategy", "Uses infinite scroll"]]),
    };
    expect(result.domain).toBe("eventbrite.com");
    expect(result.answers).toBeInstanceOf(Map);
    expect(result.answers.get("pagination strategy")).toBe("Uses infinite scroll");
  });

  it("Memory interface satisfies recall signature", async () => {
    const memory: Memory = createMemory({ apiKey: "test-key" });
    // Verify return type is Promise
    expect(typeof memory.recall).toBe("function");
    expect(memory.recall.length).toBeGreaterThanOrEqual(2);
  });

  it("Memory interface satisfies remember signature", async () => {
    const memory: Memory = createMemory({ apiKey: "test-key" });
    expect(typeof memory.remember).toBe("function");
    expect(memory.remember.length).toBeGreaterThanOrEqual(1);
  });
});
