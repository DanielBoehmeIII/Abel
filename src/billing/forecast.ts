import type { UsageForecast, TierId } from './types';
import { TIERS } from './tiers';
import { getTotalUsageThisPeriod } from './usageTracker';

export async function generateForecast(
  userId: string,
  tierId: TierId,
  periodStart: string,
): Promise<UsageForecast> {
  const total = await getTotalUsageThisPeriod(userId, periodStart);
  const daysElapsed = Math.max(1, getDaysElapsed(periodStart));
  const daysInMonth = 30;
  const dailyInput = total.inputTokens / daysElapsed;
  const dailyOutput = total.outputTokens / daysElapsed;

  const estimatedInput = dailyInput * daysInMonth;
  const estimatedOutput = dailyOutput * daysInMonth;

  const tier = TIERS[tierId];
  const overageInput = Math.max(0, estimatedInput - tier.includedUsage.inputTokens);
  const overageOutput = Math.max(0, estimatedOutput - tier.includedUsage.outputTokens);
  const overageCents = Math.round(
    (overageInput / 1_000_000) * tier.overagePricing.inputTokensPerMillion * 100 +
    (overageOutput / 1_000_000) * tier.overagePricing.outputTokensPerMillion * 100
  );

  const tierMismatch = overageCents > tier.price.monthly * 2 || estimatedInput > tier.includedUsage.inputTokens * 2;
  let recommendedTier: TierId | undefined;
  let upgradeSavingsCents = 0;

  if (tierMismatch) {
    const tierIds: TierId[] = ['free', 'starter', 'pro', 'power'];
    const currentIdx = tierIds.indexOf(tierId);
    for (let i = currentIdx + 1; i < tierIds.length; i++) {
      const next = TIERS[tierIds[i]];
      const nextOverageInput = Math.max(0, estimatedInput - next.includedUsage.inputTokens);
      const nextOverageOutput = Math.max(0, estimatedOutput - next.includedUsage.outputTokens);
      const nextCost = next.price.monthly + Math.round(
        (nextOverageInput / 1_000_000) * next.overagePricing.inputTokensPerMillion * 100 +
        (nextOverageOutput / 1_000_000) * next.overagePricing.outputTokensPerMillion * 100
      );
      const currentCost = tier.price.monthly + overageCents;
      if (nextCost < currentCost) {
        recommendedTier = tierIds[i];
        upgradeSavingsCents = currentCost - nextCost;
        break;
      }
    }
  }

  return {
    userId,
    tierId,
    periodStart,
    estimatedMonthEndTokens: { input: Math.round(estimatedInput), output: Math.round(estimatedOutput) },
    burnRate: { dailyTokens: Math.round(dailyInput + dailyOutput), trendDays: Math.round(daysElapsed) },
    tierMismatch,
    recommendedTier,
    upgradeSavingsCents,
    projectedOverageCents: overageCents,
  };
}

function getDaysElapsed(periodStart: string): number {
  const start = new Date(periodStart).getTime();
  const now = Date.now();
  return Math.max(1, (now - start) / (1000 * 60 * 60 * 24));
}
