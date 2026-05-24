import type { TokenType } from './types';
import { TIERS } from './tiers';

export interface ProviderPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion: number;
  cacheWritePerMillion: number;
  imagePerRequest: number;
  toolUsePerCall: number;
}

const PROVIDER_PRICING: Record<string, ProviderPricing> = {
  'claude-sonnet-4-20250514': {
    inputPerMillion: 300,
    outputPerMillion: 1500,
    cacheReadPerMillion: 30,
    cacheWritePerMillion: 375,
    imagePerRequest: 0.004,
    toolUsePerCall: 0.003,
  },
  'claude-haiku-3-5': {
    inputPerMillion: 80,
    outputPerMillion: 400,
    cacheReadPerMillion: 8,
    cacheWritePerMillion: 100,
    imagePerRequest: 0.002,
    toolUsePerCall: 0.001,
  },
  'claude-opus-4': {
    inputPerMillion: 1500,
    outputPerMillion: 7500,
    cacheReadPerMillion: 150,
    cacheWritePerMillion: 1875,
    imagePerRequest: 0.008,
    toolUsePerCall: 0.005,
  },
  'gpt-4o': {
    inputPerMillion: 250,
    outputPerMillion: 1000,
    cacheReadPerMillion: 62.5,
    cacheWritePerMillion: 125,
    imagePerRequest: 0.003,
    toolUsePerCall: 0.002,
  },
  'gpt-4o-mini': {
    inputPerMillion: 15,
    outputPerMillion: 60,
    cacheReadPerMillion: 3.75,
    cacheWritePerMillion: 7.5,
    imagePerRequest: 0.001,
    toolUsePerCall: 0,
  },
  'gemini-2.0-pro': {
    inputPerMillion: 200,
    outputPerMillion: 600,
    cacheReadPerMillion: 25,
    cacheWritePerMillion: 100,
    imagePerRequest: 0.002,
    toolUsePerCall: 0.001,
  },
  'local': {
    inputPerMillion: 0,
    outputPerMillion: 0,
    cacheReadPerMillion: 0,
    cacheWritePerMillion: 0,
    imagePerRequest: 0,
    toolUsePerCall: 0,
  },
  'mock': {
    inputPerMillion: 0,
    outputPerMillion: 0,
    cacheReadPerMillion: 0,
    cacheWritePerMillion: 0,
    imagePerRequest: 0,
    toolUsePerCall: 0,
  },
};

export function getPricing(model: string): ProviderPricing {
  return PROVIDER_PRICING[model] ?? PROVIDER_PRICING['gpt-4o-mini'];
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
  imageCount: number,
  toolCalls: number,
): number {
  const p = getPricing(model);
  return (
    (inputTokens / 1_000_000) * p.inputPerMillion +
    (outputTokens / 1_000_000) * p.outputPerMillion +
    (cacheReadTokens / 1_000_000) * p.cacheReadPerMillion +
    (cacheWriteTokens / 1_000_000) * p.cacheWritePerMillion +
    imageCount * p.imagePerRequest +
    toolCalls * p.toolUsePerCall
  );
}

export function registerModelPricing(model: string, pricing: ProviderPricing): void {
  PROVIDER_PRICING[model] = pricing;
}

export function calculateOverageCost(
  tierId: string,
  tokenType: TokenType,
  overageTokens: number,
): number {
  const tierDef = TIERS[tierId as keyof typeof TIERS];
  if (!tierDef) return 0;
  const rates = tierDef.overagePricing;
  const perMillion =
    tokenType === 'input' || tokenType === 'cache_write'
      ? rates.inputTokensPerMillion
      : tokenType === 'output'
        ? rates.outputTokensPerMillion
        : rates.cacheReadsPerMillion;
  return (overageTokens / 1_000_000) * perMillion;
}
