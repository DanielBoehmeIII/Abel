import { db } from '../db';
import type { CreditBalance } from './types';

const iso = () => new Date().toISOString();

export interface CreditPack {
  id: string;
  name: string;
  creditCents: number;
  priceCents: number;
  bonusPct: number;
  description: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'small', name: 'Starter Pack', creditCents: 500, priceCents: 500, bonusPct: 0, description: '500¢ of AI usage' },
  { id: 'medium', name: 'Booster Pack', creditCents: 1500, priceCents: 1200, bonusPct: 25, description: '1,500¢ of AI usage for $12' },
  { id: 'large', name: 'Power Pack', creditCents: 5000, priceCents: 3500, bonusPct: 42, description: '5,000¢ of AI usage for $35' },
  { id: 'xl', name: 'Ultra Pack', creditCents: 15000, priceCents: 9000, bonusPct: 66, description: '15,000¢ of AI usage for $90' },
];

export async function getCreditBalance(userId: string): Promise<CreditBalance | undefined> {
  return db.creditBalances.where('userId').equals(userId).first();
}

export async function ensureCreditBalance(userId: string): Promise<CreditBalance> {
  const existing = await getCreditBalance(userId);
  if (existing) return existing;
  const balance: CreditBalance = {
    id: `cb-${userId}`,
    userId,
    balanceCents: 0,
    lifetimeCreditsCents: 0,
    lifetimeUsageCents: 0,
    createdAt: iso(),
    updatedAt: iso(),
  };
  await db.creditBalances.put(balance);
  return balance;
}

export async function purchaseCreditPack(userId: string, packId: string): Promise<CreditBalance> {
  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) throw new Error(`Unknown credit pack: ${packId}`);
  const balance = await ensureCreditBalance(userId);
  const newCredits = pack.creditCents;
  balance.balanceCents += newCredits;
  balance.lifetimeCreditsCents += newCredits;
  balance.updatedAt = iso();
  await db.creditBalances.put(balance);
  return balance;
}

export async function deductCredits(userId: string, amountCents: number): Promise<{ deducted: number; remaining: number; fullyCovered: boolean }> {
  const balance = await ensureCreditBalance(userId);
  const deductible = Math.min(amountCents, balance.balanceCents);
  balance.balanceCents -= deductible;
  balance.lifetimeUsageCents += deductible;
  balance.updatedAt = iso();
  await db.creditBalances.put(balance);
  return {
    deducted: deductible,
    remaining: balance.balanceCents,
    fullyCovered: deductible >= amountCents,
  };
}

export async function hasSufficientCredits(userId: string, amountCents: number): Promise<boolean> {
  const balance = await getCreditBalance(userId);
  return (balance?.balanceCents ?? 0) >= amountCents;
}

export async function addEmergencyTopUp(userId: string, amountCents: number): Promise<CreditBalance> {
  const balance = await ensureCreditBalance(userId);
  balance.balanceCents += amountCents;
  balance.lifetimeCreditsCents += amountCents;
  balance.updatedAt = iso();
  await db.creditBalances.put(balance);
  return balance;
}
