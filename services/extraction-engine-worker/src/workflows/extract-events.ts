import { proxyActivities } from "@temporalio/workflow";
import type {
  CaptureAccessActivities,
  AIGatewayActivities,
  ExtractionResult,
} from "@unlock-events/temporal-interfaces";

const captureAccess = proxyActivities<CaptureAccessActivities>({
  taskQueue: "capture-access",
  startToCloseTimeout: "60s",
});

const aiGateway = proxyActivities<AIGatewayActivities>({
  taskQueue: "ai-gateway",
  startToCloseTimeout: "120s",
});

/**
 * E2 child workflow: Extract events from a capture bundle.
 * Calls R3 (Capture Access) and U2 (AI Gateway) activities.
 */
export async function extractEvents(
  tenantId: string,
  captureId: string
): Promise<ExtractionResult> {
  // Recall the capture bundle from R3
  const bundle = await captureAccess.recallCapture(tenantId, captureId);

  // Use AI Gateway for LLM-based event extraction
  const llmResult = await aiGateway.chat({
    messages: [
      {
        role: "system",
        content:
          "You are an event extraction specialist. Extract structured event data from the provided HTML content.",
      },
      {
        role: "user",
        content: JSON.stringify({
          html: bundle.html,
          metadata: bundle.metadata,
        }),
      },
    ],
    model: "balanced",
  });

  // Confirm extraction on the capture
  await captureAccess.confirmExtraction(tenantId, captureId);

  return {
    captureId,
    events: [],
    extractedAt: new Date().toISOString(),
    warnings: [`LLM extraction stub — response length: ${llmResult.content.length}`],
  };
}
