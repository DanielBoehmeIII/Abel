import type { NavTab, SkillNode, Trophy, JournalEntry } from './types';

export const NAV_TABS: NavTab[] = [
  { id: 'focus',      label: 'FOCUS',      icon: '⊕',  description: 'Enter deep work sessions and protect your attention.', angle: 0 },
  { id: 'habit',      label: 'HABIT',      icon: '◈',  description: 'Track routines, streaks, and daily rituals.', angle: 36 },
  { id: 'planner',    label: 'PLANNER',    icon: '⊞',  description: 'Schedule quests, tasks, and recovery blocks.', angle: 72 },
  { id: 'skilltree',  label: 'SKILL TREE', icon: '⬡',  description: 'Unlock connected skills and build your path.', angle: 108 },
  { id: 'archetypes', label: 'ARCHETYPES', icon: '◉',  description: 'Evolve through identity stages as you complete work.', angle: 144 },
  { id: 'trophies',   label: 'TROPHIES',   icon: '⬙',  description: 'Inspect interactive trophies earned through milestones.', angle: 180 },
  { id: 'journal',    label: 'JOURNAL',    icon: '▣',  description: 'Browse reflections, ideas, logs, and memories.', angle: 216 },
  { id: 'sleep',      label: 'SLEEP',      icon: '☽',  description: 'Log rest and improve recovery discipline.', angle: 252 },
  { id: 'fitness',    label: 'FITNESS',    icon: '⊛',  description: 'Track movement, strength, and body routines.', angle: 288 },
  { id: 'learning',   label: 'LEARNING',   icon: '⟁',  description: 'Practice, recall, and build projects.', angle: 324 },
];

export const SKILL_NODES: SkillNode[] = [
  { id: 'self-mastery',        label: 'Self Mastery',        parentId: null,           state: 'completed', xp: 0,   description: 'The root of all growth. Awareness and intentional action.', tasks: [], icon: '◉' },
  { id: 'focus',               label: 'Focus',               parentId: 'self-mastery', state: 'unlocked',  xp: 80,  description: 'The ability to direct attention deliberately and hold it.', tasks: ['Complete first session', 'Log 3 focus blocks'], icon: '⊕' },
  { id: 'habit',               label: 'Habit',               parentId: 'self-mastery', state: 'unlocked',  xp: 80,  description: 'Build routines that compound over time.', tasks: ['Log morning routine', 'Check in 7 days straight'], icon: '◈' },
  { id: 'learning',            label: 'Learning',            parentId: 'self-mastery', state: 'unlocked',  xp: 80,  description: 'Structured acquisition and retention of knowledge.', tasks: ['Complete first recall session', 'Finish one lesson'], icon: '⟁' },
  { id: 'fitness',             label: 'Fitness',             parentId: 'self-mastery', state: 'unlocked',  xp: 80,  description: 'Physical capacity as a foundation for mental performance.', tasks: ['Log a workout', 'Complete mobility session'], icon: '⊛' },
  { id: 'deep-work',           label: 'Deep Work',           parentId: 'focus',        state: 'completed', xp: 120, description: 'Enter distraction-free focus sessions and build your capacity for meaningful work.', tasks: ['25 min focus session', 'Phone away', 'Single-task block'], icon: '⊕' },
  { id: 'distraction-control', label: 'Distraction Control', parentId: 'focus',        state: 'unlocked',  xp: 100, description: 'Identify and neutralize attention-hijacking triggers.', tasks: ['Phone in another room for 1hr', 'Log 3 distractions noticed'], icon: '✕' },
  { id: 'flow-state',          label: 'Flow State',          parentId: 'focus',        state: 'unlocked',  xp: 150, description: 'Achieve optimal experience through challenge–skill balance.', tasks: ['30-min deep session', 'No interruptions', 'Reflect after'], icon: '∿' },
  { id: 'morning-routine',     label: 'Morning Routine',     parentId: 'habit',        state: 'completed', xp: 90,  description: 'Begin each day with a structured activation sequence.', tasks: ['Wake before 8 AM', 'Log routine 5 days', 'No phone first hour'], icon: '☀' },
  { id: 'consistency',         label: 'Consistency',         parentId: 'habit',        state: 'completed', xp: 110, description: 'Show up daily regardless of motivation level.', tasks: ['14-day streak', 'Miss no more than 1 day/week'], icon: '◈' },
  { id: 'streak-recovery',     label: 'Streak Recovery',     parentId: 'habit',        state: 'locked',    xp: 130, description: 'Bounce back from breaks without losing momentum.', tasks: ['Break and rebuild streak', 'Document recovery process'], icon: '↺' },
  { id: 'active-recall',       label: 'Active Recall',       parentId: 'learning',     state: 'completed', xp: 100, description: 'Test memory rather than passive re-reading.', tasks: ['Complete 3 recall sessions', 'Score 80%+ on test'], icon: '⟁' },
  { id: 'practice-problems',   label: 'Practice Problems',   parentId: 'learning',     state: 'unlocked',  xp: 120, description: 'Apply knowledge through deliberate problem-solving.', tasks: ['Solve 10 problems', 'Review errors', 'Reattempt failures'], icon: '△' },
  { id: 'project-building',    label: 'Project Building',    parentId: 'learning',     state: 'locked',    xp: 180, description: 'Synthesize learning into tangible creative output.', tasks: ['Plan a project', 'Build v1', 'Iterate once'], icon: '⬡' },
  { id: 'mobility',            label: 'Mobility',            parentId: 'fitness',      state: 'completed', xp: 80,  description: 'Maintain joint health and movement range.', tasks: ['Daily stretch 5 days', 'Full mobility routine'], icon: '⊛' },
  { id: 'strength',            label: 'Strength',            parentId: 'fitness',      state: 'unlocked',  xp: 120, description: 'Build foundational strength through progressive overload.', tasks: ['3 strength sessions', 'Log all lifts', 'Hit PR'], icon: '⊕' },
  { id: 'sleep-discipline',    label: 'Sleep Discipline',    parentId: 'fitness',      state: 'locked',    xp: 140, description: 'Optimize sleep timing and quality for recovery.', tasks: ['Sleep before midnight 10 days', 'Log 7+ hr nights'], icon: '☽' },
];

