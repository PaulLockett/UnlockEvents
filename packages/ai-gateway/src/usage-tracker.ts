import type { AggregateUsage, UsageRecord } from "./types.js";

export class UsageTracker {
  private totalCost = 0;
  private totalTokens = 0;
  private requestCount = 0;
  private perModel = new Map<string, { tokens: number; cost: number; requests: number }>();

  record(usage: UsageRecord): void {
    this.totalCost += usage.estimatedCost;
    this.totalTokens += usage.totalTokens;
    this.requestCount += 1;

    const existing = this.perModel.get(usage.model);
    if (existing) {
      existing.tokens += usage.totalTokens;
      existing.cost += usage.estimatedCost;
      existing.requests += 1;
    } else {
      this.perModel.set(usage.model, {
        tokens: usage.totalTokens,
        cost: usage.estimatedCost,
        requests: 1,
      });
    }
  }

  getUsage(): AggregateUsage {
    return {
      totalCost: this.totalCost,
      totalTokens: this.totalTokens,
      requestCount: this.requestCount,
      perModel: new Map(this.perModel),
    };
  }

  reset(): void {
    this.totalCost = 0;
    this.totalTokens = 0;
    this.requestCount = 0;
    this.perModel.clear();
  }
}
