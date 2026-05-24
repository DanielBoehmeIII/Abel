import type { UsageEvent, TierId } from './types';
import { TIERS } from './tiers';
import { estimateCostForTokens } from './providerAbstraction';

export interface UsageExplanation {
  totalCost: number;
  breakdown: Array<{ label: string; costCents: number; pct: number }>;
  premiumModelUsage: number;
  tokenHeavyActions: Array<{ action: string; tokens: number; costCents: number }>;
  estimatedMonthlySavings: number;
  savingsByUpgrade: Array<{ tier: TierId; savingsCents: number; label: string }>;
}

export function explainUsage(
  events: UsageEvent[],
  currentTier: TierId,
): UsageExplanation {
  const totalCost = events.reduce((s, e) => s + e.estimatedProviderCost, 0);
  const totalInput = events.reduce((s, e) => s + e.inputTokens, 0);
  const totalOutput = events.reduce((s, e) => s + e.outputTokens, 0);

  const premiumModels = ['claude-opus-4', 'gpt-4o', 'claude-sonnet-4-20250514'];
  const premiumEvents = events.filter(e => premiumModels.includes(e.model));
  const premiumModelUsage = premiumEvents.length;

  const byModel: Record<string, { cost: number; tokens: number }> = {};
  for (const e of events) {
    if (!byModel[e.model]) byModel[e.model] = { cost: 0, tokens: 0 };
    byModel[e.model].cost += e.estimatedProviderCost;
    byModel[e.model].tokens += e.inputTokens + e.outputTokens;
  }

  const breakdown = Object.entries(byModel).map(([model, data]) => ({
    label: model,
    costCents: Math.round(data.cost),
    pct: totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0,
  }));

  const tokenHeavyActions = events
    .filter(e => e.inputTokens > 10000)
    .sort((a, b) => b.inputTokens - a.inputTokens)
    .slice(0, 5)
    .map(e => ({
      action: e.featureUsed ?? e.type,
      tokens: e.inputTokens + e.outputTokens,
      costCents: e.estimatedProviderCost,
    }));

  const costAsCheapest = estimateCostForTokens('gpt-4o-mini', totalInput, totalOutput);
  const currentCost = estimateCostForTokens('claude-sonnet-4-20250514', totalInput, totalOutput);
  const estimatedMonthlySavings = Math.round(Math.max(0, currentCost - costAsCheapest) * 100);

  const tierIds: TierId[] = ['free', 'starter', 'pro', 'power'];
  const currentIdx = tierIds.indexOf(currentTier);
  const savingsByUpgrade = tierIds
    .slice(currentIdx + 1)
    .map(tier => {
      const t = TIERS[tier];
      const costDiff = totalCost - t.price.monthly;
      return {
        tier,
        savingsCents: Math.max(0, costDiff),
        label: `${t.name} plan`,
      };
    })
    .filter(s => s.savingsCents > 0);

  return {
    totalCost,
    breakdown,
    premiumModelUsage,
    tokenHeavyActions,
    estimatedMonthlySavings,
    savingsByUpgrade,
  };
}

export function formatCostReason(event: UsageEvent): string {
  const reasons: string[] = [];
  if (event.cacheWriteTokens > 0) reasons.push('cache write penalty');
  if (event.imageCount > 0) reasons.push(`${event.imageCount} images`);
  if (event.toolCalls > 0) reasons.push(`${event.toolCalls} tool calls`);
  if (event.provider === 'claude' && event.model.includes('opus')) reasons.push('premium model (Opus)');
  if (event.inputTokens > 10000) reasons.push('large input context');
  if (reasons.length === 0) reasons.push('standard request');
  return reasons.join(', ');
}

export function getUpgradeRecommendation(currentTier: TierId, events: UsageEvent[]): { recommendedTier: TierId | null; reason: string } {
  const totalInput = events.reduce((s, e) => s + e.inputTokens, 0);
  const tier = TIERS[currentTier];
  if (totalInput > tier.includedUsage.inputTokens * 1.5) {
    const tierIds: TierId[] = ['free', 'starter', 'pro', 'power'];
    const idx = tierIds.indexOf(currentTier);
    if (idx < tierIds.length - 1) {
      const next = tierIds[idx + 1];
      const nextTier = TIERS[next];
      const savings = Math.round(((totalInput - tier.includedUsage.inputTokens) / 1_000_000) * tier.overagePricing.inputTokensPerMillion * 100);
      return {
        recommendedTier: next,
        reason: `You're using ${Math.round(totalInput / tier.includedUsage.inputTokens * 100)}% of your included input. Upgrading to ${nextTier.name} saves ~$${(savings / 100).toFixed(2)}/mo in overage.`,
      };
    }
  }
  return { recommendedTier: null, reason: '' };
}
