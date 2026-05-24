import type { UsageEvent } from './types';

interface CacheEntry {
  key: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: number;
  expiresAt: number;
  hits: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 500;

export function getCacheKey(provider: string, model: string, systemPrompt: string, messages: string): string {
  const hash = simpleHash(`${provider}:${model}:${systemPrompt}:${messages}`);
  return hash;
}

export function checkCache(cacheKey: string): { hit: boolean; response?: string; inputTokens?: number; outputTokens?: number } {
  const entry = responseCache.get(cacheKey);
  if (!entry) return { hit: false };
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(cacheKey);
    return { hit: false };
  }
  entry.hits++;
  return {
    hit: true,
    response: entry.response,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
  };
}

export function setCache(
  cacheKey: string,
  response: string,
  inputTokens: number,
  outputTokens: number,
  ttlMs: number = CACHE_TTL_MS,
): void {
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const oldest = responseCache.entries().next().value;
    if (oldest) responseCache.delete(oldest[0]);
  }
  responseCache.set(cacheKey, {
    key: cacheKey,
    response,
    inputTokens,
    outputTokens,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    hits: 1,
  });
}

export function getCacheStats(): { size: number; totalHits: number; hitRate: number } {
  let totalHits = 0;
  for (const entry of responseCache.values()) {
    totalHits += entry.hits;
  }
  return {
    size: responseCache.size,
    totalHits,
    hitRate: responseCache.size > 0 ? totalHits / responseCache.size : 0,
  };
}

export function clearCache(): void {
  responseCache.clear();
}

export function isCacheable(event: Pick<UsageEvent, 'type' | 'streamed' | 'toolCalls' | 'imageCount'>): boolean {
  if (event.type !== 'chat') return false;
  if (event.streamed) return false;
  if ((event.toolCalls ?? 0) > 0) return false;
  if ((event.imageCount ?? 0) > 0) return false;
  return true;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `c-${Math.abs(hash).toString(36)}`;
}
