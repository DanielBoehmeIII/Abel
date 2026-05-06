import type {
  AbelState, Quest, SkillNode, Egg, Trophy, MemoryItem,
  ActivityItem, FocusSession, EggType, TrophyModelType, TrophyRarity,
} from '../types/abel';

const iso = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const MILESTONES: Array<20 | 40 | 60 | 80 | 100> = [20, 40, 60, 80, 100];

// ─── Egg type from skill category ─────────────────────────────────────────────

function eggTypeForSkill(skill: SkillNode): EggType {
  const map: Record<string, EggType> = {
    'Discipline': 'discipline',
    'Creativity': 'creative',
    'Learning': 'knowledge',
    'Systems Thinking': 'knowledge',
    'Technical Skill': 'knowledge',
    'Emotional Clarity': 'memory',
    'Communication': 'archive',
    'Focus': 'discipline',
  };
  return map[skill.category] ?? 'knowledge';
}

// ─── Trophy spec for egg milestone ────────────────────────────────────────────

function trophySpecForEgg(
  egg: Egg,
  skill: SkillNode
): { name: string; description: string; originStory: string; rarity: TrophyRarity; modelType: TrophyModelType; color: string; glowColor: string } {
  const milestone = egg.milestone;
  const rarityMap: Record<number, TrophyRarity> = { 20: 'common', 40: 'common', 60: 'rare', 80: 'mythic', 100: 'legendary' };
  const modelMap: Record<EggType, TrophyModelType> = {
    discipline: 'artifact', creative: 'creature', knowledge: 'orb',
    memory: 'totem', archive: 'cube', focus: 'orb', archetype: 'mask',
  };
  const colorMap: Record<EggType, [string, string]> = {
    discipline: ['#7c4dff', 'rgba(124,77,255,0.5)'],
    creative:   ['#f5c518', 'rgba(245,197,24,0.35)'],
    knowledge:  ['#00d4ff', 'rgba(0,212,255,0.4)'],
    memory:     ['#e879a0', 'rgba(232,121,160,0.35)'],
    archive:    ['#a78bfa', 'rgba(167,139,250,0.35)'],
    focus:      ['#34d399', 'rgba(52,211,153,0.35)'],
    archetype:  ['#fb923c', 'rgba(251,146,60,0.35)'],
  };

  const [color, glowColor] = colorMap[egg.type];

  return {
    name: `${skill.name} Fragment ${milestone / 20}`,
    description: `A milestone artifact from ${skill.name} at ${milestone}% mastery.`,
    originStory: `Hatched when ${skill.name} reached ${milestone}% mastery during the journey toward Clarity Over Noise.`,
    rarity: rarityMap[milestone] ?? 'common',
    modelType: modelMap[egg.type] ?? 'orb',
    color,
    glowColor,
  };
}

// ─── completeQuest ────────────────────────────────────────────────────────────

export function completeQuest(state: AbelState, questId: string): AbelState {
  const quest = state.quests.find(q => q.id === questId);
  if (!quest || quest.status === 'completed') return state;

  let newState = {
    ...state,
    quests: state.quests.map(q =>
      q.id === questId ? { ...q, status: 'completed' as const, completedAt: iso() } : q
    ),
  };

  // unlock next available quest in same journey
  const journeyQuests = newState.quests.filter(q => q.journeyId === quest.journeyId);
  const firstLocked = journeyQuests.find(q => q.status === 'locked');
  if (firstLocked) {
    newState = {
      ...newState,
      quests: newState.quests.map(q =>
        q.id === firstLocked.id ? { ...q, status: 'available' as const } : q
      ),
    };
  }

  // add graph nodes from quest
  for (const nodeId of quest.linkedGraphNodeIds) {
    if (!newState.graph.nodes.find(n => n.id === nodeId)) {
      newState = addGraphNodeFromQuest(newState, quest, nodeId);
    }
  }

  // increase skill mastery for each rewarded skill
  for (const skillId of quest.rewards.skillIds) {
    newState = increaseSkillMastery(newState, skillId, quest.rewards.skillMastery);
  }

  // create a memory if it's a reflection or memory quest
  if (quest.type === 'reflection' || quest.type === 'memory') {
    const memory: MemoryItem = {
      id: `m-${uid()}`,
      title: `Reflection: ${quest.title}`,
      body: quest.whyItMatters,
      source: 'quest',
      subtypes: ['clarity'],
      relatedGraphNodeIds: quest.linkedGraphNodeIds,
      relatedTrophyIds: [],
      createdAt: iso(),
    };
    newState = { ...newState, memories: [...newState.memories, memory] };
  }

  const activity: ActivityItem = {
    id: `a-${uid()}`,
    type: 'quest_complete',
    title: quest.title,
    description: `Quest completed: ${quest.type}`,
    relatedId: questId,
    createdAt: iso(),
  };
  newState = { ...newState, recentActivity: [activity, ...newState.recentActivity].slice(0, 20) };

  return newState;
}

// ─── addGraphNodeFromQuest ────────────────────────────────────────────────────

export function addGraphNodeFromQuest(state: AbelState, quest: Quest, nodeId: string): AbelState {
  if (state.graph.nodes.find(n => n.id === nodeId)) return state;

  const x = 100 + Math.random() * 600;
  const y = 100 + Math.random() * 400;
  const node = {
    id: nodeId,
    label: quest.title,
    type: 'quest' as const,
    description: quest.description,
    tags: [quest.type],
    x, y,
    createdAt: iso(),
  };

  return {
    ...state,
    graph: { ...state.graph, nodes: [...state.graph.nodes, node] },
  };
}

