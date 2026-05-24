import type { ProviderName } from './types';
import { TIERS } from './tiers';
import type { TierId } from './types';
import { estimateCostForTokens } from './providerAbstraction';

export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'critical';
export type TaskCategory = 'chat' | 'reasoning' | 'memory' | 'graph' | 'quest' | 'focus' | 'export' | 'agent';

export interface RoutingDecision {
  provider: ProviderName;
  model: string;
  reason: string;
  estimatedCostCents: number;
}

interface ModelOption {
  provider: ProviderName;
  model: string;
  maxTokens: number;
  suitableFor: TaskComplexity[];
  costPerRequest: number;
  latencyMs: number;
}

const MODEL_CATALOG: ModelOption[] = [
  { provider: 'chatgpt', model: 'gpt-4o-mini', maxTokens: 128_000, suitableFor: ['simple', 'moderate'], costPerRequest: 0.15, latencyMs: 500 },
  { provider: 'chatgpt', model: 'gpt-4o', maxTokens: 128_000, suitableFor: ['moderate', 'complex'], costPerRequest: 2.5, latencyMs: 800 },
  { provider: 'claude', model: 'claude-haiku-3-5', maxTokens: 200_000, suitableFor: ['simple', 'moderate'], costPerRequest: 0.25, latencyMs: 600 },
  { provider: 'claude', model: 'claude-sonnet-4-20250514', maxTokens: 200_000, suitableFor: ['moderate', 'complex'], costPerRequest: 3.0, latencyMs: 1000 },
  { provider: 'claude', model: 'claude-opus-4', maxTokens: 200_000, suitableFor: ['complex', 'critical'], costPerRequest: 15.0, latencyMs: 2000 },
  { provider: 'gemini', model: 'gemini-2.0-pro', maxTokens: 1_000_000, suitableFor: ['moderate', 'complex'], costPerRequest: 2.0, latencyMs: 700 },
];

export function routeRequest(
  tierId: TierId,
  _category: TaskCategory,
  complexity: TaskComplexity,
  estimatedInputTokens: number,
  allowedProviders: ProviderName[],
): RoutingDecision {
  const tier = TIERS[tierId];
  const usageRatio = estimatedInputTokens / (tier.includedUsage.inputTokens / 30);
  const isNearLimit = usageRatio > 0.8;

  const candidates = MODEL_CATALOG.filter(m =>
    m.suitableFor.includes(complexity) &&
    allowedProviders.includes(m.provider)
  );

  if (candidates.length === 0) {
    return {
      provider: allowedProviders[0] ?? 'mock',
      model: 'fallback',
      reason: 'No suitable model found, using fallback',
      estimatedCostCents: 0,
    };
  }

  if (isNearLimit || tierId === 'free' || tierId === 'starter') {
    candidates.sort((a, b) => a.costPerRequest - b.costPerRequest);
  } else {
    candidates.sort((a, b) => {
      if (complexity === 'critical') return b.maxTokens - a.maxTokens;
      if (complexity === 'complex') return a.latencyMs - b.latencyMs;
      return a.costPerRequest - b.costPerRequest;
    });
  }

  const chosen = candidates[0];
  const cost = estimateCostForTokens(chosen.model, estimatedInputTokens, estimatedInputTokens * 0.3);

  return {
    provider: chosen.provider,
    model: chosen.model,
    reason: isNearLimit
      ? `Near usage limit — routed to cheapest suitable model (${chosen.model})`
      : `Routed to ${chosen.model} (${complexity} task, ${tierId} tier)`,
    estimatedCostCents: Math.round(cost * 100),
  };
}

export function getCostOptimization(
  tierId: TierId,
  _category: TaskCategory,
  estimatedTokens: number,
  _currentProvider: ProviderName,
  currentModel: string,
): { recommended: RoutingDecision | null; savingsCents: number } {
  const allowed: ProviderName[] = ['claude', 'chatgpt', 'gemini'];
  const ideal = routeRequest(tierId, _category, 'simple', estimatedTokens, allowed);
  const currentCost = estimateCostForTokens(currentModel, estimatedTokens, estimatedTokens * 0.3);
  const idealCost = estimateCostForTokens(ideal.model, estimatedTokens, estimatedTokens * 0.3);

  if (idealCost < currentCost) {
    return { recommended: ideal, savingsCents: Math.round((currentCost - idealCost) * 100) };
  }
  return { recommended: null, savingsCents: 0 };
}
