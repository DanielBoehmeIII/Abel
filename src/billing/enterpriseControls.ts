import type { ProviderName } from './types';
import { db } from '../db';

const iso = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface EnterpriseContract {
  id: string;
  organizationId: string;
  customPricing: { inputPerMillion: number; outputPerMillion: number };
  hardSpendingCapCents: number;
  invoiceBilling: boolean;
  dedicatedQuotas: { maxUsers: number; maxProjects: number; storageGb: number };
  providerRestrictions: ProviderName[];
  contractStart: string;
  contractEnd: string;
  createdAt: string;
}

export interface SpendingCap {
  id: string;
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  capCents: number;
  currentSpendCents: number;
  resetAt: string;
}

export async function setHardSpendingCap(userId: string, capCents: number, period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<SpendingCap> {
  const cap: SpendingCap = {
    id: `cap-${uid()}`,
    userId,
    period,
    capCents,
    currentSpendCents: 0,
    resetAt: iso(),
  };
  await db.table('spendingCaps').put(cap);
  return cap;
}

export async function checkSpendingCap(userId: string, costCents: number): Promise<{ allowed: boolean; remainingCents: number }> {
  const caps = await db.table('spendingCaps').where('userId').equals(userId).toArray() as SpendingCap[];
  for (const cap of caps) {
    if (cap.currentSpendCents + costCents > cap.capCents) {
      return { allowed: false, remainingCents: Math.max(0, cap.capCents - cap.currentSpendCents) };
    }
  }
  return { allowed: true, remainingCents: Infinity };
}

export async function recordSpend(userId: string, costCents: number): Promise<void> {
  const caps = await db.table('spendingCaps').where('userId').equals(userId).toArray() as SpendingCap[];
  for (const cap of caps) {
    cap.currentSpendCents += costCents;
    await db.table('spendingCaps').put(cap);
  }
}

export async function createEnterpriseContract(params: Omit<EnterpriseContract, 'id' | 'createdAt'>): Promise<EnterpriseContract> {
  const contract: EnterpriseContract = { ...params, id: `ec-${uid()}`, createdAt: iso() };
  await db.table('enterpriseContracts').put(contract);
  return contract;
}

export async function getProviderRestrictions(userId: string): Promise<ProviderName[]> {
  const orgs = await db.table('enterpriseContracts').where('organizationId').equals(userId).toArray() as EnterpriseContract[];
  if (orgs.length === 0) return [];
  return orgs[0].providerRestrictions;
}

export async function isProviderAllowed(userId: string, provider: ProviderName): Promise<boolean> {
  const restrictions = await getProviderRestrictions(userId);
  if (restrictions.length === 0) return true;
  return restrictions.includes(provider);
}

declare module '../db/db' {
  interface AbelDatabase {
    spendingCaps: import('dexie').Table<SpendingCap, string>;
    enterpriseContracts: import('dexie').Table<EnterpriseContract, string>;
  }
}
