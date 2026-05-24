import { db } from '../db';
import type { UsageEvent } from './types';

export interface AbuseCheckResult {
  flagged: boolean;
  reasons: string[];
  cooldownMs: number;
}

const requestCounts = new Map<string, { count: number; windowStart: number }>();
const SPAM_THRESHOLD = 60;
const FARMING_THRESHOLD = 300;
const COOLDOWN_MS = 60_000;
const WINDOW_MS = 60_000;

export function checkAbuse(userId: string, event: Pick<UsageEvent, 'type' | 'inputTokens' | 'latencyMs'>): AbuseCheckResult {
  const reasons: string[] = [];
  const now = Date.now();
  const key = `${userId}`;

  const windowData = requestCounts.get(key) ?? { count: 0, windowStart: now };
  if (now - windowData.windowStart > WINDOW_MS) {
    windowData.count = 0;
    windowData.windowStart = now;
  }
  windowData.count++;
  requestCounts.set(key, windowData);

  if (windowData.count > FARMING_THRESHOLD) {
    reasons.push('Excessive automation detected — request volume exceeds farming threshold');
  } else if (windowData.count > SPAM_THRESHOLD) {
    reasons.push('Spam detection — unusually high request rate');
  }

  if (event.type === 'chat' && event.inputTokens < 5 && windowData.count > 20) {
    reasons.push('Suspicious pattern: repeated empty or near-empty requests');
  }

  if (event.latencyMs < 10 && windowData.count > 10) {
    reasons.push('Unnatural request timing — possible automated tooling');
  }

  const cooldownMs = reasons.length > 0 ? COOLDOWN_MS : 0;

  return {
    flagged: reasons.length > 0,
    reasons,
    cooldownMs,
  };
}

export function clearRateWindow(userId: string): void {
  requestCounts.delete(userId);
}

export async function getAbuseHistory(userId: string, since: string): Promise<number> {
  const recent = await db.usageEvents
    .where('userId')
    .equals(userId)
    .filter(e => e.createdAt >= since)
    .toArray() as UsageEvent[];
  return recent.length;
}
