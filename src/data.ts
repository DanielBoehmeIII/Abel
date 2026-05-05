import type { NavTab, SkillNode, Trophy } from './types';

export const NAV_TABS: NavTab[] = [
  { id: 'focus',      label: 'FOCUS',      icon: '⊕', description: 'Enter deep work sessions and protect your attention.',         angle: 0   },
  { id: 'habit',      label: 'HABIT',      icon: '◈', description: 'Track routines, streaks, and daily rituals.',                   angle: 30  },
  { id: 'planner',    label: 'PLANNER',    icon: '⊞', description: 'Schedule quests, tasks, and recovery blocks.',                  angle: 60  },
  { id: 'skilltree',  label: 'SKILL TREE', icon: '⬡', description: 'Unlock connected skills and build your path.',                  angle: 90  },
  { id: 'archetypes', label: 'ARCHETYPES', icon: '◉', description: 'Evolve through identity stages as you complete work.',          angle: 120 },
  { id: 'trophies',   label: 'TROPHIES',   icon: '⬙', description: 'Inspect interactive trophies earned through milestones.',      angle: 150 },
  { id: 'journal',    label: 'JOURNAL',    icon: '▣', description: 'Write, search, and tag reflections and ideas.',                 angle: 180 },
  { id: 'memory',     label: 'MEMORY',     icon: '◇', description: 'Import text and memories. Generate quests and skill links.',    angle: 210 },
  { id: 'graph',      label: 'GRAPH',      icon: '⬡', description: 'Visualize connections between skills, memories, and quests.',   angle: 240 },
  { id: 'sleep',      label: 'SLEEP',      icon: '☽', description: 'Log rest and improve recovery discipline.',                     angle: 270 },
  { id: 'fitness',    label: 'FITNESS',    icon: '⊛', description: 'Track movement, strength, and body routines.',                  angle: 300 },
  { id: 'learning',   label: 'LEARNING',   icon: '⟁', description: 'Practice, recall, and build projects.',                        angle: 330 },
];

