import { db } from '../db';
import type { MemoryRecord, MemoryType } from '../schema';

const now = () => new Date().toISOString();
const uid = () => `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface MemoryFilter {
  type?: MemoryType;
  tags?: string[];
  archived?: boolean;
  query?: string;  // simple substring match on title + content
}

export const memoryService = {
  async create(
    userId: string,
    data: Omit<MemoryRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'archived'>
  ): Promise<MemoryRecord> {
    const record: MemoryRecord = {
      ...data,
      id: uid(),
      userId,
      archived: false,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.memories.add(record);
    return record;
  },

  async get(id: string): Promise<MemoryRecord | undefined> {
    return db.memories.get(id);
  },

  async list(userId: string, filter: MemoryFilter = {}): Promise<MemoryRecord[]> {
    const coll = db.memories.where('userId').equals(userId);

    const records = await coll.toArray();

    return records.filter(m => {
      if (filter.archived !== undefined && m.archived !== filter.archived) return false;
      if (filter.type && m.type !== filter.type) return false;
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

  async update(id: string, patch: Partial<MemoryRecord>): Promise<void> {
    await db.memories.update(id, { ...patch, updatedAt: now() });
  },

  async archive(id: string): Promise<void> {
    await db.memories.update(id, { archived: true, updatedAt: now() });
  },

  async delete(id: string): Promise<void> {
    await db.memories.update(id, { deletedAt: now(), archived: true, updatedAt: now() });
  },

  async bulkCreate(userId: string, records: Omit<MemoryRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'archived'>[]): Promise<MemoryRecord[]> {
    const created = records.map(data => ({
      ...data,
      id: uid(),
      userId,
      archived: false,
      createdAt: now(),
      updatedAt: now(),
    }));
    await db.memories.bulkAdd(created);
    return created;
  },
};
