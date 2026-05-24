import type { UsageEvent, ProfitMetrics, MarginSnapshot, TierId, ProviderName } from './types';
import { computeMonthlyCost } from './costEngine';
import { TIERS } from './tiers';

export function calculateProfitMetrics(
  userId: string,
  tierId: TierId,
  events: UsageEvent[],
  billingPeriod: string,
): ProfitMetrics {
  const tier = TIERS[tierId];
  const cost = computeMonthlyCost(events);
  const revenueCents = tier.price.monthly;
  const providerSpendCents = cost.totalCents;
  const grossProfitCents = revenueCents - providerSpendCents;
  const grossMarginPct = revenueCents > 0
    ? Math.round((grossProfitCents / revenueCents) * 100)
    : 0;
  const projectedMonthlyCostCents = projectMonthlyCost(events);
  const overageRisk = computeOverageRisk(events, tierId);
  const highBurn = computeHighBurn(events);

  return {
    id: `pm-${userId}-${billingPeriod}`,
    userId,
    billingPeriod,
    tierId,
    revenueCents,
    providerSpendCents: Math.round(providerSpendCents),
    grossProfitCents: Math.round(grossProfitCents),
    grossMarginPct,
    projectedMonthlyCostCents: Math.round(projectedMonthlyCostCents),
    overageRisk,
    highBurn,
    createdAt: new Date().toISOString(),
  };
}

export function takeMarginSnapshot(
  allUserMetrics: ProfitMetrics[],
  allEvents: UsageEvent[],
): MarginSnapshot {
  const totalRevenue = allUserMetrics.reduce((s, m) => s + m.revenueCents, 0);
  const totalSpend = allUserMetrics.reduce((s, m) => s + m.providerSpendCents, 0);
  const totalProfit = totalRevenue - totalSpend;
  const overallMarginPct = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  const tierBreakdown = {} as Record<TierId, { userCount: number; revenueCents: number; spendCents: number }>;
  const providerBreakdown = {} as Record<ProviderName, { spendCents: number; requestCount: number }>;
  const topBurn: Array<{ userId: string; spendCents: number }> = [];

  for (const m of allUserMetrics) {
    if (!tierBreakdown[m.tierId]) {
      tierBreakdown[m.tierId] = { userCount: 0, revenueCents: 0, spendCents: 0 };
    }
    tierBreakdown[m.tierId].userCount++;
    tierBreakdown[m.tierId].revenueCents += m.revenueCents;
    tierBreakdown[m.tierId].spendCents += m.providerSpendCents;
    topBurn.push({ userId: m.userId, spendCents: m.providerSpendCents });
  }

  for (const e of allEvents) {
    if (!providerBreakdown[e.provider]) {
      providerBreakdown[e.provider] = { spendCents: 0, requestCount: 0 };
    }
    providerBreakdown[e.provider].spendCents += e.estimatedProviderCost;
    providerBreakdown[e.provider].requestCount++;
  }

  topBurn.sort((a, b) => b.spendCents - a.spendCents);

  return {
    id: `ms-${Date.now()}`,
    snapshotDate: new Date().toISOString(),
    totalRevenueCents: totalRevenue,
    totalProviderSpendCents: totalSpend,
    totalGrossProfitCents: totalProfit,
    overallMarginPct,
    activeUsers: allUserMetrics.length,
    topBurnUsers: topBurn.slice(0, 10),
    tierBreakdown,
    providerBreakdown,
    createdAt: new Date().toISOString(),
  };
}

function projectMonthlyCost(events: UsageEvent[]): number {
  if (events.length === 0) return 0;
  const cost = computeMonthlyCost(events);
  const days = getDaysSinceFirstEvent(events);
  if (days < 1) return cost.totalCents;
  return cost.totalCents / days * 30;
}

function getDaysSinceFirstEvent(events: UsageEvent[]): number {
  if (events.length === 0) return 1;
  const dates = events.map(e => new Date(e.createdAt).getTime());
  const first = Math.min(...dates);
  const now = Date.now();
  return Math.max(1, (now - first) / (1000 * 60 * 60 * 24));
}

function computeOverageRisk(events: UsageEvent[], tierId: TierId): 'low' | 'medium' | 'high' {
  const usage = events.reduce((acc, e) => ({
    inputTokens: acc.inputTokens + e.inputTokens,
    outputTokens: acc.outputTokens + e.outputTokens,
  }), { inputTokens: 0, outputTokens: 0 });
  const tier = TIERS[tierId];
  if (!tier) return 'low';
  const inputRatio = usage.inputTokens / tier.includedUsage.inputTokens;
  if (inputRatio > 1.5) return 'high';
  if (inputRatio > 0.8) return 'medium';
  return 'low';
}

function computeHighBurn(events: UsageEvent[]): boolean {
  if (events.length < 100) return false;
  const cost = computeMonthlyCost(events);
  return cost.totalCents > 50000;
}

export function findMismatchedTiers(metrics: ProfitMetrics[]): Array<{ userId: string; currentTier: TierId; recommendedTier: TierId; savingsCents: number }> {
  const mismatches: Array<{ userId: string; currentTier: TierId; recommendedTier: TierId; savingsCents: number }> = [];
  const tierOrder: TierId[] = ['free', 'starter', 'pro', 'power'];
  for (const m of metrics) {
    const currentIdx = tierOrder.indexOf(m.tierId);
    if (m.grossMarginPct < 20 && currentIdx < tierOrder.length - 1) {
      const nextTier = tierOrder[currentIdx + 1];
      const nextPrice = TIERS[nextTier].price.monthly;
      const savings = m.projectedMonthlyCostCents - nextPrice;
      if (savings > 0 || m.grossMarginPct < 0) {
        mismatches.push({ userId: m.userId, currentTier: m.tierId, recommendedTier: nextTier, savingsCents: Math.max(0, savings) });
      }
    }
  }
  return mismatches;
}
