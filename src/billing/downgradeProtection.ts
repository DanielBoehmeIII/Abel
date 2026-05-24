import type { TierId } from './types';
import { TIERS } from './tiers';
import { getFeatureAccess } from './tiers';

export interface DowngradeImpact {
  featuresLost: string[];
  usageReductions: { label: string; from: string; to: string }[];
  dataPreserved: boolean;
  warning: string;
}

export function assessDowngradeImpact(
  currentTier: TierId,
  targetTier: TierId,
): DowngradeImpact {
  const currentFeatures = getFeatureAccess(currentTier);
  const targetFeatures = getFeatureAccess(targetTier);

  const featureLabels: Record<string, string> = {
    'advanced-graph': 'Advanced Knowledge Graph',
    'ai-assist-deep': 'Deep AI Assistance',
    'long-term-memory': 'Long-Term Memory',
    'multi-agent': 'Multi-Agent Orchestration',
    'export-systems': 'Export Systems',
    'collaboration': 'Collaboration Mode',
    'advanced-reasoning': 'Advanced Reasoning',
    'custom-models': 'Custom Model Support',
    'api-access': 'API Access',
    'priority-support': 'Priority Support',
  };

  const featuresLost = Object.keys(currentFeatures)
    .filter(k => currentFeatures[k as keyof typeof currentFeatures] && !targetFeatures[k as keyof typeof targetFeatures])
    .map(k => featureLabels[k] ?? k);

  const currentTierDef = TIERS[currentTier];
  const targetTierDef = TIERS[targetTier];

  const usageReductions: { label: string; from: string; to: string }[] = [];
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

  if (currentTierDef.includedUsage.inputTokens !== targetTierDef.includedUsage.inputTokens) {
    usageReductions.push({
      label: 'Input tokens/mo',
      from: fmt(currentTierDef.includedUsage.inputTokens),
      to: fmt(targetTierDef.includedUsage.inputTokens),
    });
  }
  if (currentTierDef.includedUsage.outputTokens !== targetTierDef.includedUsage.outputTokens) {
    usageReductions.push({
      label: 'Output tokens/mo',
      from: fmt(currentTierDef.includedUsage.outputTokens),
      to: fmt(targetTierDef.includedUsage.outputTokens),
    });
  }
  if (currentTierDef.includedUsage.aiRequests !== targetTierDef.includedUsage.aiRequests) {
    usageReductions.push({
      label: 'AI requests/mo',
      from: fmt(currentTierDef.includedUsage.aiRequests),
      to: fmt(targetTierDef.includedUsage.aiRequests),
    });
  }
  if (currentTierDef.includedUsage.graphNodes !== targetTierDef.includedUsage.graphNodes) {
    usageReductions.push({
      label: 'Graph nodes',
      from: fmt(currentTierDef.includedUsage.graphNodes),
      to: fmt(targetTierDef.includedUsage.graphNodes),
    });
  }

  const severity = featuresLost.length > 3 ? 'major' : featuresLost.length > 0 ? 'moderate' : 'minor';
  const warning = severity === 'major'
    ? `Downgrading will remove ${featuresLost.length} features and reduce your usage limits significantly. Your data will be preserved.`
    : severity === 'moderate'
      ? `Downgrading will reduce your usage limits. Some features will no longer be available.`
      : `Downgrading will reduce your usage limits. All data is preserved.`;

  return {
    featuresLost,
    usageReductions,
    dataPreserved: true,
    warning,
  };
}

export const DOWNGRADE_GRACE_PERIOD_DAYS = 7;

export function formatDowngradeWarning(impact: DowngradeImpact): string {
  const parts: string[] = [];
  if (impact.featuresLost.length > 0) {
    parts.push(`Features lost: ${impact.featuresLost.join(', ')}`);
  }
  for (const r of impact.usageReductions) {
    parts.push(`${r.label}: ${r.from} → ${r.to}`);
  }
  parts.push(impact.warning);
  return parts.join('\n');
}
