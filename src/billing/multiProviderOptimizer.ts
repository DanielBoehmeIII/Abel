import type { ProviderName } from './types';
import { estimateCostForTokens } from './providerAbstraction';

export type OptimizationGoal = 'cheapest' | 'fastest' | 'highest_quality' | 'balanced';
export type ProviderCapability = 'chat' | 'reasoning' | 'vision' | 'code' | 'long_context' | 'tool_use';

interface ProviderProfile {
  provider: ProviderName;
  models: Array<{
    name: string;
    capabilities: ProviderCapability[];
    costPerInputToken: number;
    costPerOutputToken: number;
    avgLatencyMs: number;
    qualityScore: number;
    maxContextTokens: number;
  }>;
  reliability: number;
  supportedFeatures: ProviderCapability[];
}

const PROVIDER_PROFILES: ProviderProfile[] = [
  {
    provider: 'claude',
    models: [
      { name: 'claude-haiku-3-5', capabilities: ['chat', 'reasoning', 'vision', 'tool_use'], costPerInputToken: 0.00008, costPerOutputToken: 0.0004, avgLatencyMs: 600, qualityScore: 7, maxContextTokens: 200_000 },
      { name: 'claude-sonnet-4-20250514', capabilities: ['chat', 'reasoning', 'vision', 'code', 'tool_use'], costPerInputToken: 0.0003, costPerOutputToken: 0.0015, avgLatencyMs: 1000, qualityScore: 9, maxContextTokens: 200_000 },
      { name: 'claude-opus-4', capabilities: ['chat', 'reasoning', 'vision', 'code', 'tool_use', 'long_context'], costPerInputToken: 0.0015, costPerOutputToken: 0.0075, avgLatencyMs: 2000, qualityScore: 10, maxContextTokens: 200_000 },
    ],
    reliability: 0.99,
    supportedFeatures: ['chat', 'reasoning', 'vision', 'code', 'tool_use'],
  },
  {
    provider: 'chatgpt',
    models: [
      { name: 'gpt-4o-mini', capabilities: ['chat', 'reasoning', 'vision', 'code'], costPerInputToken: 0.000015, costPerOutputToken: 0.00006, avgLatencyMs: 500, qualityScore: 6, maxContextTokens: 128_000 },
      { name: 'gpt-4o', capabilities: ['chat', 'reasoning', 'vision', 'code', 'tool_use'], costPerInputToken: 0.00025, costPerOutputToken: 0.001, avgLatencyMs: 800, qualityScore: 8, maxContextTokens: 128_000 },
    ],
    reliability: 0.98,
    supportedFeatures: ['chat', 'reasoning', 'vision', 'code', 'tool_use'],
  },
  {
    provider: 'gemini',
    models: [
      { name: 'gemini-2.0-pro', capabilities: ['chat', 'reasoning', 'vision', 'code', 'long_context', 'tool_use'], costPerInputToken: 0.0002, costPerOutputToken: 0.0006, avgLatencyMs: 700, qualityScore: 8, maxContextTokens: 1_000_000 },
    ],
    reliability: 0.97,
    supportedFeatures: ['chat', 'reasoning', 'vision', 'code', 'tool_use'],
  },
  {
    provider: 'local',
    models: [
      { name: 'local-model', capabilities: ['chat', 'reasoning'], costPerInputToken: 0, costPerOutputToken: 0, avgLatencyMs: 1500, qualityScore: 4, maxContextTokens: 32_000 },
    ],
    reliability: 0.95,
    supportedFeatures: ['chat', 'reasoning'],
  },
  {
    provider: 'mock',
    models: [
      { name: 'mock', capabilities: ['chat'], costPerInputToken: 0, costPerOutputToken: 0, avgLatencyMs: 10, qualityScore: 3, maxContextTokens: 4_000 },
    ],
    reliability: 1,
    supportedFeatures: ['chat'],
  },
];

export function findOptimalProvider(
  goal: OptimizationGoal,
  requiredCapabilities: ProviderCapability[],
  estimatedInputTokens: number,
  preferredProviders?: ProviderName[],
): { provider: ProviderName; model: string; estimatedCostCents: number; estimatedLatencyMs: number; qualityScore: number } {
  let profiles = PROVIDER_PROFILES;

  if (preferredProviders && preferredProviders.length > 0) {
    profiles = profiles.filter(p => preferredProviders.includes(p.provider));
  }

  const candidates = profiles.flatMap(profile =>
    profile.models
      .filter(model =>
        requiredCapabilities.every(cap => model.capabilities.includes(cap)) &&
        model.maxContextTokens >= estimatedInputTokens
      )
      .map(model => ({
        provider: profile.provider,
        model: model.name,
        cost: estimateCostForTokens(model.name, estimatedInputTokens, Math.round(estimatedInputTokens * 0.3)),
        latencyMs: model.avgLatencyMs,
        qualityScore: model.qualityScore,
        reliability: profile.reliability,
      }))
  );

  if (candidates.length === 0) {
    return { provider: 'mock', model: 'mock', estimatedCostCents: 0, estimatedLatencyMs: 10, qualityScore: 3 };
  }

  switch (goal) {
    case 'cheapest':
      candidates.sort((a, b) => a.cost - b.cost);
      break;
    case 'fastest':
      candidates.sort((a, b) => a.latencyMs - b.latencyMs);
      break;
    case 'highest_quality':
      candidates.sort((a, b) => b.qualityScore - a.qualityScore);
      break;
    case 'balanced':
      candidates.sort((a, b) => (a.cost * 0.4 + a.latencyMs * 0.3 - a.qualityScore * 10) - (b.cost * 0.4 + b.latencyMs * 0.3 - b.qualityScore * 10));
      break;
  }

  const best = candidates[0];
  return {
    provider: best.provider,
    model: best.model,
    estimatedCostCents: Math.round(best.cost * 100),
    estimatedLatencyMs: best.latencyMs,
    qualityScore: best.qualityScore,
  };
}

export function getFallbackChain(primaryProvider: ProviderName): ProviderName[] {
  const order: Record<ProviderName, ProviderName[]> = {
    claude: ['claude', 'chatgpt', 'gemini', 'mock'],
    chatgpt: ['chatgpt', 'claude', 'gemini', 'mock'],
    gemini: ['gemini', 'claude', 'chatgpt', 'mock'],
    local: ['local', 'mock'],
    mock: ['mock'],
  };
  return order[primaryProvider] ?? [...new Set([primaryProvider, ...Object.keys(order).filter(k => k !== primaryProvider)])] as ProviderName[];
}
