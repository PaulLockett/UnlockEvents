import { proxyActivities } from "@temporalio/workflow";
import type {
  ExperimentAccessActivities,
  AIGatewayActivities,
  AnalysisContext,
  AnalysisVerdict,
} from "@unlock-events/temporal-interfaces";

const experimentAccess = proxyActivities<ExperimentAccessActivities>({
  taskQueue: "experiment-access",
  startToCloseTimeout: "60s",
});

const aiGateway = proxyActivities<AIGatewayActivities>({
  taskQueue: "ai-gateway",
  startToCloseTimeout: "120s",
});

/**
 * E1 child workflow: Synthesize a verdict for an analysis request.
 * Calls R5 (Experiment Access) and U2 (AI Gateway) activities.
 */
export async function synthesizeVerdict(context: AnalysisContext): Promise<AnalysisVerdict> {
  // Fetch full analysis context from R5
  const analysisData = await experimentAccess.prepareAnalysisContext(
    context.sourceId,
    context.experimentKey
  );

  // Use AI Gateway for LLM reasoning about the observations
  const llmResult = await aiGateway.chat({
    messages: [
      {
        role: "system",
        content:
          "You are a web discovery analyst. Analyze the observations and determine the next action for the discovery cycle.",
      },
      {
        role: "user",
        content: JSON.stringify({
          phase: context.currentPhase,
          program: context.currentProgram,
          observations: context.observations,
          analysisData,
        }),
      },
    ],
    model: "balanced",
  });

  // Parse verdict from LLM response
  const verdict: AnalysisVerdict = {
    action: "continue",
    updatedProgram: context.currentProgram ?? {
      steps: [],
      phase: context.currentPhase,
      confidence: 0,
      version: 1,
    },
    reasoning: llmResult.content,
    confidence: 0.5,
  };

  // Write verdict back to R5
  await experimentAccess.provideVerdict(context.sourceId, context.experimentKey, verdict);

  return verdict;
}
