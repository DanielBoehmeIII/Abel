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
  | 'learning';

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
  locked: boolean;
  color: string;
}

export interface JournalEntry {
  path: string;
  label: string;
  description: string;
  meta: string;
  isFile: boolean;
  preview?: {
    date: string;
    tags: string[];
    text: string;
  };
}