export const TROPHIES: Trophy[] = [
  { id: 'focus-champion', name: 'Focus Champion',      description: 'Maintained focus for 10 total hours.',   locked: false, color: '#7c3aed' },
  { id: 'habit-builder',  name: 'Habit Builder',        description: 'Completed a 30-day habit streak.',        locked: false, color: '#0891b2' },
  { id: 'early-riser',    name: 'Early Riser',          description: 'Completed 20 tasks before 9 AM.',         locked: false, color: '#065f46' },
  { id: 'deep-diver',     name: 'Deep Diver',           description: 'Entered flow state 25 times.',            locked: false, color: '#1d4ed8' },
  { id: 'legendary',      name: 'Legendary Consistency', description: 'Unlock by maintaining a 100-day streak.', locked: true,  color: '#374151' },
];

export const JOURNAL_ENTRIES: JournalEntry[] = [
  { path: '/journal/daily_logs/',    label: '/journal/daily_logs/',    description: 'Daily entries and logs',           meta: '42 items',   isFile: false },
  { path: '/journal/reflections/',   label: '/journal/reflections/',   description: 'Reflections and insights',         meta: '28 items',   isFile: false },
  { path: '/journal/dreams/',        label: '/journal/dreams/',        description: 'Dreams and subconscious notes',    meta: '15 items',   isFile: false },
  { path: '/journal/ideas/',         label: '/journal/ideas/',         description: 'Ideas and inspirations',           meta: '36 items',   isFile: false },
  {
    path: '/journal/entry_042.txt',
    label: '/journal/entry_042.txt',
    description: 'Journal entry #042',
    meta: '4.2 KB',
    isFile: true,
    preview: {
      date: 'May 14',
      tags: ['focus', 'recovery', 'learning'],
      text: 'Today I noticed that deep work feels easier when I plan the first five minutes before starting. The moment I sit down with a clear intention, resistance drops. I also skipped the phone for the first hour and felt markedly less scattered. Going to test this again tomorrow and log the difference.',
    },
  },
];
