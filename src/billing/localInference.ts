import type { ProviderName } from './types';

export interface LocalInferenceConfig {
  enabled: boolean;
  provider: ProviderName;
  baseUrl: string;
  modelName: string;
  maxTokens: number;
  capabilities: Array<'chat' | 'reasoning' | 'code'>;
}

export interface InferenceTask {
  feature: string;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTokens: number;
  canRunLocally: boolean;
}

export const LOCAL_INFERENCE_DEFAULTS: LocalInferenceConfig = {
  enabled: false,
  provider: 'local',
  baseUrl: 'http://localhost:11434',
  modelName: 'llama3.2',
  maxTokens: 4096,
  capabilities: ['chat', 'reasoning'],
};

export function shouldRunLocally(
  task: InferenceTask,
  config: LocalInferenceConfig,
): boolean {
  if (!config.enabled) return false;
  if (!task.canRunLocally) return false;
  if (task.estimatedTokens > config.maxTokens) return false;
  if (task.complexity === 'complex' && !config.capabilities.includes('reasoning')) return false;
  return true;
}

export function getLocalModels(): Array<{ name: string; description: string; recommendedFor: string[] }> {
  return [
    { name: 'llama3.2', description: 'Meta Llama 3.2 — good general-purpose', recommendedFor: ['chat', 'reflection', 'memory'] },
    { name: 'mistral', description: 'Mistral — strong reasoning for its size', recommendedFor: ['reasoning', 'chat', 'planning'] },
    { name: 'phi4', description: 'Phi-4 — compact but capable', recommendedFor: ['chat', 'code', 'analysis'] },
    { name: 'qwen2.5', description: 'Qwen 2.5 — strong multilingual and coding', recommendedFor: ['code', 'chat', 'reasoning'] },
  ];
}

export function estimateLocalCost(): number {
  return 0;
}

export function estimateCloudSavings(
  _taskTokens: number,
  cloudProvider: ProviderName,
  cloudModel: string,
): { centsSaved: number; pctSaved: number } {
  const cloudCost = estimateCloudTokenCost(cloudProvider, cloudModel);
  const centsSaved = Math.round(cloudCost * 100);
  return { centsSaved, pctSaved: 100 };
}

function estimateCloudTokenCost(_provider: ProviderName, model: string): number {
  const rates: Record<string, number> = {
    'claude-sonnet-4-20250514': 0.0003,
    'claude-haiku-3-5': 0.00008,
    'gpt-4o': 0.00025,
    'gpt-4o-mini': 0.000015,
  };
  return rates[model] ?? 0.0003;
}
