import type { TierId } from './types';
import { db } from '../db';

const iso = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface Trial {
  id: string;
  userId: string;
  tierId: TierId;
  startedAt: string;
  endsAt: string;
  convertedAt?: string;
  status: 'active' | 'expired' | 'converted';
}

export const TRIAL_DURATION_DAYS = 7;
export const TRIAL_USAGE_LIMIT_TOKENS = 50_000;
export const TRIAL_USAGE_LIMIT_REQUESTS = 50;

export function getTrialTier(): TierId {
  return 'pro';
}

export function getTrialDurationDays(): number {
  return TRIAL_DURATION_DAYS;
}

export async function startTrial(userId: string): Promise<Trial> {
  const now = new Date();
  const ends = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const trial: Trial = {
    id: `trial-${uid()}`,
    userId,
    tierId: getTrialTier(),
    startedAt: iso(),
    endsAt: ends.toISOString(),
    status: 'active',
  };
  await db.table('trials').put(trial);
  return trial;
}

export async function getActiveTrial(userId: string): Promise<Trial | undefined> {
  const trials = await db.table('trials')
    .where('userId').equals(userId)
    .filter(t => t.status === 'active' || t.status === 'converted')
    .toArray() as Trial[];
  return trials.find(t => t.status === 'active' && new Date(t.endsAt) > new Date());
}

export async function hasTrialBeenUsed(userId: string): Promise<boolean> {
  const trials = await db.table('trials').where('userId').equals(userId).toArray() as Trial[];
  return trials.length > 0;
}

export async function convertTrial(userId: string): Promise<void> {
  const trial = await getActiveTrial(userId);
  if (!trial) return;
  trial.status = 'converted';
  trial.convertedAt = iso();
  await db.table('trials').put(trial);
}

export async function expireTrials(): Promise<number> {
  const active = await db.table('trials').where('status').equals('active').toArray() as Trial[];
  const now = new Date();
  let expired = 0;
  for (const t of active) {
    if (new Date(t.endsAt) < now) {
      t.status = 'expired';
      await db.table('trials').put(t);
      expired++;
    }
  }
  return expired;
}

export function getTrialRemainingDays(trial: Trial): number {
  const diff = new Date(trial.endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getTrialConversionPct(usageThisPeriod: { inputTokens: number; aiRequests: number }): number {
  const inputPct = Math.min(100, (usageThisPeriod.inputTokens / TRIAL_USAGE_LIMIT_TOKENS) * 100);
  const requestPct = Math.min(100, (usageThisPeriod.aiRequests / TRIAL_USAGE_LIMIT_REQUESTS) * 100);
  return Math.round(Math.min(100, Math.max(inputPct, requestPct)));
}

declare module '../db/db' {
  interface AbelDatabase {
    trials: import('dexie').Table<Trial, string>;
  }
}
