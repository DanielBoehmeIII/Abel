import type { TierDefinition, TierId, FeatureAccessMap } from './types';

export const TIERS: Record<TierId, TierDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    includedUsage: {
      inputTokens: 100_000,
      outputTokens: 50_000,
      cacheReads: 25_000,
      aiRequests: 100,
      graphNodes: 50,
      memoryEntries: 100,
      exportsPerMonth: 2,
    },
    rateLimits: { requestsPerMin: 3, requestsPerDay: 50, concurrentRequests: 1 },
    features: {
      'basic-chat': true,
      'basic-graph': true,
      'basic-memory': true,
      'basic-quests': true,
    },
    overageBehavior: 'block',
    overagePricing: {
      inputTokensPerMillion: 0,
      outputTokensPerMillion: 0,
      cacheReadsPerMillion: 0,
    },
    softCap: 100_000,
    hardCap: 100_000,
    rolloverCredits: false,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 1200, yearly: 12000 },
    includedUsage: {
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      cacheReads: 250_000,
      aiRequests: 1000,
      graphNodes: 200,
      memoryEntries: 500,
      exportsPerMonth: 10,
    },
    rateLimits: { requestsPerMin: 10, requestsPerDay: 500, concurrentRequests: 2 },
    features: {
      'basic-chat': true,
      'basic-graph': true,
      'basic-memory': true,
      'basic-quests': true,
      'focus-sessions': true,
      'skill-web': true,
      'data-export': true,
    },
    overageBehavior: 'meter',
    overagePricing: {
      inputTokensPerMillion: 300,
      outputTokensPerMillion: 1500,
      cacheReadsPerMillion: 100,
    },
    softCap: 2_000_000,
    hardCap: 5_000_000,
    rolloverCredits: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 3000, yearly: 30000 },
    includedUsage: {
      inputTokens: 5_000_000,
      outputTokens: 2_500_000,
      cacheReads: 1_000_000,
      aiRequests: 5000,
      graphNodes: 1000,
      memoryEntries: 2500,
      exportsPerMonth: 50,
    },
    rateLimits: { requestsPerMin: 30, requestsPerDay: 2500, concurrentRequests: 5 },
    features: {
      'basic-chat': true,
      'basic-graph': true,
      'basic-memory': true,
      'basic-quests': true,
      'focus-sessions': true,
      'skill-web': true,
      'data-export': true,
      'advanced-graph': true,
      'ai-assist-deep': true,
      'long-term-memory': true,
      'advanced-reasoning': true,
    },
    overageBehavior: 'meter',
    overagePricing: {
      inputTokensPerMillion: 250,
      outputTokensPerMillion: 1200,
      cacheReadsPerMillion: 75,
    },
    softCap: 10_000_000,
    hardCap: 25_000_000,
    rolloverCredits: true,
  },
  power: {
    id: 'power',
    name: 'Power',
    price: { monthly: 10000, yearly: 100000 },
    includedUsage: {
      inputTokens: 25_000_000,
      outputTokens: 12_500_000,
      cacheReads: 5_000_000,
      aiRequests: 25000,
      graphNodes: 5000,
      memoryEntries: 10000,
      exportsPerMonth: 200,
    },
    rateLimits: { requestsPerMin: 100, requestsPerDay: 10000, concurrentRequests: 10 },
    features: {
      'basic-chat': true,
      'basic-graph': true,
      'basic-memory': true,
      'basic-quests': true,
      'focus-sessions': true,
      'skill-web': true,
      'data-export': true,
      'advanced-graph': true,
      'ai-assist-deep': true,
      'long-term-memory': true,
      'advanced-reasoning': true,
      'multi-agent': true,
      'export-systems': true,
      'api-access': true,
    },
    overageBehavior: 'meter',
    overagePricing: {
      inputTokensPerMillion: 200,
      outputTokensPerMillion: 1000,
      cacheReadsPerMillion: 50,
    },
    softCap: 50_000_000,
    hardCap: 100_000_000,
    rolloverCredits: true,
  },
};

const ALL_FEATURE_KEYS: Array<keyof FeatureAccessMap> = [
  'basic-chat', 'basic-graph', 'basic-memory', 'basic-quests',
  'focus-sessions', 'skill-web', 'data-export',
  'advanced-graph', 'ai-assist-deep', 'long-term-memory',
  'multi-agent', 'export-systems',
  'advanced-reasoning', 'api-access',
];

export function getFeatureAccess(tierId: TierId): FeatureAccessMap {
  const t = TIERS[tierId];
  const map = {} as FeatureAccessMap;
  for (const key of ALL_FEATURE_KEYS) {
    map[key] = t.features[key] ?? false;
  }
  return map;
}

export function annualSavingsPct(tierId: TierId): number {
  const p = TIERS[tierId].price;
  if (p.monthly === 0) return 0;
  return Math.round((1 - p.yearly / (p.monthly * 12)) * 100);
}
