import Dexie, { type Table } from 'dexie';
import type {
  UserRecord, WorkspaceRecord, MemoryRecord, ChatThreadRecord,
  ChatMessageRecord, GraphNodeRecord, GraphEdgeRecord,
  AIConfigRecord, SyncJobRecord,
  AuditLogRecord,
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
  auditLogs!:    Table<AuditLogRecord,    string>;

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
      auditLogs:    '&id, userId, action, status, createdAt',
    });

    this.version(2).stores({
      users:        '&id, email',
      workspaces:   '&id, userId, createdAt',
      memories:     '&id, userId, type, archived, createdAt, *tags',
      chatThreads:  '&id, userId, archived, createdAt',
      chatMessages: '&id, threadId, userId, createdAt',
      graphNodes:   '&id, userId, type, createdAt',
      graphEdges:   '&id, userId, source, target',
      aiConfigs:    '&id, userId',
      syncJobs:     '&id, userId, type, status, createdAt, updatedAt',
      auditLogs:    '&id, userId, action, status, createdAt',
    });

    this.version(3).stores({
      users:        '&id, email',
      workspaces:   '&id, userId, createdAt',
      memories:     '&id, userId, type, visibility, archived, createdAt, *tags',
      chatThreads:  '&id, userId, archived, createdAt',
      chatMessages: '&id, threadId, userId, createdAt',
      graphNodes:   '&id, userId, type, createdAt',
      graphEdges:   '&id, userId, source, target',
      aiConfigs:    '&id, userId',
      syncJobs:     '&id, userId, type, status, createdAt, updatedAt',
      auditLogs:    '&id, userId, action, status, createdAt',
    }).upgrade(tx => tx.table('memories').toCollection().modify(memory => {
      if (!memory.visibility) memory.visibility = memory.type === 'system' ? 'system' : 'private';
    }));
  }
}

export const db = new AbelDatabase();
