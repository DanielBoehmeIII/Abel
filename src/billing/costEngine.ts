import type { UsageEvent, TierId, TokenType } from './types';
import { getPricing } from './pricing';
import { TIERS } from './tiers';

export interface CostBreakdown {
  inputCents: number;
  outputCents: number;
  cacheReadCents: number;
  cacheWriteCents: number;
  imageCents: number;
  toolCents: number;
  totalCents: number;
}

export function computeEventCost(event: Pick<UsageEvent, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens' | 'model' | 'imageCount' | 'toolCalls'>): CostBreakdown {
  const p = getPricing(event.model);
  const inputCents = (event.inputTokens / 1_000_000) * p.inputPerMillion * 100;
  const outputCents = (event.outputTokens / 1_000_000) * p.outputPerMillion * 100;
  const cacheReadCents = (event.cacheReadTokens / 1_000_000) * p.cacheReadPerMillion * 100;
  const cacheWriteCents = (event.cacheWriteTokens / 1_000_000) * p.cacheWritePerMillion * 100;
  const imageCents = (event.imageCount ?? 0) * p.imagePerRequest * 100;
  const toolCents = (event.toolCalls ?? 0) * p.toolUsePerCall * 100;
  return {
    inputCents: round(inputCents),
    outputCents: round(outputCents),
    cacheReadCents: round(cacheReadCents),
    cacheWriteCents: round(cacheWriteCents),
    imageCents: round(imageCents),
    toolCents: round(toolCents),
    totalCents: round(inputCents + outputCents + cacheReadCents + cacheWriteCents + imageCents + toolCents),
  };
}

export function computeMonthlyCost(events: UsageEvent[]): CostBreakdown {
  const acc: CostBreakdown = { inputCents: 0, outputCents: 0, cacheReadCents: 0, cacheWriteCents: 0, imageCents: 0, toolCents: 0, totalCents: 0 };
  for (const e of events) {
    const c = computeEventCost(e);
    acc.inputCents += c.inputCents;
    acc.outputCents += c.outputCents;
    acc.cacheReadCents += c.cacheReadCents;
    acc.cacheWriteCents += c.cacheWriteCents;
    acc.imageCents += c.imageCents;
    acc.toolCents += c.toolCents;
    acc.totalCents += c.totalCents;
  }
  acc.inputCents = round(acc.inputCents);
  acc.outputCents = round(acc.outputCents);
  acc.cacheReadCents = round(acc.cacheReadCents);
  acc.cacheWriteCents = round(acc.cacheWriteCents);
  acc.imageCents = round(acc.imageCents);
  acc.toolCents = round(acc.toolCents);
  acc.totalCents = round(acc.totalCents);
  return acc;
}

export function computeIncludedUsageRemaining(
  tierId: TierId,
  usageThisPeriod: { inputTokens: number; outputTokens: number; cacheReadTokens: number },
): { inputTokensRemaining: number; outputTokensRemaining: number; cacheReadsRemaining: number; inputPct: number; outputPct: number; cachePct: number } {
  const tier = TIERS[tierId];
  const inputRem = Math.max(0, tier.includedUsage.inputTokens - usageThisPeriod.inputTokens);
  const outputRem = Math.max(0, tier.includedUsage.outputTokens - usageThisPeriod.outputTokens);
  const cacheRem = Math.max(0, tier.includedUsage.cacheReads - usageThisPeriod.cacheReadTokens);
  return {
    inputTokensRemaining: inputRem,
    outputTokensRemaining: outputRem,
    cacheReadsRemaining: cacheRem,
    inputPct: Math.min(100, Math.round((usageThisPeriod.inputTokens / tier.includedUsage.inputTokens) * 100)),
    outputPct: Math.min(100, Math.round((usageThisPeriod.outputTokens / tier.includedUsage.outputTokens) * 100)),
    cachePct: Math.min(100, Math.round((usageThisPeriod.cacheReadTokens / tier.includedUsage.cacheReads) * 100)),
  };
}

export function computeOverageCost(tierId: TierId, tokenType: TokenType, overageTokens: number): number {
  const tier = TIERS[tierId];
  const rates = tier.overagePricing;
  const perMillion =
    tokenType === 'input' || tokenType === 'cache_write'
      ? rates.inputTokensPerMillion
      : tokenType === 'output'
        ? rates.outputTokensPerMillion
        : rates.cacheReadsPerMillion;
  return round((overageTokens / 1_000_000) * perMillion * 100);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
