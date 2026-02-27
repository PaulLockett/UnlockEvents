import { describe, it, expect } from "vitest";
import { createDiscoveryEngine } from "../src/discovery-engine.js";
import type { AnalysisContext } from "../src/types.js";

describe("DiscoveryEngine", () => {
  const engine = createDiscoveryEngine({});

  describe("synthesizeVerdict", () => {
    it("returns an AnalysisVerdict", async () => {
      const context: AnalysisContext = {
        experimentKey: "exp-1",
        sourceId: "src-1",
        currentPhase: "exploration",
        currentProgram: null,
        observations: { html: "<div>test</div>" },
      };
      const verdict = await engine.synthesizeVerdict(context);
      expect(verdict).toHaveProperty("action");
      expect(verdict).toHaveProperty("updatedProgram");
      expect(verdict).toHaveProperty("reasoning");
      expect(verdict).toHaveProperty("confidence");
      expect(["continue", "advance_phase", "restart", "complete"]).toContain(verdict.action);
    });

    it("preserves current program when available", async () => {
      const program = {
        steps: [{ action: "click", selector: "#btn", description: "Click button" }],
        phase: "refinement" as const,
        confidence: 0.8,
        version: 3,
      };
      const context: AnalysisContext = {
        experimentKey: "exp-1",
        sourceId: "src-1",
        currentPhase: "refinement",
        currentProgram: program,
        observations: {},
      };
      const verdict = await engine.synthesizeVerdict(context);
      expect(verdict.updatedProgram).toEqual(program);
    });
  });

  describe("formulateHypotheses", () => {
    it("returns at least one Hypothesis", async () => {
      const hypotheses = await engine.formulateHypotheses("src-1", "https://example.com");
      expect(hypotheses.length).toBeGreaterThanOrEqual(1);
      expect(hypotheses[0]).toHaveProperty("id");
      expect(hypotheses[0]).toHaveProperty("strategy");
      expect(hypotheses[0]).toHaveProperty("initialProgram");
      expect(hypotheses[0]).toHaveProperty("rationale");
    });

    it("passes hints through", async () => {
      const hypotheses = await engine.formulateHypotheses("src-1", "https://example.com", [
        "has calendar widget",
      ]);
      expect(hypotheses.length).toBeGreaterThanOrEqual(1);
    });
  });
});
