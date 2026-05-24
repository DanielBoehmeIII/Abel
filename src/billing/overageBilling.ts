import type { TierId, OverageCharge, TokenType } from './types';
import { TIERS } from './tiers';
import { db } from '../db';
import { getTotalUsageThisPeriod } from './usageTracker';

const iso = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export async function calculateOverage(
  userId: string,
  tierId: TierId,
  periodStart: string,
): Promise<{
  overageInputTokens: number;
  overageOutputTokens: number;
  overageCacheTokens: number;
  totalOverageCents: number;
  charges: OverageCharge[];
}> {
  const tier = TIERS[tierId];
  const usage = await getTotalUsageThisPeriod(userId, periodStart);

  const overageInput = Math.max(0, usage.inputTokens - tier.includedUsage.inputTokens);
  const overageOutput = Math.max(0, usage.outputTokens - tier.includedUsage.outputTokens);
  const overageCache = Math.max(0, usage.cacheReadTokens - tier.includedUsage.cacheReads);

  const charges: OverageCharge[] = [];
  let totalCents = 0;

  if (overageInput > 0) {
    const inputCents = Math.round((overageInput / 1_000_000) * tier.overagePricing.inputTokensPerMillion * 100);
    charges.push(makeOverageCharge(userId, 'input', overageInput, tier.overagePricing.inputTokensPerMillion, inputCents));
    totalCents += inputCents;
  }
  if (overageOutput > 0) {
    const outputCents = Math.round((overageOutput / 1_000_000) * tier.overagePricing.outputTokensPerMillion * 100);
    charges.push(makeOverageCharge(userId, 'output', overageOutput, tier.overagePricing.outputTokensPerMillion, outputCents));
    totalCents += outputCents;
  }

  return {
    overageInputTokens: overageInput,
    overageOutputTokens: overageOutput,
    overageCacheTokens: overageCache,
    totalOverageCents: totalCents,
    charges,
  };
}

export async function processOverageBilling(
  userId: string,
  tierId: TierId,
  subscriptionId: string,
  periodStart: string,
): Promise<OverageCharge[]> {
  const tier = TIERS[tierId];
  if (tier.overageBehavior === 'block') return [];

  const result = await calculateOverage(userId, tierId, periodStart);
  if (result.charges.length === 0) return [];

  const billingPeriod = periodStart.slice(0, 7);
  for (const charge of result.charges) {
    await db.overageCharges.put({
      ...charge,
      subscriptionId,
      billingPeriod,
    });
  }

  return result.charges;
}

export async function checkOverageBlock(
  userId: string,
  tierId: TierId,
  periodStart: string,
): Promise<{ blocked: boolean; reason?: string }> {
  const tier = TIERS[tierId];
  if (tier.overageBehavior !== 'block') return { blocked: false };

  const result = await calculateOverage(userId, tierId, periodStart);
  if (result.totalOverageCents > 0) {
    return {
      blocked: true,
      reason: `Usage cap reached for ${tier.name} plan. Upgrade to continue.`,
    };
  }
  return { blocked: false };
}

export async function estimateOverageRisk(
  userId: string,
  tierId: TierId,
  periodStart: string,
): Promise<{ riskLevel: 'none' | 'low' | 'medium' | 'high'; projectedOverageCents: number; daysRemaining: number }> {
  const tier = TIERS[tierId];
  const usage = await getTotalUsageThisPeriod(userId, periodStart);
  const daysElapsed = Math.max(1, Math.round((Date.now() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, 30 - daysElapsed);
  const dailyInput = usage.inputTokens / daysElapsed;
  const projectedInput = dailyInput * 30;
  const overageInput = Math.max(0, projectedInput - tier.includedUsage.inputTokens);
  const projectedCents = Math.round((overageInput / 1_000_000) * tier.overagePricing.inputTokensPerMillion * 100);

  let riskLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (projectedCents > tier.price.monthly * 5) riskLevel = 'high';
  else if (projectedCents > tier.price.monthly * 2) riskLevel = 'medium';
  else if (projectedCents > 0) riskLevel = 'low';

  return { riskLevel, projectedOverageCents: projectedCents, daysRemaining };
}

function makeOverageCharge(userId: string, type: TokenType, overageUnits: number, ratePerMillion: number, amountCents: number): OverageCharge {
  return {
    id: `oc-${uid()}`,
    userId,
    subscriptionId: '',
    billingPeriod: '',
    type,
    overageUnits,
    ratePerUnit: ratePerMillion / 1_000_000,
    amountCents,
    currency: 'usd',
    status: 'pending',
    createdAt: iso(),
  };
}
