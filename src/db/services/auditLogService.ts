import { db } from '../db';
import type { AuditAction, AuditLogRecord } from '../schema';

const now = () => new Date().toISOString();
const uid = () => `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type AuditInput = Omit<AuditLogRecord, 'id' | 'createdAt'>;

export const auditLogService = {
  async record(input: AuditInput): Promise<AuditLogRecord> {
    const entry: AuditLogRecord = {
      ...input,
      id: uid(),
      createdAt: now(),
    };
    await db.auditLogs.add(entry);
    return entry;
  },

  async blocked(userId: string, action: AuditAction, resourceType: AuditLogRecord['resourceType'], resourceId?: string, error = 'Unauthorized access'): Promise<void> {
    await this.record({
      userId,
      action,
      resourceType,
      resourceId,
      status: 'blocked',
      error,
    });
  },

  async list(userId: string, limit = 50): Promise<AuditLogRecord[]> {
    const logs = await db.auditLogs.where('userId').equals(userId).toArray();
    return logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  },

  async recentErrors(limit = 20): Promise<AuditLogRecord[]> {
    const logs = await db.auditLogs.toArray();
    return logs
      .filter(l => l.status === 'failed' || l.status === 'blocked' || !!l.error)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },
};
