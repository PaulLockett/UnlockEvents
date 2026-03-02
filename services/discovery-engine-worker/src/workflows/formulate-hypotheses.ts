import { proxyActivities } from "@temporalio/workflow";
import type { AIGatewayActivities, Hypothesis } from "@unlock-events/temporal-interfaces";

const aiGateway = proxyActivities<AIGatewayActivities>({
  taskQueue: "ai-gateway",
  startToCloseTimeout: "120s",
});

/**
 * E1 child workflow: Formulate navigation hypotheses for a new source.
 * Calls U2 (AI Gateway) for LLM-based strategy generation.
 */
export async function formulateHypotheses(
  sourceId: string,
  url: string,
  hints?: string[]
): Promise<Hypothesis[]> {
  const llmResult = await aiGateway.chat({
    messages: [
      {
        role: "system",
        content:
          "You are a web navigation strategist. Generate hypotheses for discovering events on a website.",
      },
      {
        role: "user",
        content: JSON.stringify({
          sourceId,
          url,
          hints: hints ?? [],
        }),
      },
    ],
    model: "balanced",
  });

  // Stub: return a basic hypothesis from the LLM reasoning
  const hypothesis: Hypothesis = {
    id: `hyp-${sourceId}-${Date.now()}`,
    strategy: "direct-navigation",
    initialProgram: {
      steps: [
        {
          action: "navigate",
          value: url,
          description: `Navigate to ${url}`,
        },
      ],
      phase: "exploration",
      confidence: 0.3,
      version: 1,
    },
    rationale: llmResult.content,
  };

  return [hypothesis];
}
