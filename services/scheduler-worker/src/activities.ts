import { createScheduler } from "@unlock-events/scheduler";
import type {
  Scheduler,
  CadenceFrequency,
  SourceSchedule,
  NavigationRosterEntry,
  CadenceAdjustment,
} from "@unlock-events/scheduler";

let instance: Scheduler | null = null;

function getInstance(): Scheduler {
  if (!instance) {
    instance = createScheduler({});
  }
  return instance;
}

export async function scheduleNextNavigation(
  sourceId: string,
  frequency: CadenceFrequency,
  lastNavigatedAt: string | null
): Promise<SourceSchedule> {
  return getInstance().scheduleNextNavigation(sourceId, frequency, lastNavigatedAt);
}

export async function assembleNavigationRoster(
  sourceIds: string[],
  asOf?: string
): Promise<NavigationRosterEntry[]> {
  return getInstance().assembleNavigationRoster(sourceIds, asOf);
}

export async function adjustCadence(
  sourceId: string,
  newFrequency: CadenceFrequency,
  reason: string
): Promise<CadenceAdjustment> {
  return getInstance().adjustCadence(sourceId, newFrequency, reason);
}
