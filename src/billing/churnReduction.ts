import type { TierId } from './types';
import { db } from '../db';
import { TIERS } from './tiers';
import { getTotalUsageThisPeriod } from './usageTracker';

const iso = () => new Date().toISOString();

export interface ChurnRiskAssessment {
  userId: string;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
  recommendation: string;
  gracePeriodDays: number;
  offerDiscount: boolean;
  suggestDowngrade: boolean;
  suggestedTier?: TierId;
}

export async function assessChurnRisk(
  userId: string,
  currentTier: TierId,
  subscriptionAgeDays: number,
): Promise<ChurnRiskAssessment> {
  const reasons: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let gracePeriodDays = 0;
  let offerDiscount = false;
  let suggestDowngrade = false;

  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const usage = await getTotalUsageThisPeriod(userId, periodStart);
  const tier = TIERS[currentTier];

  const usagePct = tier.includedUsage.inputTokens > 0
    ? (usage.inputTokens / tier.includedUsage.inputTokens) * 100
    : 0;

  if (subscriptionAgeDays < 7) {
    reasons.push('New subscriber — early churn risk');
    riskLevel = 'high';
    offerDiscount = true;
    gracePeriodDays = 14;
    suggestDowngrade = false;
  } else if (usagePct < 5 && currentTier !== 'free') {
    reasons.push('Very low usage — not receiving value');
    riskLevel = 'high';
    offerDiscount = true;
    suggestDowngrade = true;
    gracePeriodDays = 7;
  } else if (usagePct < 20 && currentTier !== 'free') {
    reasons.push('Low usage — may not be justifying cost');
    riskLevel = 'medium';
    suggestDowngrade = true;
    gracePeriodDays = 3;
  } else if (usage.inputTokens > tier.includedUsage.inputTokens * 1.5) {
    reasons.push('High overage — may feel overcharged');
    riskLevel = 'medium';
    offerDiscount = true;
    gracePeriodDays = 7;
  }

  const recommendation: string = riskLevel === 'high'
    ? offerDiscount
      ? 'Offer 50% discount for next month + retention message'
      : 'Send personalized value summary email'
    : riskLevel === 'medium'
      ? suggestDowngrade
        ? 'Suggest downgrade to recommended tier'
        : 'Send usage tips and onboarding reminders'
      : 'No action needed';

  let suggestedTier: TierId | undefined;
  if (suggestDowngrade) {
    const tiers: TierId[] = ['free', 'starter', 'pro', 'power'];
    const idx = tiers.indexOf(currentTier);
    if (idx > 0) suggestedTier = tiers[idx - 1];
  }

  return {
    userId,
    riskLevel,
    reasons,
    recommendation,
    gracePeriodDays,
    offerDiscount,
    suggestDowngrade,
    suggestedTier,
  };
}

export function generateRetentionMessage(risk: ChurnRiskAssessment): { subject: string; body: string } {
  if (risk.riskLevel === 'high') {
    return {
      subject: "We'd love to keep you — here's a special offer",
      body: `We noticed you haven't been using Abel much. Here's ${risk.offerDiscount ? '50% off your next month' : 'a quick summary of what you built'}.\n\n${risk.recommendation}`,
    };
  }
  if (risk.riskLevel === 'medium') {
    return {
      subject: 'Tips to get more from Abel',
      body: `You're on the ${risk.suggestedTier ?? ''} plan. Here are some tips to maximize value.\n\n${risk.recommendation}`,
    };
  }
  return { subject: '', body: '' };
}

export async function recordRetentionAction(userId: string, action: string): Promise<void> {
  await db.table('retentionActions').put({
    id: `ra-${userId}-${Date.now()}`,
    userId,
    action,
    createdAt: iso(),
  });
}

declare module '../db/db' {
  interface AbelDatabase {
    retentionActions: import('dexie').Table<{ id: string; userId: string; action: string; createdAt: string }, string>;
  }
}
