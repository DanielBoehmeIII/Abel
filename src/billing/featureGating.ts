import type { TierId, FeatureAccessMap } from './types';
import { getFeatureAccess } from './tiers';

export function checkFeatureAccess(
  feature: keyof FeatureAccessMap,
  userTier: TierId,
): boolean {
  const access = getFeatureAccess(userTier);
  return access[feature] ?? false;
}

export function getRequiredTier(feature: keyof FeatureAccessMap): TierId {
  const tierLevels: Array<{ tier: TierId; features: Array<keyof FeatureAccessMap> }> = [
    { tier: 'free', features: [] },
    { tier: 'starter', features: ['basic-chat', 'basic-graph', 'basic-memory', 'basic-quests', 'focus-sessions', 'skill-web', 'data-export'] },
    { tier: 'pro', features: ['advanced-graph', 'ai-assist-deep', 'long-term-memory', 'advanced-reasoning'] },
    { tier: 'power', features: ['multi-agent', 'export-systems', 'api-access'] },
  ];

  for (let i = tierLevels.length - 1; i >= 0; i--) {
    if (tierLevels[i].features.includes(feature)) {
      return tierLevels[i].tier;
    }
  }
  return 'power';
}

export function getAccessibleFeatures(tierId: TierId): Array<{ key: string; label: string; available: boolean }> {
  const access = getFeatureAccess(tierId);
  const labels: Record<string, string> = {
    'advanced-graph': 'Advanced Knowledge Graph',
    'ai-assist-deep': 'Deep AI Assistance',
    'long-term-memory': 'Long-Term Memory',
    'multi-agent': 'Multi-Agent Orchestration',
    'export-systems': 'Export Systems',
    'advanced-reasoning': 'Advanced Reasoning',
    'api-access': 'API Access',
  };

  return Object.entries(access).map(([key, available]) => ({
    key,
    label: labels[key] ?? key,
    available,
  }));
}

export function getUpgradeSuggestions(tierId: TierId): Array<{ feature: string; requiredTier: TierId; label: string }> {
  const all: Array<{ feature: keyof FeatureAccessMap; tier: TierId; label: string }> = [
    { feature: 'advanced-graph', tier: 'pro', label: 'Advanced Knowledge Graph' },
    { feature: 'ai-assist-deep', tier: 'pro', label: 'Deep AI Assistance' },
    { feature: 'long-term-memory', tier: 'pro', label: 'Long-Term Memory' },
    { feature: 'advanced-reasoning', tier: 'pro', label: 'Advanced Reasoning' },
    { feature: 'multi-agent', tier: 'power', label: 'Multi-Agent Orchestration' },
    { feature: 'export-systems', tier: 'power', label: 'Export Systems' },
    { feature: 'api-access', tier: 'power', label: 'API Access' },
  ];

  const currentAccess = getFeatureAccess(tierId);
  return all
    .filter(f => !currentAccess[f.feature])
    .map(f => ({ feature: f.label, requiredTier: f.tier, label: f.label }));
}
