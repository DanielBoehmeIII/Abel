// ─── Page Routing ─────────────────────────────────────────────────────────────

export type PageId =
  | 'main' | 'nav' | 'archive' | 'quests' | 'focus'
  | 'graph' | 'skillweb' | 'egg-hatch' | 'trophies'
  | 'exhibition' | 'settings';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  name: string;
  title: string;
  createdAt: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type LLMProvider = 'chatgpt' | 'claude' | 'local' | 'mock';
export type ThemeName = 'dark' | 'light' | 'minimal' | 'cinematic' | 'purple' | 'gold';
export type QuestIntensity = 'gentle' | 'balanced' | 'intense';
export type FocusMode = 'deep-work' | 'study' | 'reading' | 'writing' | 'recovery' | 'creative';

export interface AbelSettings {
  llmProvider: LLMProvider;
  theme: ThemeName;
  questIntensity: QuestIntensity;
  focusDefaults: { duration: number; mode: FocusMode; ambientSound: string };
  reduceMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  notificationStyle: 'subtle' | 'prominent' | 'none';
}

// ─── Journey ──────────────────────────────────────────────────────────────────

export interface Journey {
  id: string;
  title: string;
  description: string;
  goal: string;
  questIds: string[];
  active: boolean;
  createdAt: string;
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export type QuestStatus = 'locked' | 'available' | 'active' | 'completed';
export type QuestType = 'focus' | 'knowledge' | 'reflection' | 'skill' | 'memory' | 'archetype';

export interface Quest {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  journeyId: string;
  status: QuestStatus;
  type: QuestType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  source: 'archive' | 'graph' | 'focus' | 'manual';
  linkedSkillIds: string[];
  linkedGraphNodeIds: string[];
  rewards: { xp: number; skillIds: string[]; skillMastery: number; eggProgress?: number };
  completedAt?: string;
}

// ─── Focus ────────────────────────────────────────────────────────────────────

export interface FocusSession {
  id: string;
  mode: FocusMode;
  intention: string;
  duration: number;
  notes: string;
  reflection: string;
  questId?: string;
  skillId?: string;
  score: number;
  completedAt?: string;
  createdAt: string;
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export type GraphNodeType =
  | 'memory' | 'quest' | 'skill' | 'insight' | 'pdf'
  | 'chat' | 'journal' | 'concept' | 'goal' | 'archetype-trait';

export type GraphEdgeType =
  | 'relates-to' | 'caused-by' | 'supports' | 'contradicts'
  | 'unlocks' | 'remembered-in' | 'part-of';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  description: string;
  tags: string[];
  x: number;
  y: number;
  createdAt: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  category: string;
  mastery: number;
  unlockedBy: string[];
  relatedGraphNodeIds: string[];
  relatedQuestIds: string[];
  x: number;
  y: number;
}

// ─── Eggs ─────────────────────────────────────────────────────────────────────

export type EggState = 'unearned' | 'earned' | 'hatching' | 'hatched';
export type EggType = 'focus' | 'knowledge' | 'discipline' | 'creative' | 'archive' | 'memory' | 'archetype';

export interface Egg {
  id: string;
  skillId: string;
  milestone: 20 | 40 | 60 | 80 | 100;
  type: EggType;
  state: EggState;
  hatchResultTrophyId?: string;
  earnedAt?: string;
  hatchedAt?: string;
}

// ─── Trophies ─────────────────────────────────────────────────────────────────

export type TrophyRarity = 'common' | 'rare' | 'mythic' | 'legendary';
export type TrophyModelType = 'orb' | 'cube' | 'creature' | 'artifact' | 'mask' | 'totem';

export interface Trophy {
  id: string;
  name: string;
  description: string;
  originStory: string;
  rarity: TrophyRarity;
  sourceSkillId?: string;
  sourceQuestId?: string;
  sourceMemoryId?: string;
  modelType: TrophyModelType;
  color: string;
  glowColor: string;
  earnedAt: string;
  favorite?: boolean;
}

// ─── Memories ─────────────────────────────────────────────────────────────────

export type MemorySource = 'journal' | 'focus' | 'archive' | 'import' | 'quest';
export type MemorySubtype =
  | 'clarity' | 'discipline' | 'curiosity' | 'avoidance'
  | 'breakthrough' | 'connection' | 'grief' | 'confidence'
  | 'creativity' | 'flow' | 'fear' | 'resilience';

export interface MemoryItem {
  id: string;
  title: string;
  body: string;
  source: MemorySource;
  emotionalTone?: string;
  subtypes: MemorySubtype[];
  relatedGraphNodeIds: string[];
  relatedTrophyIds: string[];
  createdAt: string;
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export interface ArchiveMessage {
  id: string;
  role: 'user' | 'abel';
  content: string;
  createdAt: string;
}

export interface ArchiveThread {
  id: string;
  title: string;
  messages: ArchiveMessage[];
  journeyId?: string;
  createdAt: string;
}

// ─── Archetype ────────────────────────────────────────────────────────────────

export interface ArchetypeProfile {
  primary: string;
  secondary: string[];
  traits: Record<string, number>;
  evidenceMemoryIds: string[];
  evidenceQuestIds: string[];
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'quest_complete' | 'skill_mastery' | 'egg_earned'
  | 'trophy_earned' | 'memory_created' | 'focus_complete';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  relatedId?: string;
  createdAt: string;
}

// ─── Root State ───────────────────────────────────────────────────────────────

export interface AbelState {
  user: UserProfile;
  settings: AbelSettings;
  archiveThreads: ArchiveThread[];
  journeys: Journey[];
  quests: Quest[];
  focusSessions: FocusSession[];
  graph: KnowledgeGraph;
  skills: SkillNode[];
  eggs: Egg[];
  trophies: Trophy[];
  memories: MemoryItem[];
  archetype: ArchetypeProfile;
  recentActivity: ActivityItem[];
}
