import type { TokenBudget, TierId } from './types';
import { TIERS } from './tiers';

export function createTokenBudget(userId: string, tierId: TierId): TokenBudget {
  const tier = TIERS[tierId];
  return {
    id: `tb-${userId}`,
    userId,
    tierId,
    monthlyInputTokenBudget: tier.includedUsage.inputTokens,
    monthlyOutputTokenBudget: tier.includedUsage.outputTokens,
    dailyInputLimit: Math.round(tier.includedUsage.inputTokens / 30 * 1.5),
    dailyOutputLimit: Math.round(tier.includedUsage.outputTokens / 30 * 1.5),
    softWarningThreshold: 0.8,
    hardCapEnabled: tier.overageBehavior === 'block',
    notificationsEnabled: true,
  };
}

export function getTokenBudgetStatus(
  budget: TokenBudget,
  usageThisPeriod: { inputTokens: number; outputTokens: number },
  todayUsage: { inputTokens: number; outputTokens: number },
): {
  inputPct: number;
  outputPct: number;
  dailyInputPct: number;
  dailyOutputPct: number;
  softWarning: boolean;
  hardCapReached: boolean;
  blocking: boolean;
} {
  const inputPct = (usageThisPeriod.inputTokens / budget.monthlyInputTokenBudget) * 100;
  const outputPct = (usageThisPeriod.outputTokens / budget.monthlyOutputTokenBudget) * 100;
  const dailyInputPct = (todayUsage.inputTokens / budget.dailyInputLimit) * 100;
  const dailyOutputPct = (todayUsage.outputTokens / budget.dailyOutputLimit) * 100;
  const softWarning = inputPct >= budget.softWarningThreshold * 100 || outputPct >= budget.softWarningThreshold * 100;
  const hardCapReached = budget.hardCapEnabled && (usageThisPeriod.inputTokens >= budget.monthlyInputTokenBudget || usageThisPeriod.outputTokens >= budget.monthlyOutputTokenBudget);
  const blocking = budget.hardCapEnabled && hardCapReached;

  return {
    inputPct: Math.round(inputPct),
    outputPct: Math.round(outputPct),
    dailyInputPct: Math.round(dailyInputPct),
    dailyOutputPct: Math.round(dailyOutputPct),
    softWarning,
    hardCapReached,
    blocking,
  };
}

export function shouldBlockRequest(budgetStatus: ReturnType<typeof getTokenBudgetStatus>): boolean {
  return budgetStatus.blocking;
}

export function formatBudgetPct(pct: number): string {
  if (pct >= 100) return `100%+`;
  return `${pct}%`;
}
