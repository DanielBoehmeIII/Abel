import type { ProfitMetrics, ProviderName, UsageEvent, MarginSnapshot } from './types';
import { findMismatchedTiers } from './marginEngine';
import { computeMarginByTier } from './profitAnalytics';

export interface ProfitOptimizationRecommendation {
  type: 'pricing_adjustment' | 'routing_change' | 'abusive_user' | 'tier_restructure' | 'margin_optimization';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  expectedImpactCents: number;
  action: string;
}

export function generateOptimizations(
  metrics: ProfitMetrics[],
  allEvents: UsageEvent[],
  snapshot: MarginSnapshot,
): ProfitOptimizationRecommendation[] {
  const recommendations: ProfitOptimizationRecommendation[] = [];

  const marginByTier = computeMarginByTier(metrics);
  for (const [tierId, marginPct] of Object.entries(marginByTier)) {
    if (marginPct < 10) {
      recommendations.push({
        type: 'pricing_adjustment',
        priority: 'high',
        description: `${tierId} tier margin at ${marginPct}% — below 10% threshold`,
        expectedImpactCents: Math.round(snapshot.totalRevenueCents * 0.1),
        action: `Increase ${tierId} pricing by 15-20% or reduce included usage`,
      });
    }
  }

  const mismatched = findMismatchedTiers(metrics);
  for (const m of mismatched.slice(0, 5)) {
    recommendations.push({
      type: 'tier_restructure',
      priority: 'medium',
      description: `User ${m.userId} on ${m.currentTier} projected to save ${m.savingsCents}¢ on ${m.recommendedTier}`,
      expectedImpactCents: m.savingsCents,
      action: `Suggest upgrade from ${m.currentTier} to ${m.recommendedTier}`,
    });
  }

  const providerUsage: Record<ProviderName, { spend: number; count: number }> = {} as Record<ProviderName, { spend: number; count: number }>;
  for (const e of allEvents) {
    if (!providerUsage[e.provider]) providerUsage[e.provider] = { spend: 0, count: 0 };
    providerUsage[e.provider].spend += e.estimatedProviderCost;
    providerUsage[e.provider].count++;
  }

  const premiumProviders: ProviderName[] = ['claude'];
  for (const provider of premiumProviders) {
    const pData = providerUsage[provider];
    if (pData && pData.spend > 50000) {
      recommendations.push({
        type: 'routing_change',
        priority: 'high',
        description: `${provider} spend at ${pData.spend}¢ — consider routing simple queries to cheaper models`,
        expectedImpactCents: Math.round(pData.spend * 0.3),
        action: `Route 30% of ${provider} simple requests to gpt-4o-mini or claude-haiku`,
      });
    }
  }

  const heavyUsers = metrics
    .filter(m => m.providerSpendCents > 50000)
    .sort((a, b) => b.providerSpendCents - a.providerSpendCents)
    .slice(0, 3);

  for (const user of heavyUsers) {
    recommendations.push({
      type: 'abusive_user',
      priority: 'critical' as const,
      description: `User ${user.userId} spend at ${user.providerSpendCents}¢ — possible abuse or severe tier mismatch`,
      expectedImpactCents: Math.round(user.providerSpendCents * 0.5),
      action: `Review ${user.userId} usage patterns. Apply rate limits or require upgrade.`,
    });
  }

  if (snapshot.overallMarginPct < 30) {
    const expectedImprovement = Math.round(snapshot.totalRevenueCents * (0.3 - snapshot.overallMarginPct / 100) * 0.3);
    recommendations.push({
      type: 'margin_optimization',
      priority: 'critical',
      description: `Overall margin at ${snapshot.overallMarginPct}% — below 30% target`,
      expectedImpactCents: expectedImprovement,
      action: 'Implement model routing optimization + reduce premium model usage for simple tasks',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function autoApplyOptimizations(recommendations: ProfitOptimizationRecommendation[]): Array<{ applied: boolean; action: string; reason: string }> {
  return recommendations.map(rec => {
    if (rec.priority === 'critical' && rec.expectedImpactCents > 1000) {
      return { applied: true, action: rec.action, reason: 'Auto-applied critical optimization' };
    }
    return { applied: false, action: rec.action, reason: 'Requires manual review' };
  });
}
