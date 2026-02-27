import type {
  Scheduler,
  SchedulerConfig,
  SourceSchedule,
  NavigationRosterEntry,
  CadenceAdjustment,
  CadenceFrequency,
} from "./types.js";

export function createScheduler(config: SchedulerConfig = {}): Scheduler {
  const defaultFrequency = config.defaultFrequency ?? "daily";

  return {
    async scheduleNextNavigation(
      sourceId: string,
      frequency: CadenceFrequency,
      lastNavigatedAt: string | null
    ): Promise<SourceSchedule> {
      console.log(`[U3:stub] scheduleNextNavigation source=${sourceId} freq=${frequency}`);
      return {
        sourceId,
        frequency,
        nextNavigationAt: new Date(Date.now() + 86400000).toISOString(),
        lastNavigatedAt,
      };
    },

    async assembleNavigationRoster(
      sourceIds: string[],
      asOf?: string
    ): Promise<NavigationRosterEntry[]> {
      const timestamp = asOf ?? new Date().toISOString();
      console.log(
        `[U3:stub] assembleNavigationRoster sources=${sourceIds.length} asOf=${timestamp}`
      );
      return [];
    },

    async adjustCadence(
      sourceId: string,
      newFrequency: CadenceFrequency,
      reason: string
    ): Promise<CadenceAdjustment> {
      console.log(`[U3:stub] adjustCadence source=${sourceId} to=${newFrequency} reason=${reason}`);
      return {
        previousFrequency: defaultFrequency,
        newFrequency,
        reason,
      };
    },
  };
}
