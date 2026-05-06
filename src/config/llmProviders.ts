import type { LLMProvider, Quest, Journey, ArchetypeProfile, MemoryItem } from '../types/abel';

export interface LLMProviderConfig {
  id: LLMProvider;
  name: string;
  description: string;
  status: 'configured' | 'not-configured' | 'mock';
  icon: string;
}

export const LLM_PROVIDERS: LLMProviderConfig[] = [
  { id: 'mock',    name: 'Mock Abel',    description: 'Built-in mock AI. No API key needed. Deterministic responses for demo.',   status: 'mock',           icon: '◈' },
  { id: 'claude',  name: 'Claude',       description: 'Anthropic Claude via API. Best for synthesis and deep reflection.',        status: 'not-configured', icon: '◉' },
  { id: 'chatgpt', name: 'ChatGPT',      description: 'OpenAI ChatGPT via API. Strong generalist reasoning and planning.',        status: 'not-configured', icon: '⊕' },
  { id: 'local',   name: 'Local Model',  description: 'Run a local LLM (Ollama etc.) for full privacy and offline use.',          status: 'not-configured', icon: '⬡' },
];

// ─── Mock responses ───────────────────────────────────────────────────────────

export function mockGenerateJourney(goal: string): Journey {
  return {
    id: `j-${Date.now()}`,
    title: `Journey: ${goal.slice(0, 40)}`,
    description: `A focused journey to develop mastery around: ${goal}`,
    goal,
    questIds: [],
    active: false,
    createdAt: new Date().toISOString(),
  };
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

export function mockSummarizeInsight(text: string): string {
  const words = text.split(' ').slice(0, 12).join(' ');
  return `Key insight: "${words}..." — This connects to your broader pattern of systems-oriented thinking.`;
}

export function mockUpdateArchetype(
  _memories: MemoryItem[],
  _quests: Quest[]
): Partial<ArchetypeProfile> {
  return {
    primary: 'The Architect',
    secondary: ['The Seeker', 'The Synthesist'],
    traits: {
      'Systems Orientation': 87,
      'Creative Depth': 74,
      'Reflective Capacity': 68,
      'Disciplined Action': 80,
      'Curiosity': 91,
      'Emotional Attunement': 52,
    },
  };
}

export function getMockAbelResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('quest') || msg.includes('generate')) {
    return `I'll generate quests based on your current journey. These will be added to your Quests tab momentarily.\n\nRemember: quests are designed to produce knowledge, not just activity. Each one feeds back into your graph and skill mastery.`;
  }
  if (msg.includes('archetype') || msg.includes('who am i')) {
    return `Based on your memories and quest completions, your primary archetype is **The Architect** — someone who builds systems, seeks clarity, and synthesizes complexity into structure.\n\nYour secondary archetypes are **The Seeker** and **The Synthesist**. Together, they suggest a mind that moves toward the root of things and finds meaning in connection.`;
  }
  if (msg.includes('memory') || msg.includes('remember')) {
    return `I can save this to your Memory Exhibition. Memories are more than logs — they're evidence of who you're becoming. Would you like me to tag this as a Breakthrough or Clarity moment?`;
  }
  if (msg.includes('graph') || msg.includes('insight')) {
    return `I'll save this as a graph node. Insights like this become the connective tissue of your knowledge system. Over time, the graph reveals patterns you didn't intend.`;
  }
  if (msg.includes('goal') || msg.includes('journey')) {
    return `Let's design a journey around this. A good journey has a clear arc: from where you are to where the work wants to take you. Tell me more about what outcome would feel like mastery to you.`;
  }
  return `I'm listening. The best way to use Archive is to think out loud — share a goal, a confusion, an insight, or a question. I'll help you turn it into structure: quests, graph nodes, memories, or a journey.`;
}
