import { db } from '../db';

const iso = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  code: string;
  status: 'pending' | 'converted' | 'rewarded';
  rewardCents: number;
  rewardDescription: string;
  createdAt: string;
  convertedAt?: string;
  rewardedAt?: string;
}

export const REFERRAL_REWARD_CENTS = 1000;
export const REFERRAL_TRIAL_DAYS = 14;
export const REFERRAL_REWARD_DESCRIPTION = 'Free 1,000¢ AI usage credit';

export async function generateReferralCode(userId: string): Promise<string> {
  const existing = await db.table('referralCodes').where('userId').equals(userId).first() as ReferralCode | undefined;
  if (existing) return existing.code;
  const code = `ABEL-${userId.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await db.table('referralCodes').put({ id: `rc-${uid()}`, userId, code, createdAt: iso() });
  return code;
}

export async function applyReferralCode(referredUserId: string, code: string): Promise<{ referrerUserId: string; rewardCents: number } | null> {
  const refCode = await db.table('referralCodes').where('code').equals(code).first() as ReferralCode | undefined;
  if (!refCode || refCode.userId === referredUserId) return null;

  const existingReferral = await db.table('referrals')
    .where('referredUserId').equals(referredUserId)
    .first() as Referral | undefined;
  if (existingReferral) return null;

  const referral: Referral = {
    id: `ref-${uid()}`,
    referrerUserId: refCode.userId,
    referredUserId,
    code,
    status: 'pending',
    rewardCents: REFERRAL_REWARD_CENTS,
    rewardDescription: REFERRAL_REWARD_DESCRIPTION,
    createdAt: iso(),
  };
  await db.table('referrals').put(referral);
  return { referrerUserId: refCode.userId, rewardCents: REFERRAL_REWARD_CENTS };
}

export async function convertReferral(referredUserId: string): Promise<void> {
  const existing = await db.table('referrals').where('referredUserId').equals(referredUserId).first() as Referral | undefined;
  if (!existing || existing.status !== 'pending') return;
  existing.status = 'converted';
  existing.convertedAt = iso();
  await db.table('referrals').put(existing);
}

export async function rewardReferrer(referralId: string): Promise<void> {
  const ref = await db.table('referrals').get(referralId) as Referral | undefined;
  if (!ref || ref.status !== 'converted') return;
  ref.status = 'rewarded';
  ref.rewardedAt = iso();
  await db.table('referrals').put(ref);
}

declare module '../db/db' {
  interface AbelDatabase {
    referralCodes: import('dexie').Table<ReferralCode, string>;
    referrals: import('dexie').Table<Referral, string>;
  }
}
