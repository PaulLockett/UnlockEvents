import { describe, it, expect } from "vitest";
import { createAIGateway } from "../src/provider.js";
import { ax } from "@ax-llm/ax";

const OPENROUTER_API_KEY = process.env["OPENROUTER_API_KEY"];

describe.skipIf(!OPENROUTER_API_KEY)("Smoke test (real API)", () => {
  it("makes a real API call with a simple signature", { timeout: 30000 }, async () => {
    const gateway = createAIGateway({
      apiKey: OPENROUTER_API_KEY!,
      defaultTier: "fast",
      onUsage: (record) => {
        // Verify the callback fires
        expect(record.model).toBeTruthy();
        expect(record.totalTokens).toBeGreaterThan(0);
      },
    });

    const greet = ax("name:string -> greeting:string");

    const result = await greet.forward(gateway.ai, {
      name: "World",
    });

    expect(result.greeting).toBeTruthy();
    expect(typeof result.greeting).toBe("string");

    // Check usage was tracked
    const usage = gateway.getUsage();
    expect(usage.requestCount).toBeGreaterThanOrEqual(1);
    expect(usage.totalTokens).toBeGreaterThan(0);
  });
});
