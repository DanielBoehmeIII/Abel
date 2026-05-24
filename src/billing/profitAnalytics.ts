import type { ProfitMetrics, TierId, UsageEvent } from './types';

export interface BusinessMetrics {
  ltv: number;
  cac: number;
  marginByTier: Record<TierId, number>;
  marginByProvider: Record<string, number>;
  usageClusters: Array<{ label: string; userCount: number; avgSpendCents: number }>;
  conversionFunnel: { viewed: number; trialed: number; converted: number; paid: number };
}

export function computeLTV(metrics: ProfitMetrics[], monthsRetained: number = 12): number {
  if (metrics.length === 0) return 0;
  const avgRevenue = metrics.reduce((s, m) => s + m.revenueCents, 0) / metrics.length;
  return Math.round(avgRevenue * monthsRetained);
}

export function estimateCAC(metrics: ProfitMetrics[], marketingSpendCents: number = 50000): number {
  const payingUsers = metrics.filter(m => m.revenueCents > 0).length;
  if (payingUsers === 0) return marketingSpendCents;
  return Math.round(marketingSpendCents / payingUsers);
}

export function computeMarginByTier(metrics: ProfitMetrics[]): Record<TierId, number> {
  const byTier: Record<string, { revenue: number; spend: number }> = {};
  for (const m of metrics) {
    if (!byTier[m.tierId]) byTier[m.tierId] = { revenue: 0, spend: 0 };
    byTier[m.tierId].revenue += m.revenueCents;
    byTier[m.tierId].spend += m.providerSpendCents;
  }
  const result = {} as Record<TierId, number>;
  for (const [tier, data] of Object.entries(byTier)) {
    result[tier as TierId] = data.revenue > 0 ? Math.round(((data.revenue - data.spend) / data.revenue) * 100) : 0;
  }
  return result;
}

export function computeMarginByProvider(events: UsageEvent[]): Record<string, number> {
  const byProvider: Record<string, { revenue: number; spend: number }> = {};
  for (const e of events) {
    if (!byProvider[e.provider]) byProvider[e.provider] = { revenue: 0, spend: 0 };
    byProvider[e.provider].spend += e.estimatedProviderCost;
    byProvider[e.provider].revenue += e.estimatedRevenue;
  }
  const result: Record<string, number> = {};
  for (const [provider, data] of Object.entries(byProvider)) {
    result[provider] = data.revenue > 0 ? Math.round(((data.revenue - data.spend) / data.revenue) * 100) : 0;
  }
  return result;
}

export function clusterUsers(metrics: ProfitMetrics[]): Array<{ label: string; userCount: number; avgSpendCents: number }> {
  const clusters = [
    { label: 'Light', users: [] as ProfitMetrics[], maxSpend: 1000 },
    { label: 'Medium', users: [] as ProfitMetrics[], maxSpend: 10000 },
    { label: 'Heavy', users: [] as ProfitMetrics[], maxSpend: 50000 },
    { label: 'Power', users: [] as ProfitMetrics[], maxSpend: Infinity },
  ];

  for (const m of metrics) {
    const cluster = clusters.find(c => m.providerSpendCents <= c.maxSpend);
    if (cluster) cluster.users.push(m);
  }

  return clusters.filter(c => c.users.length > 0).map(c => ({
    label: c.label,
    userCount: c.users.length,
    avgSpendCents: c.users.length > 0 ? Math.round(c.users.reduce((s, u) => s + u.providerSpendCents, 0) / c.users.length) : 0,
  }));
}

export function computeConversionFunnel(trialSignups: number, convertedToPaid: number, totalRegistered: number): { viewed: number; trialed: number; converted: number; paid: number } {
  return {
    viewed: totalRegistered,
    trialed: trialSignups,
    converted: convertedToPaid,
    paid: convertedToPaid,
  };
}

export function computeRevenueByTier(metrics: ProfitMetrics[]): Record<TierId, number> {
  const result = {} as Record<TierId, number>;
  for (const m of metrics) {
    result[m.tierId] = (result[m.tierId] ?? 0) + m.revenueCents;
  }
  return result;
}
