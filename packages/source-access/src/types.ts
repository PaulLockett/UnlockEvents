/**
 * R1: Source Access — Public Interface
 *
 * Encapsulates source lifecycle — how sources (environments) enter,
 * operate in, and exit the discovery rotation.
 * Technology-agnostic interface. No storage types leak through this boundary.
 */

export type SourceStatus = "pending" | "active" | "inactive" | "retired";

export interface SourceRecord {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  status: SourceStatus;
  category: string;
  platform: string | null;
  feedUrl: string | null;
  failureCount: number;
  lastNavigatedAt: string | null;
  nextNavigateAt: string | null;
  createdAt: string;
}

export interface NavigationBrief {
  sourceId: string;
  name: string;
  url: string;
  feedUrl: string | null;
  category: string;
  crawlConfig: Record<string, unknown>;
  lastNavigatedAt: string | null;
  failureCount: number;
}

export interface SourceAccess {
  /** A new event environment enters the system for discovery. Returns source key (UUID). */
  onboardSource(
    tenantId: string,
    name: string,
    url: string,
    options?: { category?: string; platform?: string; feedUrl?: string }
  ): Promise<string>;

  /** Source goes live for active discovery cycles. */
  commissionSource(tenantId: string, sourceId: string): Promise<void>;

  /** Source taken offline temporarily. */
  decommissionSource(tenantId: string, sourceId: string): Promise<void>;

  /** Permanently end source's participation. */
  retireSource(tenantId: string, sourceId: string): Promise<void>;

  /** Navigation attempt failed, advance failure tracking. */
  reportNavigationFailure(tenantId: string, sourceId: string): Promise<void>;

  /** Navigation cycle completed, advance source lifecycle. */
  acknowledgeNavigationSuccess(tenantId: string, sourceId: string): Promise<void>;

  /** Identify which sources are next in the discovery rotation. */
  nominateForNavigation(tenantId: string, limit: number): Promise<SourceRecord[]>;

  /** Provide everything needed to execute a navigation cycle. */
  resolveNavigationBrief(tenantId: string, sourceId: string): Promise<NavigationBrief>;
}

export interface SourceAccessConfig {
  connectionString?: string;
}
