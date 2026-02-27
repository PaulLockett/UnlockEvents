import { describe, it, expect } from "vitest";
import { createDedupEngine } from "../src/dedup-engine.js";

const TENANT = "t-test";

describe("DedupEngine", () => {
  const engine = createDedupEngine({});

  describe("surfaceDuplicateCandidates", () => {
    it("returns empty array from stub", async () => {
      const candidates = await engine.surfaceDuplicateCandidates(TENANT, "evt-1");
      expect(candidates).toEqual([]);
    });
  });

  describe("adjudicatePair", () => {
    it("returns a DedupJudgment", async () => {
      const judgment = await engine.adjudicatePair(TENANT, "evt-1", "evt-2");
      expect(judgment.eventA).toBe("evt-1");
      expect(judgment.eventB).toBe("evt-2");
      expect(judgment).toHaveProperty("verdict");
      expect(judgment).toHaveProperty("confidence");
      expect(judgment).toHaveProperty("reasoning");
      expect(["duplicate", "distinct", "uncertain"]).toContain(judgment.verdict);
    });
  });
});
