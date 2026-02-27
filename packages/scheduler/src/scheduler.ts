import type {
  Scheduler,
  SchedulerConfig,
  SourceSchedule,
  NavigationRosterEntry,
  CadenceAdjustment,
  CadenceFrequency,
} from "./types.js";

/** Millisecond intervals for each cadence frequency. */
const FREQUENCY_INTERVALS: Record<CadenceFrequency, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  custom: 0,
};

export function createScheduler(config: SchedulerConfig = {}): Scheduler {
  const defaultFrequency = config.defaultFrequency ?? "daily";
  const customIntervalMs = config.customIntervalMs ?? FREQUENCY_INTERVALS.daily;

  const schedules = new Map<string, SourceSchedule>();

  function getIntervalMs(frequency: CadenceFrequency): number {
    if (frequency === "custom") return customIntervalMs;
    return FREQUENCY_INTERVALS[frequency];
  }

  function computeNextNavigation(
    frequency: CadenceFrequency,
    lastNavigatedAt: string | null
  ): string {
    const intervalMs = getIntervalMs(frequency);
    if (!lastNavigatedAt) {
      return new Date().toISOString();
    }
    const lastTime = new Date(lastNavigatedAt).getTime();
    return new Date(lastTime + intervalMs).toISOString();
  }

  return {
    async scheduleNextNavigation(
      sourceId: string,
      frequency: CadenceFrequency,
      lastNavigatedAt: string | null
    ): Promise<SourceSchedule> {
      const nextNavigationAt = computeNextNavigation(frequency, lastNavigatedAt);
      const schedule: SourceSchedule = {
        sourceId,
        frequency,
        nextNavigationAt,
        lastNavigatedAt,
      };
      schedules.set(sourceId, schedule);
      return schedule;
    },

    async assembleNavigationRoster(
      sourceIds: string[],
      asOf?: string
    ): Promise<NavigationRosterEntry[]> {
      const cutoff = new Date(asOf ?? new Date().toISOString()).getTime();
      const due: NavigationRosterEntry[] = [];

      for (const sourceId of sourceIds) {
        const schedule = schedules.get(sourceId);
        if (!schedule) continue;

        const nextTime = new Date(schedule.nextNavigationAt).getTime();
        if (nextTime <= cutoff) {
          const overdueMs = cutoff - nextTime;
          const intervalMs = getIntervalMs(schedule.frequency);
          const priority = intervalMs > 0 ? overdueMs / intervalMs : 1;

          due.push({
            sourceId,
            scheduledAt: schedule.nextNavigationAt,
            priority: Math.round(priority * 100) / 100,
          });
        }
      }

      due.sort((a, b) => b.priority - a.priority);
      return due;
    },

    async adjustCadence(
      sourceId: string,
      newFrequency: CadenceFrequency,
      reason: string
    ): Promise<CadenceAdjustment> {
      const existing = schedules.get(sourceId);
      const previousFrequency = existing?.frequency ?? defaultFrequency;
      const lastNavigatedAt = existing?.lastNavigatedAt ?? null;
      const nextNavigationAt = computeNextNavigation(newFrequency, lastNavigatedAt);

      if (existing) {
        schedules.set(sourceId, {
          ...existing,
          frequency: newFrequency,
          nextNavigationAt,
        });
      }

      return {
        sourceId,
        previousFrequency,
        newFrequency,
        reason,
        nextNavigationAt,
      };
    },
  };
}
