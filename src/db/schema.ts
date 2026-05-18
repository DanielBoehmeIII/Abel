// Database schema types — flat table records (no nested objects for indexability).
// These mirror src/types/abel.ts but are optimised for Dexie/IndexedDB storage.
// Future: swap the Dexie implementation for Postgres/Supabase by changing db.ts only.

export interface UserRecord {
  id: string;           // 'demo' or future auth UUID
  name: string;
  email?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type MemoryType = 'fact' | 'preference' | 'goal' | 'project' | 'skill' | 'document' | 'system';

export interface MemoryRecord {
  id: string;
  userId: string;
  title: string;
  content: string;       // body text
  type: MemoryType;
  tags: string[];        // multi-valued index
  source: string;        // 'journal' | 'focus' | 'archive' | 'import' | 'quest'
  confidence: number;    // 0–1
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // AI memory sync hook: embeddings go here when vector search is added
  embeddingId?: string;
}

export interface ChatThreadRecord {
  id: string;
  userId: string;
  title: string;
  journeyId?: string;
  archived: boolean;
  useAsContext: boolean; // flag for future retrieval engine
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  threadId: string;
  userId: string;
  role: 'user' | 'abel';
  content: string;
  createdAt: string;
}

export interface GraphNodeRecord {
  id: string;
  userId: string;
  label: string;
  type: string;
  description: string;
  tags: string[];
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdgeRecord {
  id: string;
  userId: string;
  source: string;
  target: string;
  type: string;
}

export type AITone = 'formal' | 'casual' | 'philosophical' | 'direct';
export type AIVerbosity = 'concise' | 'balanced' | 'verbose';
export type AIExpertiseLevel = 'beginner' | 'intermediate' | 'expert';
export type MemoryUsageLevel = 'minimal' | 'standard' | 'deep';
export type ResponseFormat = 'structured' | 'narrative' | 'hybrid';

export interface AIConfigRecord {
  id: string;
  userId: string;
  tone: AITone;
  verbosity: AIVerbosity;
  expertiseLevel: AIExpertiseLevel;
  codingStyle?: string;
  projectFocus?: string;
  memoryUsageLevel: MemoryUsageLevel;
  responseFormat: ResponseFormat;
  providerPreference?: string;
  customInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export type SyncJobType =
  | 'memory_import'
  | 'chat_summary'
  | 'graph_refresh'
  | 'embedding_refresh'; // placeholder for future vector indexing

export type SyncJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface SyncJobRecord {
  id: string;
  userId: string;
  type: SyncJobType;
  status: SyncJobStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
}
