import { db } from '../db';
import type { MemoryRecord, MemoryType, MemoryVisibility } from '../schema';
import { auditLogService } from './auditLogService';
import { checkRateLimit } from '../../lib/rateLimit';

const now = () => new Date().toISOString();
const uid = () => `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type MemoryCreateInput = Omit<MemoryRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'archived' | 'visibility'> & {
  visibility?: MemoryVisibility;
};

export interface MemoryFilter {
  type?: MemoryType;
  visibility?: MemoryVisibility;
  tags?: string[];
  archived?: boolean;
  query?: string;  // simple substring match on title + content
}

export const memoryService = {
  async create(
    userId: string,
    data: MemoryCreateInput
  ): Promise<MemoryRecord> {
    checkRateLimit(`memory:create:${userId}`, { limit: 25, windowMs: 60_000 });
    const record: MemoryRecord = {
      ...data,
      id: uid(),
      userId,
      visibility: data.visibility ?? (data.type === 'system' ? 'system' : 'private'),
      archived: false,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.memories.add(record);
    if (record.source === 'import') {
      await auditLogService.record({
        userId,
        action: 'memory_import',
        resourceType: 'memory',
        resourceId: record.id,
        status: 'succeeded',
        metadata: { visibility: record.visibility, type: record.type },
      });
    }
    return record;
  },

  async get(userId: string, id: string): Promise<MemoryRecord | undefined> {
    const record = await db.memories.get(id);
    if (record && record.userId !== userId) {
      await auditLogService.blocked(userId, 'unauthorized_access', 'memory', id);
      throw new Error('Memory access denied');
    }
    return record;
  },

  async list(userId: string, filter: MemoryFilter = {}): Promise<MemoryRecord[]> {
    const coll = db.memories.where('userId').equals(userId);

    const records = await coll.toArray();

    return records.filter(m => {
      if (filter.archived !== undefined && m.archived !== filter.archived) return false;
      if (filter.type && m.type !== filter.type) return false;
      if (filter.visibility && m.visibility !== filter.visibility) return false;
      if (filter.tags?.length) {
        const memTags = new Set(m.tags);
        if (!filter.tags.some(t => memTags.has(t))) return false;
      }
      if (filter.query) {
        const q = filter.query.toLowerCase();
        if (!m.title.toLowerCase().includes(q) && !m.content.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async update(userId: string, id: string, patch: Partial<MemoryRecord>): Promise<void> {
    await this.get(userId, id);
    await db.memories.update(id, { ...patch, updatedAt: now() });
  },

  async archive(userId: string, id: string): Promise<void> {
    await this.get(userId, id);
    await db.memories.update(id, { archived: true, updatedAt: now() });
    await auditLogService.record({ userId, action: 'memory_archive', resourceType: 'memory', resourceId: id, status: 'succeeded' });
  },

  async delete(userId: string, id: string): Promise<void> {
    checkRateLimit(`memory:delete:${userId}`, { limit: 10, windowMs: 60_000 });
    await this.get(userId, id);
    await db.memories.update(id, { deletedAt: now(), archived: true, updatedAt: now() });
    await auditLogService.record({ userId, action: 'memory_delete', resourceType: 'memory', resourceId: id, status: 'succeeded' });
  },

  async bulkCreate(userId: string, records: MemoryCreateInput[]): Promise<MemoryRecord[]> {
    const created = records.map(data => ({
      ...data,
      id: uid(),
      userId,
      visibility: data.visibility ?? (data.type === 'system' ? 'system' : 'private'),
      archived: false,
      createdAt: now(),
      updatedAt: now(),
    }));
    await db.memories.bulkAdd(created);
    return created;
  },
};
