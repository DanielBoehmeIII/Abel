export type PageId =
  | 'menu'
  | 'focus'
  | 'habit'
  | 'planner'
  | 'skilltree'
  | 'archetypes'
  | 'trophies'
  | 'journal'
  | 'sleep'
  | 'fitness'
  | 'learning'
  | 'memory'
  | 'graph';

export interface NavTab {
  id: PageId;
  label: string;
  icon: string;
  description: string;
  angle: number;
}

export interface SkillNode {
  id: string;
  label: string;
  parentId: string | null;
  state: 'completed' | 'unlocked' | 'locked';
  xp: number;
  description: string;
  tasks: string[];
  icon: string;
}

export interface Trophy {
  id: string;
  name: string;
  description: string;
  color: string;
  symbols: string[];
  unlockCondition: string;
}

export interface FocusSession {
  id: string;
  type: string;
  label: string;
  duration: number;
  completedAt: string;
  xp: number;
  completed: boolean;
}

export interface Habit {
  id: string;
  label: string;
  icon: string;
  completedDates: string[];
  createdAt: string;
}

export interface PlannerTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  completedAt?: string;
  xp: number;
}

export interface SleepLog {
  id: string;
  date: string;
  bed: string;
  wake: string;
  quality: number;
  hours: number;
}

export interface FitnessDay {
  date: string;
  items: Record<string, boolean>;
}

export interface LearningDay {
  date: string;
  checked: Record<string, boolean>;
}

export interface JournalEntry {
  id: string;
  title: string;
  text: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryItem {
  id: string;
  title: string;
  source: string;
  tags: string[];
  linkedSkills: string[];
  suggestedQuests: string[];
  importedAt: string;
  type: 'text' | 'markdown' | 'json';
}

export interface AppState {
  xp: number;
  focusSessions: FocusSession[];
  habits: Habit[];
  plannerTasks: PlannerTask[];
  sleepLogs: SleepLog[];
  fitnessHistory: FitnessDay[];
  learningHistory: LearningDay[];
  journalEntries: JournalEntry[];
  skillsCompleted: string[];
  memories: MemoryItem[];
}
