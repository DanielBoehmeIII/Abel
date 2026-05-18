import { db } from '../db';
import { auditLogService } from './auditLogService';
import type { AuditLogRecord, SyncJobStatus } from '../schema';

export interface AdminSummary {
  userCount: number;
  memoryCount: number;
  chatCount: number;
  syncJobStatus: Record<SyncJobStatus, number>;
  recentErrors: Pick<AuditLogRecord, 'id' | 'action' | 'resourceType' | 'status' | 'error' | 'createdAt'>[];
}

const EMPTY_STATUS: Record<SyncJobStatus, number> = {
  pending: 0,
  running: 0,
  succeeded: 0,
  failed: 0,
  canceled: 0,
};

export const adminService = {
  async summary(): Promise<AdminSummary> {
    const [users, memories, chats, jobs, errors] = await Promise.all([
      db.users.count(),
      db.memories.count(),
      db.chatThreads.count(),
      db.syncJobs.toArray(),
      auditLogService.recentErrors(10),
    ]);

    const syncJobStatus = { ...EMPTY_STATUS };
    for (const job of jobs) syncJobStatus[job.status] += 1;

    return {
      userCount: users,
      memoryCount: memories,
      chatCount: chats,
      syncJobStatus,
      recentErrors: errors.map(e => ({
        id: e.id,
        action: e.action,
        resourceType: e.resourceType,
        status: e.status,
        error: e.error,
        createdAt: e.createdAt,
      })),
    };
  },
};
