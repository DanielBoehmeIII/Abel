import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type {
  AppState, FocusSession, Habit, PlannerTask, SleepLog,
  FitnessDay, LearningDay, JournalEntry, MemoryItem,
} from './types';
import { get, set } from './storage';

// ─── Default State ────────────────────────────────────────────────────────────

const iso = () => new Date().toISOString();

const DEFAULT_HABITS: Habit[] = [
  { id: 'water',   label: 'Drink Water',          icon: '◌', completedDates: [], createdAt: iso() },
  { id: 'morning', label: 'Morning Routine',       icon: '☀', completedDates: [], createdAt: iso() },
  { id: 'notes',   label: 'Review Notes',          icon: '▣', completedDates: [], createdAt: iso() },
  { id: 'sleep',   label: 'Sleep Before Midnight', icon: '☽', completedDates: [], createdAt: iso() },
  { id: 'cleanup', label: '10 Min Cleanup',        icon: '⊛', completedDates: [], createdAt: iso() },
];

const DEFAULT_TASKS: PlannerTask[] = [
  'Deep work block', 'Calculus review', 'Chinese journal', 'Gym session', 'Plan tomorrow',
].map((text, i) => ({
  id: `default-${i + 1}`,
  text,
  done: false,
  createdAt: iso(),
  xp: 25,
}));

const DEFAULT_STATE: AppState = {
  xp: 0,
  focusSessions: [],
  habits: DEFAULT_HABITS,
  plannerTasks: DEFAULT_TASKS,
  sleepLogs: [],
  fitnessHistory: [],
  learningHistory: [],
  journalEntries: [],
  skillsCompleted: [],
  memories: [],
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'ADD_FOCUS_SESSION'; session: FocusSession }
  | { type: 'TOGGLE_HABIT'; habitId: string; date: string }
  | { type: 'ADD_HABIT'; habit: Habit }
  | { type: 'DELETE_HABIT'; id: string }
  | { type: 'ADD_PLANNER_TASK'; task: PlannerTask }
  | { type: 'TOGGLE_PLANNER_TASK'; id: string }
  | { type: 'DELETE_PLANNER_TASK'; id: string }
  | { type: 'EDIT_PLANNER_TASK'; id: string; text: string }
  | { type: 'ADD_SLEEP_LOG'; log: SleepLog }
  | { type: 'SET_FITNESS_DAY'; day: FitnessDay }
  | { type: 'SET_LEARNING_DAY'; day: LearningDay }
  | { type: 'ADD_JOURNAL_ENTRY'; entry: JournalEntry }
  | { type: 'EDIT_JOURNAL_ENTRY'; id: string; updates: Partial<Pick<JournalEntry, 'title' | 'text' | 'tags'>> }
  | { type: 'DELETE_JOURNAL_ENTRY'; id: string }
  | { type: 'COMPLETE_SKILL'; id: string; xp: number }
  | { type: 'IMPORT_MEMORIES'; items: MemoryItem[] };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case 'ADD_FOCUS_SESSION':
      return {
        ...state,
        xp: state.xp + (action.session.completed ? action.session.xp : 0),
        focusSessions: [...state.focusSessions, action.session],
      };

    case 'TOGGLE_HABIT': {
      const habit = state.habits.find(h => h.id === action.habitId);
      if (!habit) return state;
      const hadDate = habit.completedDates.includes(action.date);
      const updatedHabits = state.habits.map(h =>
        h.id !== action.habitId ? h : {
          ...h,
          completedDates: hadDate
            ? h.completedDates.filter(d => d !== action.date)
            : [...h.completedDates, action.date],
        }
      );
      return {
        ...state,
        xp: hadDate ? state.xp : state.xp + 15,
        habits: updatedHabits,
      };
    }

    case 'ADD_HABIT':
      return { ...state, habits: [...state.habits, action.habit] };

    case 'DELETE_HABIT':
      return { ...state, habits: state.habits.filter(h => h.id !== action.id) };

    case 'ADD_PLANNER_TASK':
      return { ...state, plannerTasks: [...state.plannerTasks, action.task] };

    case 'TOGGLE_PLANNER_TASK': {
      const task = state.plannerTasks.find(t => t.id === action.id);
      if (!task) return state;
      const completing = !task.done;
      return {
        ...state,
        xp: completing ? state.xp + 25 : state.xp,
        plannerTasks: state.plannerTasks.map(t =>
          t.id !== action.id ? t : {
            ...t,
            done: !t.done,
            completedAt: completing ? iso() : undefined,
          }
        ),
      };
    }

    case 'DELETE_PLANNER_TASK':
      return { ...state, plannerTasks: state.plannerTasks.filter(t => t.id !== action.id) };

    case 'EDIT_PLANNER_TASK':
      return {
        ...state,
        plannerTasks: state.plannerTasks.map(t =>
          t.id === action.id ? { ...t, text: action.text } : t
        ),
      };

    case 'ADD_SLEEP_LOG':
      return {
        ...state,
        xp: state.xp + 10,
        sleepLogs: [action.log, ...state.sleepLogs],
      };

    case 'SET_FITNESS_DAY': {
      const prev = state.fitnessHistory.find(d => d.date === action.day.date);
      const prevCount = prev ? Object.values(prev.items).filter(Boolean).length : 0;
      const newCount = Object.values(action.day.items).filter(Boolean).length;
      const xpGain = Math.max(0, newCount - prevCount) * 10;
      return {
        ...state,
        xp: state.xp + xpGain,
        fitnessHistory: [
          ...state.fitnessHistory.filter(d => d.date !== action.day.date),
          action.day,
        ],
      };
    }

    case 'SET_LEARNING_DAY': {
      const prev = state.learningHistory.find(d => d.date === action.day.date);
      const prevCount = prev ? Object.values(prev.checked).filter(Boolean).length : 0;
      const newCount = Object.values(action.day.checked).filter(Boolean).length;
      const xpGain = Math.max(0, newCount - prevCount) * 20;
      return {
        ...state,
        xp: state.xp + xpGain,
        learningHistory: [
          ...state.learningHistory.filter(d => d.date !== action.day.date),
          action.day,
        ],
      };
    }

    case 'ADD_JOURNAL_ENTRY':
      return {
        ...state,
        xp: state.xp + 20,
        journalEntries: [action.entry, ...state.journalEntries],
      };

    case 'EDIT_JOURNAL_ENTRY':
      return {
        ...state,
        journalEntries: state.journalEntries.map(e =>
          e.id !== action.id ? e : { ...e, ...action.updates, updatedAt: iso() }
        ),
      };

    case 'DELETE_JOURNAL_ENTRY':
      return { ...state, journalEntries: state.journalEntries.filter(e => e.id !== action.id) };

    case 'COMPLETE_SKILL': {
      if (state.skillsCompleted.includes(action.id)) return state;
      return {
        ...state,
        xp: state.xp + action.xp,
        skillsCompleted: [...state.skillsCompleted, action.id],
      };
    }

    case 'IMPORT_MEMORIES':
      return { ...state, memories: [...state.memories, ...action.items] };

    default:
      return state;
  }
}

