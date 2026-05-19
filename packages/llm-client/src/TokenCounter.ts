import type { MODELS } from "./types.js";

export interface UsageRecord {
  timestamp: number;
  templateId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costRmb: number;
}

export class TokenCounter {
  private history: UsageRecord[] = [];
  private maxHistory: number;

  constructor(options: { maxHistory?: number } = {}) {
    this.maxHistory = options.maxHistory ?? 1000;
  }

  /**
   * Record usage from an LLM response.
   */
  record(record: UsageRecord): void {
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  /**
   * Get total usage for a time window.
   */
  getUsageForWindow(ms: number): {
    calls: number;
    promptTokens: number;
    completionTokens: number;
    totalCostRmb: number;
  } {
    const cutoff = Date.now() - ms;
    const relevant = this.history.filter((r) => r.timestamp >= cutoff);

    return relevant.reduce(
      (acc, r) => ({
        calls: acc.calls + 1,
        promptTokens: acc.promptTokens + r.promptTokens,
        completionTokens: acc.completionTokens + r.completionTokens,
        totalCostRmb: acc.totalCostRmb + r.costRmb,
      }),
      { calls: 0, promptTokens: 0, completionTokens: 0, totalCostRmb: 0 }
    );
  }

  /**
   * Get per-template breakdown.
   */
  getTemplateBreakdown(): Record<
    string,
    { calls: number; tokens: number; costRmb: number }
  > {
    const map: Record<string, { calls: number; tokens: number; costRmb: number }> = {};

    for (const record of this.history) {
      const existing = map[record.templateId] ?? { calls: 0, tokens: 0, costRmb: 0 };
      existing.calls += 1;
      existing.tokens += record.promptTokens + record.completionTokens;
      existing.costRmb += record.costRmb;
      map[record.templateId] = existing;
    }

    return map;
  }

  /**
   * Estimate cost in RMB from token counts.
   */
  static estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    // Moonshot pricing (as of 2025)
    const pricing: Record<string, number> = {
      "moonshot-v1-8k": 0.006,
      "moonshot-v1-32k": 0.024,
      "moonshot-v1-128k": 0.12,
    };
    const rate = pricing[model] ?? 0.024;
    return ((promptTokens + completionTokens) / 1000) * rate;
  }

  /**
   * Rough token count from text.
   */
  static count(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get all history.
   */
  getHistory(): UsageRecord[] {
    return [...this.history];
  }

  /**
   * Clear history.
   */
  clear(): void {
    this.history = [];
  }
}
