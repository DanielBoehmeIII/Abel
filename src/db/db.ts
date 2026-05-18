import Dexie, { type Table } from 'dexie';
import type {
  UserRecord, WorkspaceRecord, MemoryRecord, ChatThreadRecord,
  ChatMessageRecord, GraphNodeRecord, GraphEdgeRecord,
  AIConfigRecord, SyncJobRecord,
} from './schema';

export class AbelDatabase extends Dexie {
  users!:        Table<UserRecord,        string>;
  workspaces!:   Table<WorkspaceRecord,   string>;
  memories!:     Table<MemoryRecord,      string>;
  chatThreads!:  Table<ChatThreadRecord,  string>;
  chatMessages!: Table<ChatMessageRecord, string>;
  graphNodes!:   Table<GraphNodeRecord,   string>;
  graphEdges!:   Table<GraphEdgeRecord,   string>;
  aiConfigs!:    Table<AIConfigRecord,    string>;
  syncJobs!:     Table<SyncJobRecord,     string>;

  constructor() {
    super('AbelDB');

    this.version(1).stores({
      users:        '&id, email',
      workspaces:   '&id, userId, createdAt',
      memories:     '&id, userId, type, archived, createdAt, *tags',
      chatThreads:  '&id, userId, archived, createdAt',
      chatMessages: '&id, threadId, userId, createdAt',
      graphNodes:   '&id, userId, type, createdAt',
      graphEdges:   '&id, userId, source, target',
      aiConfigs:    '&id, userId',
      syncJobs:     '&id, userId, type, status, createdAt',
    });
  }
}

export const db = new AbelDatabase();
