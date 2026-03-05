import { proxyActivities, executeChild } from "@temporalio/workflow";
import type {
  SourceAccessActivities,
  CaptureAccessActivities,
  EnvironmentNavigatorActivities,
  ExperimentAccessActivities,
  SchedulerActivities,
  DiscoveryEngineWorkflows,
  ExtractionEngineWorkflows,
  DiscoveryRequest,
  DiscoveryResult,
} from "@unlock-events/temporal-interfaces";

// ─── Activity Proxies (RA + Utilities) ──────────────────────────────────────

const sourceAccess = proxyActivities<SourceAccessActivities>({
  taskQueue: "source-access",
  startToCloseTimeout: "30s",
});

const captureAccess = proxyActivities<CaptureAccessActivities>({
  taskQueue: "capture-access",
  startToCloseTimeout: "60s",
});

const environmentNavigator = proxyActivities<EnvironmentNavigatorActivities>({
  taskQueue: "environment-navigator",
  startToCloseTimeout: "120s",
});

const experimentAccess = proxyActivities<ExperimentAccessActivities>({
  taskQueue: "experiment-access",
  startToCloseTimeout: "60s",
});

const scheduler = proxyActivities<SchedulerActivities>({
  taskQueue: "scheduler",
  startToCloseTimeout: "30s",
});

// ─── Type aliases for child workflows ───────────────────────────────────────
// These are used via executeChild() string-based invocation.
void ({} as DiscoveryEngineWorkflows);
void ({} as ExtractionEngineWorkflows);

/**
 * M1 top-level workflow: Orchestrate a full discovery cycle for a source.
 *
 * Flow: BeginExperiment → Navigate → Capture → E1 (synthesize) → E2 (extract)
 *       → AdvancePhase → RecordOutcome → Complete
 */
export async function orchestrateDiscoveryCycle(
  request: DiscoveryRequest
): Promise<DiscoveryResult> {
  const startedAt = new Date().toISOString();
  const captureIds: string[] = [];

  // 1. Resolve navigation brief from R1
  const brief = await sourceAccess.resolveNavigationBrief(request.tenantId, request.sourceId);

  // 2. Begin experiment in R5
  const expKey =
    request.experimentKey ??
    (await experimentAccess.beginExperiment(request.tenantId, request.sourceId, {
      name: `discovery-${request.sourceId}`,
      budget: {
        strategy: "soft_limit",
        allocations: [
          { platform: "openrouter", dimension: "tokens", total: 100000, unit: "tokens" },
        ],
      },
    }));

  // 3. Enter environment via R4
  const session = await environmentNavigator.enterEnvironment(request.sourceId);

  try {
    // 4. Navigate to source URL
    const observation = await environmentNavigator.traverseTo(session.sessionId, brief.url);

    // 5. Preserve capture via R3
    const captureId = await captureAccess.preserveCapture(request.tenantId, {
      sourceId: request.sourceId,
      sessionId: session.sessionId,
      html: observation.html,
      screenshotUrl: null,
      networkLogUrl: null,
      videoUrl: null,
      metadata: observation.metadata,
      capturedAt: observation.timestamp,
    });
    captureIds.push(captureId);

    // 6. Submit for analysis and invoke E1 via child workflow
    await experimentAccess.submitForAnalysis(request.tenantId, expKey, {
      captureId,
      observation,
    });

    const verdict = await executeChild("synthesizeVerdict", {
      taskQueue: "discovery-engine",
      args: [
        {
          experimentKey: expKey,
          sourceId: request.sourceId,
          currentPhase: "exploration",
          currentProgram: null,
          observations: { captureId },
        },
      ],
    });

    // 7. Accept verdict from R5
    await experimentAccess.acceptVerdict(request.tenantId, expKey);

    // 8. Extract events via E2 child workflow
    const extraction = await executeChild("extractEvents", {
      taskQueue: "extraction-engine",
      args: [request.tenantId, captureId],
    });

    // 9. Record outcome
    await experimentAccess.recordOutcome(request.tenantId, expKey, {
      verdict,
      extraction,
    });

    // 10. Acknowledge navigation success on R1
    await sourceAccess.acknowledgeNavigationSuccess(request.tenantId, request.sourceId);

    // 11. Schedule next navigation via U3
    await scheduler.scheduleNextNavigation(request.sourceId, "daily", new Date().toISOString());

    return {
      sourceId: request.sourceId,
      status: "completed",
      eventsIngested: (extraction as { events?: unknown[] })?.events?.length ?? 0,
      captureIds,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Report failure on R1
    await sourceAccess.reportNavigationFailure(request.tenantId, request.sourceId);

    return {
      sourceId: request.sourceId,
      status: "failed",
      eventsIngested: 0,
      captureIds,
      startedAt,
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    // Always exit environment
    await environmentNavigator.exitEnvironment(session.sessionId);
  }
}
