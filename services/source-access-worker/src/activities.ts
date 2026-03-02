import { createSourceAccess } from "@unlock-events/source-access";
import type { SourceAccess, SourceRecord, NavigationBrief } from "@unlock-events/source-access";

let instance: SourceAccess | null = null;

function getInstance(): SourceAccess {
  if (!instance) {
    instance = createSourceAccess({
      connectionString: process.env["DATABASE_URL"],
    });
  }
  return instance;
}

export async function onboardSource(tenantId: string, name: string, url: string): Promise<string> {
  return getInstance().onboardSource(tenantId, name, url);
}

export async function commissionSource(tenantId: string, sourceId: string): Promise<void> {
  return getInstance().commissionSource(tenantId, sourceId);
}

export async function decommissionSource(tenantId: string, sourceId: string): Promise<void> {
  return getInstance().decommissionSource(tenantId, sourceId);
}

export async function retireSource(tenantId: string, sourceId: string): Promise<void> {
  return getInstance().retireSource(tenantId, sourceId);
}

export async function reportNavigationFailure(tenantId: string, sourceId: string): Promise<void> {
  return getInstance().reportNavigationFailure(tenantId, sourceId);
}

export async function acknowledgeNavigationSuccess(
  tenantId: string,
  sourceId: string
): Promise<void> {
  return getInstance().acknowledgeNavigationSuccess(tenantId, sourceId);
}

export async function nominateForNavigation(
  tenantId: string,
  limit: number
): Promise<SourceRecord[]> {
  return getInstance().nominateForNavigation(tenantId, limit);
}

export async function resolveNavigationBrief(
  tenantId: string,
  sourceId: string
): Promise<NavigationBrief> {
  return getInstance().resolveNavigationBrief(tenantId, sourceId);
}