// ─── Derived Helpers ──────────────────────────────────────────────────────────

export const ARCHETYPES = [
  { id: 'novice',     label: 'Novice',      xp: 0,     desc: 'Learning the system.',     icon: '◌' },
  { id: 'apprentice', label: 'Apprentice',  xp: 5000,  desc: 'Building consistency.',    icon: '◈' },
  { id: 'adept',      label: 'Adept',       xp: 15000, desc: 'Refining skill loops.',     icon: '⬡' },
  { id: 'master',     label: 'Master',      xp: 35000, desc: 'Compounding mastery.',      icon: '◉' },
  { id: 'legend',     label: 'Legend',      xp: 75000, desc: 'Embodied discipline.',      icon: '★' },
] as const;

export type Archetype = typeof ARCHETYPES[number];

export function computeArchetype(xp: number): Archetype {
  let current: Archetype = ARCHETYPES[0];
  for (const a of ARCHETYPES) {
    if (xp >= a.xp) current = a;
    else break;
  }
  return current;
}

export function computeStreak(completedDates: string[]): number {
  if (!completedDates.length) return 0;
  const unique = [...new Set(completedDates)].sort().reverse();
  const todayD = new Date();
  const todayStr = todayD.toISOString().split('T')[0];
  const yestD = new Date(todayD);
  yestD.setDate(yestD.getDate() - 1);
  const yestStr = yestD.toISOString().split('T')[0];

  const start = unique[0] === todayStr ? todayStr : unique[0] === yestStr ? yestStr : null;
  if (!start) return 0;

  let streak = 0;
  let cur = start;
  for (const d of unique) {
    if (d === cur) {
      streak++;
      const next = new Date(cur);
      next.setDate(next.getDate() - 1);
      cur = next.toISOString().split('T')[0];
    } else if (d < cur) {
      break;
    }
  }
  return streak;
}

export function computeUnlockedTrophyIds(state: AppState): Set<string> {
  const ids = new Set<string>();

  const totalFocusSecs = state.focusSessions
    .filter(s => s.completed)
    .reduce((sum, s) => sum + s.duration, 0);
  if (totalFocusSecs >= 36000) ids.add('focus-champion');

  const maxStreak = state.habits.length
    ? Math.max(...state.habits.map(h => computeStreak(h.completedDates)))
    : 0;
  if (maxStreak >= 30) ids.add('habit-builder');
  if (maxStreak >= 100) ids.add('legendary');

  const earlyRisers = state.sleepLogs.filter(l => l.wake < '09:00').length;
  if (earlyRisers >= 20) ids.add('early-riser');

  const flowCount = state.focusSessions.filter(s => s.type === 'flow' && s.completed).length;
  if (flowCount >= 25) ids.add('deep-diver');

  return ids;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  archetype: Archetype;
  unlockedTrophyIds: Set<string>;
  todayStr: string;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = 'abel_v2';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, () => {
    const saved = get<Partial<AppState>>(STORAGE_KEY, {});
    return { ...DEFAULT_STATE, ...saved };
  });

  useEffect(() => {
    set(STORAGE_KEY, state);
  }, [state]);

  const archetype = computeArchetype(state.xp);
  const unlockedTrophyIds = computeUnlockedTrophyIds(state);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <AppContext.Provider value={{ state, dispatch, archetype, unlockedTrophyIds, todayStr }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
