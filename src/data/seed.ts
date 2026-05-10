import type {
  AbelState, UserProfile, AbelSettings, Journey, Quest, SkillNode,
  Egg, Trophy, MemoryItem, ArchiveThread, ArchetypeProfile,
  KnowledgeGraph, ActivityItem, FocusSession,
} from '../types/abel';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// ─── User ─────────────────────────────────────────────────────────────────────

export const SEED_USER: UserProfile = {
  name: 'Abel',
  title: 'Seeker of Clarity',
  createdAt: daysAgo(47),
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const SEED_SETTINGS: AbelSettings = {
  llmProvider: 'mock',
  theme: 'dark',
  questIntensity: 'balanced',
  focusDefaults: { duration: 45, mode: 'deep-work', ambientSound: 'rain' },
  reduceMotion: false,
  fontSize: 'medium',
  notificationStyle: 'subtle',
};

// ─── Journey ──────────────────────────────────────────────────────────────────

export const SEED_JOURNEYS: Journey[] = [
  {
    id: 'j1',
    title: 'Clarity Over Noise',
    description: 'Build a knowledge system that filters signal from noise and turns ideas into action.',
    goal: 'Develop mastery over attention, knowledge synthesis, and creative output.',
    questIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
    active: true,
    createdAt: daysAgo(30),
  },
];

// ─── Quests ───────────────────────────────────────────────────────────────────

export const SEED_QUESTS: Quest[] = [
  {
    id: 'q1',
    title: 'Build Knowledge Graph',
    description: 'Create a visual map of your core ideas, connecting concepts, goals, and insights.',
    whyItMatters: 'A knowledge graph externalizes your mind, revealing patterns invisible inside it.',
    journeyId: 'j1',
    status: 'completed',
    type: 'knowledge',
    difficulty: 3,
    source: 'archive',
    linkedSkillIds: ['knowledge-synthesis', 'systems-thinking'],
    linkedGraphNodeIds: ['gn1', 'gn7'],
    rewards: { xp: 150, skillIds: ['knowledge-synthesis', 'systems-thinking'], skillMastery: 12 },
    completedAt: daysAgo(14),
  },
  {
    id: 'q2',
    title: 'Establish Deep Work Ritual',
    description: 'Design and complete five 90-minute deep work sessions with zero context switching.',
    whyItMatters: 'Depth compounds. Each session builds your capacity for focused thought.',
    journeyId: 'j1',
    status: 'completed',
    type: 'focus',
    difficulty: 2,
    source: 'archive',
    linkedSkillIds: ['discipline-flow'],
    linkedGraphNodeIds: ['gn9'],
    rewards: { xp: 120, skillIds: ['discipline-flow'], skillMastery: 20 },
    completedAt: daysAgo(21),
  },
  {
    id: 'q3',
    title: 'Map Your Creative Process',
    description: 'Document how you move from raw idea to finished work. Find the gaps.',
    whyItMatters: 'Understanding your creative process lets you enter it intentionally.',
    journeyId: 'j1',
    status: 'completed',
    type: 'reflection',
    difficulty: 2,
    source: 'archive',
    linkedSkillIds: ['creative-direction'],
    linkedGraphNodeIds: ['gn8'],
    rewards: { xp: 100, skillIds: ['creative-direction'], skillMastery: 18 },
    completedAt: daysAgo(18),
  },
  {
    id: 'q4',
    title: 'Synthesize Three Insights',
    description: 'Take three separate learnings and write a short synthesis connecting them.',
    whyItMatters: 'Synthesis is the highest form of learning. It creates new knowledge.',
    journeyId: 'j1',
    status: 'active',
    type: 'knowledge',
    difficulty: 3,
    source: 'archive',
    linkedSkillIds: ['knowledge-synthesis', 'systems-thinking'],
    linkedGraphNodeIds: ['gn1', 'gn7'],
    rewards: { xp: 130, skillIds: ['knowledge-synthesis', 'systems-thinking'], skillMastery: 10 },
  },
  {
    id: 'q5',
    title: 'Write a Reflection on Your Archetype',
    description: 'Journal about your primary archetype. Where does it serve you? Where does it limit you?',
    whyItMatters: 'Self-knowledge is a foundation, not a destination.',
    journeyId: 'j1',
    status: 'available',
    type: 'archetype',
    difficulty: 1,
    source: 'archive',
    linkedSkillIds: ['emotional-clarity'],
    linkedGraphNodeIds: [],
    rewards: { xp: 80, skillIds: ['emotional-clarity'], skillMastery: 8 },
  },
  {
    id: 'q6',
    title: 'Design Your Systems Architecture',
    description: 'Map how your tools, habits, and rituals connect. Identify the weak links.',
    whyItMatters: 'Systems compound. A broken link prevents compounding.',
    journeyId: 'j1',
    status: 'locked',
    type: 'skill',
    difficulty: 4,
    source: 'archive',
    linkedSkillIds: ['systems-thinking', 'technical-craft'],
    linkedGraphNodeIds: ['gn2'],
    rewards: { xp: 200, skillIds: ['systems-thinking', 'technical-craft'], skillMastery: 15 },
  },
];

// ─── Skills ───────────────────────────────────────────────────────────────────

export const SEED_SKILLS: SkillNode[] = [
  {
    id: 'systems-thinking',
    name: 'Systems Thinking',
    description: 'See patterns, feedback loops, and emergent structure in complex domains.',
    category: 'Systems Thinking',
    mastery: 42,
    unlockedBy: [],
    relatedGraphNodeIds: ['gn7'],
    relatedQuestIds: ['q1', 'q4', 'q6'],
    x: 400, y: 200,
  },
  {
    id: 'emotional-clarity',
    name: 'Emotional Clarity',
    description: 'Name, trace, and work with emotional states rather than be driven by them.',
    category: 'Emotional Clarity',
    mastery: 28,
    unlockedBy: [],
    relatedGraphNodeIds: [],
    relatedQuestIds: ['q5'],
    x: 200, y: 380,
  },
  {
    id: 'creative-direction',
    name: 'Creative Direction',
    description: 'Move ideas from concept to polished output with intentional craft.',
    category: 'Creativity',
    mastery: 61,
    unlockedBy: [],
    relatedGraphNodeIds: ['gn8'],
    relatedQuestIds: ['q3'],
    x: 600, y: 380,
  },
  {
    id: 'technical-craft',
    name: 'Technical Craft',
    description: 'Build systems, write code, and engineer solutions with precision.',
    category: 'Technical Skill',
    mastery: 36,
    unlockedBy: ['systems-thinking'],
    relatedGraphNodeIds: ['gn2'],
    relatedQuestIds: ['q6'],
    x: 500, y: 500,
  },
  {
    id: 'discipline-flow',
    name: 'Discipline & Flow',
    description: 'Show up consistently and enter deep states of focused work.',
    category: 'Discipline',
    mastery: 80,
    unlockedBy: [],
    relatedGraphNodeIds: ['gn9'],
    relatedQuestIds: ['q2'],
    x: 300, y: 500,
  },
  {
    id: 'knowledge-synthesis',
    name: 'Knowledge Synthesis',
    description: 'Connect disparate ideas into new insight.',
    category: 'Learning',
    mastery: 24,
    unlockedBy: ['systems-thinking'],
    relatedGraphNodeIds: ['gn1'],
    relatedQuestIds: ['q1', 'q4'],
    x: 400, y: 350,
  },
  {
    id: 'pattern-recognition',
    name: 'Pattern Recognition',
    description: 'Detect recurring structures and signals hidden within noise.',
    category: 'Systems Thinking',
    mastery: 18,
    unlockedBy: ['systems-thinking'],
    relatedGraphNodeIds: [],
    relatedQuestIds: [],
    x: 570, y: 160,
  },
  {
    id: 'strategic-vision',
    name: 'Strategic Vision',
    description: 'Hold long arcs of intention while adapting to each moment.',
    category: 'Systems Thinking',
    mastery: 12,
    unlockedBy: ['systems-thinking', 'creative-direction'],
    relatedGraphNodeIds: [],
    relatedQuestIds: [],
    x: 700, y: 280,
  },
  {
    id: 'narrative-design',
    name: 'Narrative Design',
    description: 'Shape experience through story, structure, and symbolic meaning.',
    category: 'Creativity',
    mastery: 44,
    unlockedBy: ['creative-direction'],
    relatedGraphNodeIds: [],
    relatedQuestIds: [],
    x: 760, y: 440,
  },
  {
    id: 'somatic-awareness',
    name: 'Somatic Awareness',
    description: 'Listen to the body as a source of intelligence and signal.',
    category: 'Emotional Clarity',
    mastery: 15,
    unlockedBy: ['emotional-clarity'],
    relatedGraphNodeIds: [],
    relatedQuestIds: [],
    x: 80, y: 330,
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    description: 'Sustain concentration beyond distraction into creative immersion.',
    category: 'Discipline',
    mastery: 55,
    unlockedBy: ['discipline-flow'],
    relatedGraphNodeIds: [],
    relatedQuestIds: [],
    x: 160, y: 560,
  },
  {
    id: 'integrated-learning',
    name: 'Integrated Learning',
    description: 'Weave knowledge across domains into a living, evolving worldview.',
    category: 'Learning',
    mastery: 8,
    unlockedBy: ['knowledge-synthesis', 'emotional-clarity'],
    relatedGraphNodeIds: [],
    relatedQuestIds: [],
    x: 440, y: 530,
  },
];

// ─── Eggs ─────────────────────────────────────────────────────────────────────

export const SEED_EGGS: Egg[] = [
  // Systems Thinking 20% — hatched → Lumen Seed
  { id: 'e1', skillId: 'systems-thinking', milestone: 20, type: 'knowledge', state: 'hatched', hatchResultTrophyId: 't1', earnedAt: daysAgo(20), hatchedAt: daysAgo(19) },
  // Systems Thinking 40% — earned, ready to hatch
  { id: 'e2', skillId: 'systems-thinking', milestone: 40, type: 'knowledge', state: 'earned', earnedAt: daysAgo(5) },
  // Emotional Clarity 20% — earned
  { id: 'e3', skillId: 'emotional-clarity', milestone: 20, type: 'memory', state: 'earned', earnedAt: daysAgo(8) },
  // Creative Direction 20% — hatched
  { id: 'e4', skillId: 'creative-direction', milestone: 20, type: 'creative', state: 'hatched', hatchResultTrophyId: 't3', earnedAt: daysAgo(25), hatchedAt: daysAgo(24) },
  // Creative Direction 40% — hatched
  { id: 'e5', skillId: 'creative-direction', milestone: 40, type: 'creative', state: 'hatched', earnedAt: daysAgo(15), hatchedAt: daysAgo(14) },
  // Creative Direction 60% — hatched → Glass Moth
  { id: 'e6', skillId: 'creative-direction', milestone: 60, type: 'creative', state: 'hatched', hatchResultTrophyId: 't3', earnedAt: daysAgo(4), hatchedAt: daysAgo(3) },
  // Technical Craft 20% — earned
  { id: 'e7', skillId: 'technical-craft', milestone: 20, type: 'knowledge', state: 'earned', earnedAt: daysAgo(10) },
  // Discipline & Flow 20 — hatched
  { id: 'e8', skillId: 'discipline-flow', milestone: 20, type: 'discipline', state: 'hatched', earnedAt: daysAgo(40), hatchedAt: daysAgo(39) },
  // Discipline & Flow 40 — hatched
  { id: 'e9', skillId: 'discipline-flow', milestone: 40, type: 'discipline', state: 'hatched', earnedAt: daysAgo(30), hatchedAt: daysAgo(29) },
  // Discipline & Flow 60 — hatched
  { id: 'e10', skillId: 'discipline-flow', milestone: 60, type: 'discipline', state: 'hatched', earnedAt: daysAgo(18), hatchedAt: daysAgo(17) },
  // Discipline & Flow 80 — hatched → Obsidian Compass
  { id: 'e11', skillId: 'discipline-flow', milestone: 80, type: 'discipline', state: 'hatched', hatchResultTrophyId: 't2', earnedAt: daysAgo(7), hatchedAt: daysAgo(6) },
  // Knowledge Synthesis 20% — earned
  { id: 'e12', skillId: 'knowledge-synthesis', milestone: 20, type: 'archive', state: 'earned', earnedAt: daysAgo(3) },
];

// ─── Trophies ─────────────────────────────────────────────────────────────────

export const SEED_TROPHIES: Trophy[] = [
  {
    id: 't1',
    name: 'Lumen Seed',
    description: 'The first light of a knowledge system taking root.',
    originStory: 'Born when Systems Thinking first took hold — a small crystalline seed that pulses with inner light, promising future growth.',
    rarity: 'rare',
    sourceSkillId: 'systems-thinking',
    modelType: 'orb',
    color: '#00d4ff',
    glowColor: 'rgba(0, 212, 255, 0.4)',
    earnedAt: daysAgo(19),
  },
  {
    id: 't2',
    name: 'Obsidian Compass',
    description: 'Forged through relentless discipline. Points toward what matters.',
    originStory: 'Emerged at the 80% mastery milestone of Discipline & Flow. Dark, dense, and perfectly calibrated — it never wavers.',
    rarity: 'mythic',
    sourceSkillId: 'discipline-flow',
    modelType: 'artifact',
    color: '#7c4dff',
    glowColor: 'rgba(124, 77, 255, 0.5)',
    earnedAt: daysAgo(6),
    favorite: true,
  },
  {
    id: 't3',
    name: 'Glass Moth',
    description: 'A creature born of creative milestones. Fragile and luminous.',
    originStory: 'Hatched from the Creative Direction 60% egg. Its wings refract light into unexpected colors — a reminder that creativity changes its container.',
    rarity: 'rare',
    sourceSkillId: 'creative-direction',
    modelType: 'creature',
    color: '#f5c518',
    glowColor: 'rgba(245, 197, 24, 0.35)',
    earnedAt: daysAgo(3),
  },
  {
    id: 't4',
    name: 'Quiet Star',
    description: 'A small, steady glow earned through consistent focus.',
    originStory: 'Awarded after the first completed Focus Quest. Not the brightest star — but the most reliable.',
    rarity: 'common',
    sourceQuestId: 'q2',
    modelType: 'orb',
    color: '#a8c4e0',
    glowColor: 'rgba(168, 196, 224, 0.3)',
    earnedAt: daysAgo(21),
  },
];

// ─── Memories ─────────────────────────────────────────────────────────────────

export const SEED_MEMORIES: MemoryItem[] = [
  {
    id: 'm1',
    title: 'First Light',
    body: 'The moment I realized that knowledge without structure is noise. I had been collecting ideas for years, but they were scattered — unconnected. Building the first graph node felt like turning on a light in a room I had lived in for years.',
    source: 'focus',
    emotionalTone: 'Revelatory',
    subtypes: ['clarity', 'breakthrough'],
    relatedGraphNodeIds: ['gn1'],
    relatedTrophyIds: ['t1'],
    createdAt: daysAgo(19),
  },
  {
    id: 'm2',
    title: 'Quiet Realizations',
    body: 'During a long recovery session, I noticed how many of my anxieties trace back to unfinished loops — decisions unmade, projects half-started. The stillness revealed the noise.',
    source: 'journal',
    emotionalTone: 'Reflective',
    subtypes: ['clarity', 'resilience'],
    relatedGraphNodeIds: [],
    relatedTrophyIds: [],
    createdAt: daysAgo(15),
  },
  {
    id: 'm3',
    title: 'Meaningful Conversation',
    body: 'Talked for three hours about design systems and how they mirror the mind. A conversation that felt like thinking out loud. Some ideas only become real when spoken.',
    source: 'archive',
    emotionalTone: 'Connected',
    subtypes: ['connection', 'creativity'],
    relatedGraphNodeIds: ['gn3', 'gn8'],
    relatedTrophyIds: [],
    createdAt: daysAgo(12),
  },
  {
    id: 'm4',
    title: 'Deep Work',
    body: 'Four hours. No notifications. No context switching. The work went somewhere real. I remember the feeling more than the output — a kind of density in thinking, like the air thickened.',
    source: 'focus',
    emotionalTone: 'Focused',
    subtypes: ['flow', 'discipline'],
    relatedGraphNodeIds: ['gn9'],
    relatedTrophyIds: ['t4'],
    createdAt: daysAgo(10),
  },
  {
    id: 'm5',
    title: 'Creative Breakthrough',
    body: 'Spent an afternoon rearranging the pieces of a project that had been stuck for weeks. Suddenly the architecture became obvious. The solution was always there — I had been looking for it in the wrong place.',
    source: 'journal',
    emotionalTone: 'Elated',
    subtypes: ['breakthrough', 'creativity', 'clarity'],
    relatedGraphNodeIds: ['gn8'],
    relatedTrophyIds: ['t3'],
    createdAt: daysAgo(5),
  },
  {
    id: 'm6',
    title: 'Gratitude Moment',
    body: 'Paused mid-session to notice how much had changed in the last six weeks. The practice is working. The system is holding. Felt something rare: trust in the direction.',
    source: 'focus',
    emotionalTone: 'Grateful',
    subtypes: ['confidence', 'resilience'],
    relatedGraphNodeIds: [],
    relatedTrophyIds: ['t2'],
    createdAt: daysAgo(2),
  },
];

// ─── Graph ────────────────────────────────────────────────────────────────────

export const SEED_GRAPH: KnowledgeGraph = {
  nodes: [
    { id: 'gn1', label: 'Core Purpose', type: 'goal', description: 'Building tools that amplify human creativity and clarity.', tags: ['purpose', 'vision', 'guiding-star'], x: 430, y: 60, createdAt: daysAgo(30) },
    { id: 'gn2', label: 'Projects OS', type: 'concept', description: 'Designing Abel as a connected memory operating system.', tags: ['Docs', 'v3'], x: 430, y: 310, createdAt: daysAgo(28) },
    { id: 'gn3', label: 'ChatGPT Conversations', type: 'chat', description: 'Key discussions about projects, ideas, and problem solving.', tags: ['ai', 'design'], x: 160, y: 170, createdAt: daysAgo(25) },
    { id: 'gn4', label: 'Claude Conversations', type: 'chat', description: 'Deep dives and reflections on philosophy and systems.', tags: ['ai', 'research'], x: 650, y: 260, createdAt: daysAgo(22) },
    { id: 'gn5', label: 'Journal: May 12', type: 'journal', description: 'Reflection on focus, energy, and the week ahead.', tags: ['journal', 'reflection'], x: 150, y: 400, createdAt: daysAgo(18) },
    { id: 'gn6', label: 'Build Knowledge Graph', type: 'quest', description: 'Create a visualization of my knowledge base with real-time connections.', tags: ['Quest', 'In Progress'], x: 400, y: 510, createdAt: daysAgo(14) },
    { id: 'gn7', label: 'Systems Thinking', type: 'skill', description: 'Skill in understanding complex systems and feedback loops.', tags: ['skill', 'mental-model'], x: 650, y: 460, createdAt: daysAgo(30) },
    { id: 'gn8', label: 'Design Principles', type: 'concept', description: 'Key principles for building intuitive and powerful tools.', tags: ['design', 'principles'], x: 130, y: 600, createdAt: daysAgo(20) },
    { id: 'gn9', label: 'Focus & Flow', type: 'skill', description: 'Notes on maintaining deep work and creative momentum.', tags: ['skill', 'flow'], x: 620, y: 610, createdAt: daysAgo(35) },
    { id: 'gn10', label: 'Long-term Goals', type: 'goal', description: 'Five-year vision for work, craft, and contribution.', tags: ['vision', 'goal'], x: 840, y: 490, createdAt: daysAgo(40) },
  ],
  edges: [
    { id: 'ge1', source: 'gn1', target: 'gn2', type: 'part-of' },
    { id: 'ge2', source: 'gn3', target: 'gn1', type: 'supports' },
    { id: 'ge3', source: 'gn4', target: 'gn7', type: 'supports' },
    { id: 'ge4', source: 'gn5', target: 'gn8', type: 'relates-to' },
    { id: 'ge5', source: 'gn6', target: 'gn1', type: 'part-of' },
    { id: 'ge6', source: 'gn6', target: 'gn7', type: 'unlocks' },
    { id: 'ge7', source: 'gn7', target: 'gn2', type: 'supports' },
    { id: 'ge8', source: 'gn8', target: 'gn1', type: 'supports' },
    { id: 'ge9', source: 'gn9', target: 'gn6', type: 'supports' },
    { id: 'ge10', source: 'gn1', target: 'gn10', type: 'part-of' },
    { id: 'ge11', source: 'gn3', target: 'gn8', type: 'relates-to' },
    { id: 'ge12', source: 'gn4', target: 'gn2', type: 'supports' },
  ],
};

// ─── Archive Threads ──────────────────────────────────────────────────────────

export const SEED_ARCHIVE_THREADS: ArchiveThread[] = [
  {
    id: 'at1',
    title: 'Clarity Over Noise — Journey Planning',
    journeyId: 'j1',
    messages: [
      {
        id: 'am1',
        role: 'user',
        content: 'I want to build a knowledge system that actually helps me think. Not just collect. Help me design a journey around this.',
        createdAt: daysAgo(30),
      },
      {
        id: 'am2',
        role: 'abel',
        content: `I understand. Most knowledge tools optimize for capture, not clarity. What you're describing is a different kind of system — one that builds structure as you think, not after.\n\nYour journey is **Clarity Over Noise**.\n\nHere's how I see it unfolding:\n\n1. First, you build the graph — a visual map of what you already know.\n2. Then you identify the gaps and turn them into quests.\n3. Each quest produces insight that feeds back into the graph.\n4. Over time, the system learns what you're becoming.\n\nShall I generate the first set of quests from this vision?`,
        createdAt: daysAgo(30),
      },
      {
        id: 'am3',
        role: 'user',
        content: 'Yes. Generate quests.',
        createdAt: daysAgo(30),
      },
      {
        id: 'am4',
        role: 'abel',
        content: `Generated 6 quests for **Clarity Over Noise**.\n\n**Build Knowledge Graph** — Start the map. Connect what you know.\n**Establish Deep Work Ritual** — Create the conditions for depth.\n**Map Your Creative Process** — Understand how you move from idea to output.\n**Synthesize Three Insights** — Cross-pollinate your best learnings.\n**Write a Reflection on Your Archetype** — Know the identity driving the work.\n**Design Your Systems Architecture** — Map the whole machine.\n\nThese are now live in your Quests. Begin with **Build Knowledge Graph** — it unlocks everything else.`,
        createdAt: daysAgo(30),
      },
    ],
    createdAt: daysAgo(30),
  },
];

// ─── Archetype ────────────────────────────────────────────────────────────────

export const SEED_ARCHETYPE: ArchetypeProfile = {
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
  evidenceMemoryIds: ['m1', 'm4', 'm5'],
  evidenceQuestIds: ['q1', 'q2', 'q3'],
};

// ─── Focus Sessions ───────────────────────────────────────────────────────────

export const SEED_FOCUS_SESSIONS: FocusSession[] = [
  {
    id: 'fs1',
    mode: 'deep-work',
    intention: 'Build the initial knowledge graph structure',
    duration: 5400,
    notes: 'Connected 8 nodes. Found unexpected link between ChatGPT conversations and Design Principles.',
    reflection: 'The graph is starting to have opinions. It wants to grow.',
    questId: 'q1',
    skillId: 'knowledge-synthesis',
    score: 94,
    completedAt: daysAgo(14),
    createdAt: daysAgo(14),
  },
  {
    id: 'fs2',
    mode: 'deep-work',
    intention: 'Map creative process from concept to completion',
    duration: 3600,
    notes: 'Identified 3 critical gaps: ideation → structure, structure → execution, execution → reflection.',
    reflection: 'I skip the structure step. That\'s the bottleneck.',
    questId: 'q3',
    skillId: 'creative-direction',
    score: 87,
    completedAt: daysAgo(10),
    createdAt: daysAgo(10),
  },
];

// ─── Recent Activity ──────────────────────────────────────────────────────────

export const SEED_ACTIVITY: ActivityItem[] = [
  { id: 'a1', type: 'trophy_earned', title: 'Obsidian Compass earned', description: 'Discipline & Flow reached 80% mastery', relatedId: 't2', createdAt: daysAgo(6) },
  { id: 'a2', type: 'memory_created', title: 'Gratitude Moment', description: 'New memory from focus session', relatedId: 'm6', createdAt: daysAgo(2) },
  { id: 'a3', type: 'trophy_earned', title: 'Glass Moth hatched', description: 'Creative Direction 60% milestone', relatedId: 't3', createdAt: daysAgo(3) },
  { id: 'a4', type: 'skill_mastery', title: 'Creative Direction at 61%', description: 'Passed the 60% milestone', relatedId: 'creative-direction', createdAt: daysAgo(4) },
  { id: 'a5', type: 'memory_created', title: 'Creative Breakthrough', description: 'Insight saved from journal', relatedId: 'm5', createdAt: daysAgo(5) },
  { id: 'a6', type: 'quest_complete', title: 'Map Your Creative Process', description: 'Quest completed', relatedId: 'q3', createdAt: daysAgo(18) },
];

// ─── Full Seed State ──────────────────────────────────────────────────────────

export const SEED_STATE: AbelState = {
  user: SEED_USER,
  settings: SEED_SETTINGS,
  archiveThreads: SEED_ARCHIVE_THREADS,
  journeys: SEED_JOURNEYS,
  quests: SEED_QUESTS,
  focusSessions: SEED_FOCUS_SESSIONS,
  graph: SEED_GRAPH,
  skills: SEED_SKILLS,
  eggs: SEED_EGGS,
  trophies: SEED_TROPHIES,
  memories: SEED_MEMORIES,
  archetype: SEED_ARCHETYPE,
  recentActivity: SEED_ACTIVITY,
};
