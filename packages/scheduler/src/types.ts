/**
 * U3: Scheduler — Public Interface
 *
 * Encapsulates navigation cadence logic — a cross-cutting utility determining
 * when each source should next be navigated.
 * Does NOT call Resource Access directly (M1 provides source data).
 * Technology-agnostic interface.
 */

export type CadenceFrequency = "hourly" | "daily" | "weekly" | "monthly" | "custom";

export interface SourceSchedule {
  sourceId: string;
  frequency: CadenceFrequency;
  nextNavigationAt: string;
  lastNavigatedAt: string | null;
}

export interface NavigationRosterEntry {
  sourceId: string;
  scheduledAt: string;
  priority: number;
}

export interface CadenceAdjustment {
  sourceId: string;
  previousFrequency: CadenceFrequency;
  newFrequency: CadenceFrequency;
  reason: string;
  nextNavigationAt: string;
}

export interface Scheduler {
  /** Determine and register a source's next navigation time. */
  scheduleNextNavigation(
    sourceId: string,
    frequency: CadenceFrequency,
    lastNavigatedAt: string | null
  ): Promise<SourceSchedule>;

  /** Produce the list of sources due for navigation now. */
  assembleNavigationRoster(sourceIds: string[], asOf?: string): Promise<NavigationRosterEntry[]>;

  /** Change navigation frequency based on observed patterns. Returns the adjustment record. */
  adjustCadence(
    sourceId: string,
    newFrequency: CadenceFrequency,
    reason: string
  ): Promise<CadenceAdjustment>;
}

export interface SchedulerConfig {
  /** Default frequency when none is specified. Defaults to "daily". */
  defaultFrequency?: CadenceFrequency;
  /** Interval in milliseconds for "custom" frequency. Defaults to daily (86400000). */
  customIntervalMs?: number;
}
