import type { UsageEvent, UsageEventType, ProviderName } from './types';
import { computeEventCost } from './costEngine';
import { db } from '../db';
import type { TokenUsageRecord } from './types';

const iso = () => new Date().toISOString();
const dateStr = () => new Date().toISOString().slice(0, 10);
let eventCounter = 0;

export function createUsageEvent(params: {
  userId: string;
  type: UsageEventType;
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  latencyMs?: number;
  projectId?: string;
  sessionId?: string;
  featureUsed?: string;
  streamed?: boolean;
  toolCalls?: number;
  imageCount?: number;
}): UsageEvent {
  eventCounter++;
  const cost = computeEventCost({
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cacheReadTokens: params.cacheReadTokens ?? 0,
    cacheWriteTokens: params.cacheWriteTokens ?? 0,
    model: params.model,
    imageCount: params.imageCount ?? 0,
    toolCalls: params.toolCalls ?? 0,
  });
  return {
    id: `ue-${Date.now()}-${eventCounter}`,
    userId: params.userId,
    type: params.type,
    provider: params.provider,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cacheReadTokens: params.cacheReadTokens ?? 0,
    cacheWriteTokens: params.cacheWriteTokens ?? 0,
    estimatedProviderCost: cost.totalCents,
    estimatedRevenue: 0,
    latencyMs: params.latencyMs ?? 0,
    projectId: params.projectId,
    sessionId: params.sessionId,
    featureUsed: params.featureUsed,
    streamed: params.streamed ?? false,
    toolCalls: params.toolCalls ?? 0,
    imageCount: params.imageCount ?? 0,
    createdAt: iso(),
  };
}

const usageBuffer: UsageEvent[] = [];

export function recordUsageEvent(event: UsageEvent): void {
  usageBuffer.push(event);
  if (usageBuffer.length >= 10) {
    flushUsageBuffer();
  }
}

export async function flushUsageBuffer(): Promise<void> {
  if (usageBuffer.length === 0) return;
  const batch = usageBuffer.splice(0);
  await db.usageEvents.bulkAdd(batch as never[]);
}

export async function getUsageForPeriod(
  userId: string,
  since: string,
): Promise<UsageEvent[]> {
  return db.usageEvents
    .where('userId')
    .equals(userId)
    .filter(e => e.createdAt >= since)
    .toArray() as Promise<UsageEvent[]>;
}

export async function getUsageForToday(userId: string): Promise<UsageEvent[]> {
  const today = dateStr();
  return db.usageEvents
    .where('userId')
    .equals(userId)
    .filter(e => e.createdAt.startsWith(today))
    .toArray() as Promise<UsageEvent[]>;
}

export async function getDailyTokenUsage(userId: string, since: string): Promise<TokenUsageRecord[]> {
  const events = await getUsageForPeriod(userId, since);
  const byDate = new Map<string, TokenUsageRecord>();
  for (const e of events) {
    const day = e.createdAt.slice(0, 10);
    const existing = byDate.get(day) ?? {
      id: `tu-${userId}-${day}`,
      userId,
      date: day,
      tierId: 'free' as const,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      aiRequests: 0,
    };
    existing.inputTokens += e.inputTokens;
    existing.outputTokens += e.outputTokens;
    existing.cacheReadTokens += e.cacheReadTokens;
    existing.cacheWriteTokens += e.cacheWriteTokens;
    existing.aiRequests++;
    byDate.set(day, existing);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTotalUsageThisPeriod(userId: string, periodStart: string): Promise<{
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  aiRequests: number;
}> {
  const events = await getUsageForPeriod(userId, periodStart);
  let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, aiRequests = 0;
  for (const e of events) {
    inputTokens += e.inputTokens;
    outputTokens += e.outputTokens;
    cacheReadTokens += e.cacheReadTokens;
    aiRequests++;
  }
  return { inputTokens, outputTokens, cacheReadTokens, aiRequests };
}

declare module '../db/db' {
  interface AbelDatabase {
    usageEvents: import('dexie').Table<UsageEvent, string>;
    tokenUsage: import('dexie').Table<TokenUsageRecord, string>;
  }
}
