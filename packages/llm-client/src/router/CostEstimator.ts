/**
 * Phase 21 / OPS-504 — Per-model cost estimation.
 *
 * Loads model pricing from config/model_pricing.json (in-repo, refreshed
 * quarterly). estimateCost(tokens_in, tokens_out, model_id) → USD.
 *
 * Discipline: pricing config has `last_updated_iso`. If the value is older
 * than 90 days, log a warning at startup. Pricing drift is the #1 way the
 * daily-cap math goes wrong.
 */
import pricingConfig from "../../config/model_pricing.json" with { type: "json" };

interface ModelPricing {
  input_usd_per_mtok: number;
  output_usd_per_mtok: number;
  context_window: number;
  provider: string;
  tier: "premium" | "mid" | "cheap";
}

interface PricingConfig {
  version: string;
  last_updated_iso: string;
  models: Record<string, ModelPricing>;
}

const pricing = pricingConfig as PricingConfig;

// Startup freshness warning
const lastUpdated = new Date(pricing.last_updated_iso);
const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
if (Date.now() - lastUpdated.getTime() > ninetyDaysMs) {
  console.warn(
    `[CostEstimator] Pricing config last updated ${pricing.last_updated_iso} — ` +
    `more than 90 days old. Refresh packages/llm-client/config/model_pricing.json.`
  );
}

export function estimateCost(tokensIn: number, tokensOut: number, modelId: string): number {
  const p = pricing.models[modelId];
  if (!p) {
    throw new Error(`Unknown model_id for cost estimation: "${modelId}". ` +
      `Add to packages/llm-client/config/model_pricing.json.`);
  }
  const costIn = (tokensIn / 1_000_000) * p.input_usd_per_mtok;
  const costOut = (tokensOut / 1_000_000) * p.output_usd_per_mtok;
  return costIn + costOut;
}

export function getModelInfo(modelId: string): ModelPricing {
  const p = pricing.models[modelId];
  if (!p) throw new Error(`Unknown model_id: "${modelId}"`);
  return p;
}

export function listModels(): string[] {
  return Object.keys(pricing.models);
}

export function getPricingVersion(): string {
  return `${pricing.version} (updated ${pricing.last_updated_iso})`;
}
