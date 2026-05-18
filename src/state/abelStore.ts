import type { AbelState, Quest, FocusSession, MemoryItem, ArchiveThread, ArchiveMessage, GraphNode, AbelSettings, UserProfile } from '../types/abel';
import {
  completeQuest, increaseSkillMastery, hatchEgg,
  createMemoryFromFocusSession, updateArchetypeFromEvidence,
} from '../lib/progression';

const iso = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Action Types ─────────────────────────────────────────────────────────────

export type AbelAction =
  | { type: 'COMPLETE_QUEST'; questId: string }
  | { type: 'INCREASE_SKILL'; skillId: string; amount: number }
  | { type: 'HATCH_EGG'; eggId: string }
  | { type: 'START_FOCUS'; session: FocusSession }
  | { type: 'COMPLETE_FOCUS'; sessionId: string; notes: string; reflection: string; score: number }
  | { type: 'CREATE_MEMORY_FROM_FOCUS'; sessionId: string }
  | { type: 'ADD_MEMORY'; memory: MemoryItem }
  | { type: 'ADD_GRAPH_NODE'; node: GraphNode }
  | { type: 'SEND_ARCHIVE_MESSAGE'; threadId: string; message: ArchiveMessage }
  | { type: 'CREATE_ARCHIVE_THREAD'; thread: ArchiveThread }
  | { type: 'ADD_QUEST'; quest: Quest }
  | { type: 'SET_QUEST_ACTIVE'; questId: string }
  | { type: 'UPDATE_USER'; user: Partial<UserProfile> }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AbelSettings> }
  | { type: 'UPDATE_ARCHETYPE' }
  | { type: 'RESET_TO_SEED'; seed: AbelState };

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function abelReducer(state: AbelState, action: AbelAction): AbelState {
  switch (action.type) {

    case 'RESET_TO_SEED':
      return action.seed;

    case 'COMPLETE_QUEST':
      return completeQuest(state, action.questId);

    case 'INCREASE_SKILL':
      return increaseSkillMastery(state, action.skillId, action.amount);

    case 'HATCH_EGG':
      return hatchEgg(state, action.eggId);

    case 'START_FOCUS':
      return { ...state, focusSessions: [...state.focusSessions, action.session] };

    case 'COMPLETE_FOCUS': {
      const sessions = state.focusSessions.map(s =>
        s.id === action.sessionId
          ? { ...s, notes: action.notes, reflection: action.reflection, score: action.score, completedAt: iso() }
          : s
      );
      return { ...state, focusSessions: sessions };
    }

    case 'CREATE_MEMORY_FROM_FOCUS': {
      const session = state.focusSessions.find(s => s.id === action.sessionId);
      if (!session) return state;
      return createMemoryFromFocusSession(state, session);
    }

    case 'ADD_MEMORY':
      return { ...state, memories: [...state.memories, action.memory] };

    case 'ADD_GRAPH_NODE':
      return { ...state, graph: { ...state.graph, nodes: [...state.graph.nodes, action.node] } };

    case 'SEND_ARCHIVE_MESSAGE':
      return {
        ...state,
        archiveThreads: state.archiveThreads.map(t =>
          t.id === action.threadId
            ? { ...t, messages: [...t.messages, action.message] }
            : t
        ),
      };

    case 'CREATE_ARCHIVE_THREAD':
      return { ...state, archiveThreads: [...state.archiveThreads, action.thread] };

    case 'ADD_QUEST':
      return { ...state, quests: [...state.quests, action.quest] };

    case 'SET_QUEST_ACTIVE':
      return {
        ...state,
        quests: state.quests.map(q =>
          q.id === action.questId && q.status === 'available'
            ? { ...q, status: 'active' }
            : q
        ),
      };

    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.user, updatedAt: iso() } };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'UPDATE_ARCHETYPE':
      return updateArchetypeFromEvidence(state);

    default:
      return state;
  }
}

// ─── Helper factories ─────────────────────────────────────────────────────────

export function makeFocusSession(
  mode: FocusSession['mode'],
  intention: string,
  duration: number
): FocusSession {
  return {
    id: `fs-${uid()}`,
    mode,
    intention,
    duration,
    notes: '',
    reflection: '',
    score: 0,
    createdAt: iso(),
  };
}

export function makeMemory(
  title: string,
  body: string,
  source: MemoryItem['source']
): MemoryItem {
  return {
    id: `m-${uid()}`,
    title,
    body,
    source,
    subtypes: ['clarity'],
    relatedGraphNodeIds: [],
    relatedTrophyIds: [],
    createdAt: iso(),
  };
}

export function makeArchiveMessage(role: 'user' | 'abel', content: string): ArchiveMessage {
  return { id: `am-${uid()}`, role, content, createdAt: iso() };
}

export function makeGraphNode(
  label: string,
  type: GraphNode['type'],
  description: string
): GraphNode {
  return {
    id: `gn-${uid()}`,
    label,
    type,
    description,
    tags: [],
    x: 100 + Math.random() * 600,
    y: 100 + Math.random() * 400,
    createdAt: iso(),
  };
}
