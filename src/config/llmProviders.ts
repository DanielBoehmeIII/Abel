import type { LLMProvider, Quest } from '../types/abel';

export interface LLMProviderConfig {
  id: LLMProvider;
  name: string;
  description: string;
  icon: string;
  recommended?: boolean;
}

export const LLM_PROVIDERS: LLMProviderConfig[] = [
  { id: 'claude',  name: 'Claude',       description: 'Anthropic Claude via API. Best for synthesis and deep reflection.',        icon: '◉', recommended: true },
  { id: 'chatgpt', name: 'ChatGPT',      description: 'OpenAI ChatGPT via API. Strong generalist reasoning and planning.',        icon: '⊕' },
  { id: 'local',   name: 'Local Model',  description: 'Run a local LLM (Ollama etc.) for full privacy and offline use.',          icon: '⬡' },
  { id: 'mock',    name: 'Mock Abel',    description: 'Built-in offline simulation. No API key needed. Deterministic responses.', icon: '◈' },
];

export function getProviderStatus(
  providerId: LLMProvider,
  aiCfg: { provider?: LLMProvider; apiKeyConfigured?: boolean; baseUrl?: string } | null,
): 'active' | 'configured' | 'not-configured' | 'mock' {
  if (providerId === 'mock') return 'mock';
  if (!aiCfg || aiCfg.provider !== providerId) return 'not-configured';
  if (providerId === 'local') return aiCfg.baseUrl ? 'configured' : 'not-configured';
  return aiCfg.apiKeyConfigured ? 'configured' : 'not-configured';
}

export function mockGenerateQuests(journeyId: string, goal: string): Partial<Quest>[] {
  const templates = [
    { title: `Research the foundations of "${goal.slice(0, 30)}"`, type: 'knowledge' as const, difficulty: 2 as const },
    { title: `Complete a 90-minute focus session on this goal`, type: 'focus' as const, difficulty: 2 as const },
    { title: `Write a reflection on what you already know`, type: 'reflection' as const, difficulty: 1 as const },
    { title: `Build one artifact that demonstrates understanding`, type: 'skill' as const, difficulty: 3 as const },
    { title: `Save a key insight to the knowledge graph`, type: 'knowledge' as const, difficulty: 2 as const },
  ];
  return templates.map((t, i) => ({
    id: `q-gen-${Date.now()}-${i}`,
    journeyId,
    status: i === 0 ? 'available' : 'locked' as const,
    source: 'archive' as const,
    whyItMatters: 'Understanding this deeply will compound over time.',
    linkedSkillIds: [],
    linkedGraphNodeIds: [],
    rewards: { xp: 100, skillIds: [], skillMastery: 8 },
    ...t,
    description: `${t.title}. Take your time — quality over speed.`,
  }));
}
