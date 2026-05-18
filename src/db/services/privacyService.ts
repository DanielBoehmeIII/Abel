import { db } from '../db';
import { auditLogService } from './auditLogService';
import { checkRateLimit } from '../../lib/rateLimit';

export interface UserDataExport {
  exportedAt: string;
  userId: string;
  user: unknown;
  workspaces: unknown[];
  memories: unknown[];
  chatThreads: unknown[];
  chatMessages: unknown[];
  graphNodes: unknown[];
  graphEdges: unknown[];
  aiConfigs: unknown[];
  syncJobs: unknown[];
  auditLogs: unknown[];
}

export const privacyService = {
  async exportUserData(userId: string): Promise<UserDataExport> {
    checkRateLimit(`data:export:${userId}`, { limit: 5, windowMs: 60_000 });

    const [
      user,
      workspaces,
      memories,
      chatThreads,
      chatMessages,
      graphNodes,
      graphEdges,
      aiConfigs,
      syncJobs,
      auditLogs,
    ] = await Promise.all([
      db.users.get(userId),
      db.workspaces.where('userId').equals(userId).toArray(),
      db.memories.where('userId').equals(userId).toArray(),
      db.chatThreads.where('userId').equals(userId).toArray(),
      db.chatMessages.where('userId').equals(userId).toArray(),
      db.graphNodes.where('userId').equals(userId).toArray(),
      db.graphEdges.where('userId').equals(userId).toArray(),
      db.aiConfigs.where('userId').equals(userId).toArray(),
      db.syncJobs.where('userId').equals(userId).toArray(),
      db.auditLogs.where('userId').equals(userId).toArray(),
    ]);

    await auditLogService.record({
      userId,
      action: 'data_export',
      resourceType: 'data',
      status: 'succeeded',
      metadata: {
        memories: memories.length,
        chatThreads: chatThreads.length,
        chatMessages: chatMessages.length,
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      userId,
      user,
      workspaces,
      memories,
      chatThreads,
      chatMessages,
      graphNodes,
      graphEdges,
      aiConfigs,
      syncJobs,
      auditLogs,
    };
  },

  async deleteUserData(userId: string): Promise<void> {
    checkRateLimit(`data:delete:${userId}`, { limit: 2, windowMs: 60_000 });

    await db.transaction(
      'rw',
      [db.workspaces, db.memories, db.chatThreads, db.chatMessages, db.graphNodes, db.graphEdges, db.aiConfigs, db.syncJobs],
      async () => {
        await Promise.all([
          db.workspaces.where('userId').equals(userId).delete(),
          db.memories.where('userId').equals(userId).delete(),
          db.chatThreads.where('userId').equals(userId).delete(),
          db.chatMessages.where('userId').equals(userId).delete(),
          db.graphNodes.where('userId').equals(userId).delete(),
          db.graphEdges.where('userId').equals(userId).delete(),
          db.aiConfigs.where('userId').equals(userId).delete(),
          db.syncJobs.where('userId').equals(userId).delete(),
        ]);
      },
    );

    await auditLogService.record({
      userId,
      action: 'data_delete',
      resourceType: 'data',
      status: 'succeeded',
    });
  },
};