export const SKILL_NODES: SkillNode[] = [
  { id: 'self-mastery',        label: 'Self Mastery',        parentId: null,           state: 'completed', xp: 0,   description: 'The root of all growth. Awareness and intentional action.', tasks: [], icon: '◉' },
  { id: 'focus',               label: 'Focus',               parentId: 'self-mastery', state: 'unlocked',  xp: 80,  description: 'The ability to direct attention deliberately and hold it.', tasks: ['Complete first session', 'Log 3 focus blocks'], icon: '⊕' },
  { id: 'habit',               label: 'Habit',               parentId: 'self-mastery', state: 'unlocked',  xp: 80,  description: 'Build routines that compound over time.', tasks: ['Log morning routine', 'Check in 7 days straight'], icon: '◈' },
  { id: 'learning',            label: 'Learning',            parentId: 'self-mastery', state: 'unlocked',  xp: 80,  description: 'Structured acquisition and retention of knowledge.', tasks: ['Complete first recall session', 'Finish one lesson'], icon: '⟁' },
  { id: 'fitness',             label: 'Fitness',             parentId: 'self-mastery', state: 'unlocked',  xp: 80,  description: 'Physical capacity as a foundation for mental performance.', tasks: ['Log a workout', 'Complete mobility session'], icon: '⊛' },
  { id: 'deep-work',           label: 'Deep Work',           parentId: 'focus',        state: 'locked',    xp: 120, description: 'Enter distraction-free focus sessions and build your capacity for meaningful work.', tasks: ['25 min focus session', 'Phone away', 'Single-task block'], icon: '⊕' },
  { id: 'distraction-control', label: 'Distraction Control', parentId: 'focus',        state: 'locked',    xp: 100, description: 'Identify and neutralize attention-hijacking triggers.', tasks: ['Phone in another room for 1hr', 'Log 3 distractions noticed'], icon: '✕' },
  { id: 'flow-state',          label: 'Flow State',          parentId: 'focus',        state: 'locked',    xp: 150, description: 'Achieve optimal experience through challenge–skill balance.', tasks: ['30-min deep session', 'No interruptions', 'Reflect after'], icon: '∿' },
  { id: 'morning-routine',     label: 'Morning Routine',     parentId: 'habit',        state: 'locked',    xp: 90,  description: 'Begin each day with a structured activation sequence.', tasks: ['Wake before 8 AM', 'Log routine 5 days', 'No phone first hour'], icon: '☀' },
  { id: 'consistency',         label: 'Consistency',         parentId: 'habit',        state: 'locked',    xp: 110, description: 'Show up daily regardless of motivation level.', tasks: ['14-day streak', 'Miss no more than 1 day/week'], icon: '◈' },
  { id: 'streak-recovery',     label: 'Streak Recovery',     parentId: 'habit',        state: 'locked',    xp: 130, description: 'Bounce back from breaks without losing momentum.', tasks: ['Break and rebuild streak', 'Document recovery process'], icon: '↺' },
  { id: 'active-recall',       label: 'Active Recall',       parentId: 'learning',     state: 'locked',    xp: 100, description: 'Test memory rather than passive re-reading.', tasks: ['Complete 3 recall sessions', 'Score 80%+ on test'], icon: '⟁' },
  { id: 'practice-problems',   label: 'Practice Problems',   parentId: 'learning',     state: 'locked',    xp: 120, description: 'Apply knowledge through deliberate problem-solving.', tasks: ['Solve 10 problems', 'Review errors', 'Reattempt failures'], icon: '△' },
  { id: 'project-building',    label: 'Project Building',    parentId: 'learning',     state: 'locked',    xp: 180, description: 'Synthesize learning into tangible creative output.', tasks: ['Plan a project', 'Build v1', 'Iterate once'], icon: '⬡' },
  { id: 'mobility',            label: 'Mobility',            parentId: 'fitness',      state: 'locked',    xp: 80,  description: 'Maintain joint health and movement range.', tasks: ['Daily stretch 5 days', 'Full mobility routine'], icon: '⊛' },
  { id: 'strength',            label: 'Strength',            parentId: 'fitness',      state: 'locked',    xp: 120, description: 'Build foundational strength through progressive overload.', tasks: ['3 strength sessions', 'Log all lifts', 'Hit PR'], icon: '⊕' },
  { id: 'sleep-discipline',    label: 'Sleep Discipline',    parentId: 'fitness',      state: 'locked',    xp: 140, description: 'Optimize sleep timing and quality for recovery.', tasks: ['Sleep before midnight 10 days', 'Log 7+ hr nights'], icon: '☽' },
];

export const TROPHIES: Trophy[] = [
  {
    id: 'focus-champion',
    name: 'Focus Champion',
    description: 'Accumulated 10 total hours of completed focus sessions.',
    color: '#7c3aed',
    symbols: ['⊕', '◎', '∿', '◈', '⬙'],
    unlockCondition: '10 hours of focus sessions',
  },
  {
    id: 'habit-builder',
    name: 'Habit Builder',
    description: 'Maintained a 30-day habit streak.',
    color: '#0891b2',
    symbols: ['◈', '☀', '↺', '◌', '★'],
    unlockCondition: '30-day habit streak',
  },
  {
    id: 'early-riser',
    name: 'Early Riser',
    description: 'Logged 20 sleep sessions with wake time before 9 AM.',
    color: '#065f46',
    symbols: ['☀', '◌', '○', '◈', '△'],
    unlockCondition: '20 early wake logs',
  },
  {
    id: 'deep-diver',
    name: 'Deep Diver',
    description: 'Completed 25 flow state sessions.',
    color: '#1d4ed8',
    symbols: ['∿', '⬡', '◉', '⊕', '◇'],
    unlockCondition: '25 flow sessions',
  },
  {
    id: 'legendary',
    name: 'Legendary Consistency',
    description: 'Maintained a 100-day habit streak.',
    color: '#92400e',
    symbols: ['★', '◈', '●', '◉', '⬙'],
    unlockCondition: '100-day streak',
  },
];