// ─── increaseSkillMastery ─────────────────────────────────────────────────────

export function increaseSkillMastery(state: AbelState, skillId: string, amount: number): AbelState {
  const skill = state.skills.find(s => s.id === skillId);
  if (!skill) return state;

  const oldMastery = skill.mastery;
  const newMastery = Math.min(100, oldMastery + amount);

  let newState = {
    ...state,
    skills: state.skills.map(s =>
      s.id === skillId ? { ...s, mastery: newMastery } : s
    ),
  };

  const updatedSkill = { ...skill, mastery: newMastery };

  // check milestones crossed
  for (const milestone of MILESTONES) {
    if (oldMastery < milestone && newMastery >= milestone) {
      newState = createEggIfMilestoneReached(newState, updatedSkill, milestone);
    }
  }

  const activity: ActivityItem = {
    id: `a-${uid()}`,
    type: 'skill_mastery',
    title: `${skill.name} at ${newMastery}%`,
    description: `Mastery increased by ${amount}%`,
    relatedId: skillId,
    createdAt: iso(),
  };
  newState = { ...newState, recentActivity: [activity, ...newState.recentActivity].slice(0, 20) };

  return newState;
}

// ─── createEggIfMilestoneReached ──────────────────────────────────────────────

export function createEggIfMilestoneReached(
  state: AbelState,
  skill: SkillNode,
  milestone: 20 | 40 | 60 | 80 | 100
): AbelState {
  const exists = state.eggs.find(e => e.skillId === skill.id && e.milestone === milestone);
  if (exists) return state;

  const egg: Egg = {
    id: `e-${uid()}`,
    skillId: skill.id,
    milestone,
    type: eggTypeForSkill(skill),
    state: 'earned',
    earnedAt: iso(),
  };

  const activity: ActivityItem = {
    id: `a-${uid()}`,
    type: 'egg_earned',
    title: `Egg earned: ${skill.name} ${milestone}%`,
    description: `Milestone reached`,
    relatedId: egg.id,
    createdAt: iso(),
  };

  return {
    ...state,
    eggs: [...state.eggs, egg],
    recentActivity: [activity, ...state.recentActivity].slice(0, 20),
  };
}

// ─── hatchEgg ─────────────────────────────────────────────────────────────────

export function hatchEgg(state: AbelState, eggId: string): AbelState {
  const egg = state.eggs.find(e => e.id === eggId);
  if (!egg || egg.state === 'hatched') return state;

  const skill = state.skills.find(s => s.id === egg.skillId);
  if (!skill) return state;

  const spec = trophySpecForEgg(egg, skill);
  const trophy: Trophy = {
    id: `t-${uid()}`,
    ...spec,
    earnedAt: iso(),
  };

  const updatedEggs = state.eggs.map(e =>
    e.id === eggId
      ? { ...e, state: 'hatched' as const, hatchResultTrophyId: trophy.id, hatchedAt: iso() }
      : e
  );

  const activity: ActivityItem = {
    id: `a-${uid()}`,
    type: 'trophy_earned',
    title: `${trophy.name} earned`,
    description: `Hatched from ${skill.name} ${egg.milestone}% milestone`,
    relatedId: trophy.id,
    createdAt: iso(),
  };

  return {
    ...state,
    eggs: updatedEggs,
    trophies: [...state.trophies, trophy],
    recentActivity: [activity, ...state.recentActivity].slice(0, 20),
  };
}

// ─── createMemoryFromFocusSession ─────────────────────────────────────────────

export function createMemoryFromFocusSession(state: AbelState, session: FocusSession): AbelState {
  if (!session.reflection) return state;

  const memory: MemoryItem = {
    id: `m-${uid()}`,
    title: session.intention || 'Focus Session Memory',
    body: session.reflection,
    source: 'focus',
    emotionalTone: session.score >= 80 ? 'Focused' : 'Reflective',
    subtypes: session.score >= 80 ? ['flow', 'discipline'] : ['clarity'],
    relatedGraphNodeIds: [],
    relatedTrophyIds: [],
    createdAt: iso(),
  };

  const activity: ActivityItem = {
    id: `a-${uid()}`,
    type: 'memory_created',
    title: memory.title,
    description: 'Memory from focus session',
    relatedId: memory.id,
    createdAt: iso(),
  };

  return {
    ...state,
    memories: [...state.memories, memory],
    recentActivity: [activity, ...state.recentActivity].slice(0, 20),
  };
}

// ─── updateArchetypeFromEvidence ──────────────────────────────────────────────

export function updateArchetypeFromEvidence(state: AbelState): AbelState {
  const completedQuests = state.quests.filter(q => q.status === 'completed');
  const traits = { ...state.archetype.traits };

  // nudge traits based on quest types
  for (const q of completedQuests) {
    if (q.type === 'focus') traits['Disciplined Action'] = Math.min(100, (traits['Disciplined Action'] ?? 50) + 1);
    if (q.type === 'knowledge') traits['Curiosity'] = Math.min(100, (traits['Curiosity'] ?? 50) + 1);
    if (q.type === 'reflection') traits['Reflective Capacity'] = Math.min(100, (traits['Reflective Capacity'] ?? 50) + 1);
    if (q.type === 'skill') traits['Systems Orientation'] = Math.min(100, (traits['Systems Orientation'] ?? 50) + 1);
  }

  return {
    ...state,
    archetype: {
      ...state.archetype,
      traits,
      evidenceQuestIds: completedQuests.map(q => q.id),
      evidenceMemoryIds: state.memories.slice(-5).map(m => m.id),
    },
  };
}
