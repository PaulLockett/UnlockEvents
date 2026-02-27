import type { SourceAccess, SourceAccessConfig, SourceRecord, NavigationBrief } from "./types.js";

export function createSourceAccess(config: SourceAccessConfig = {}): SourceAccess {
  const _connectionString = config.connectionString ?? process.env["DATABASE_URL"];

  return {
    async onboardSource(tenantId: string, name: string, url: string): Promise<string> {
      console.log(`[R1:stub] onboardSource tenant=${tenantId} name=${name} url=${url}`);
      return crypto.randomUUID();
    },

    async commissionSource(tenantId: string, sourceId: string): Promise<void> {
      console.log(`[R1:stub] commissionSource tenant=${tenantId} source=${sourceId}`);
    },

    async decommissionSource(tenantId: string, sourceId: string): Promise<void> {
      console.log(`[R1:stub] decommissionSource tenant=${tenantId} source=${sourceId}`);
    },

    async retireSource(tenantId: string, sourceId: string): Promise<void> {
      console.log(`[R1:stub] retireSource tenant=${tenantId} source=${sourceId}`);
    },

    async reportNavigationFailure(tenantId: string, sourceId: string): Promise<void> {
      console.log(`[R1:stub] reportNavigationFailure tenant=${tenantId} source=${sourceId}`);
    },

    async acknowledgeNavigationSuccess(tenantId: string, sourceId: string): Promise<void> {
      console.log(`[R1:stub] acknowledgeNavigationSuccess tenant=${tenantId} source=${sourceId}`);
    },

    async nominateForNavigation(tenantId: string, limit: number): Promise<SourceRecord[]> {
      console.log(`[R1:stub] nominateForNavigation tenant=${tenantId} limit=${limit}`);
      return [];
    },

    async resolveNavigationBrief(tenantId: string, sourceId: string): Promise<NavigationBrief> {
      console.log(`[R1:stub] resolveNavigationBrief tenant=${tenantId} source=${sourceId}`);
      return {
        sourceId,
        name: "stub-source",
        url: "https://example.com",
        lastNavigatedAt: null,
        failureCount: 0,
      };
    },
  };
}
