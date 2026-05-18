import { db } from '../db';
import type { UserRecord } from '../schema';

export const DEMO_USER_ID = 'demo';

const now = () => new Date().toISOString();

export const userService = {
  async get(id: string): Promise<UserRecord | undefined> {
    return db.users.get(id);
  },

  async upsert(record: Omit<UserRecord, 'updatedAt'>): Promise<void> {
    await db.users.put({ ...record, updatedAt: now() });
  },

  async update(id: string, patch: Partial<UserRecord>): Promise<void> {
    await db.users.update(id, { ...patch, updatedAt: now() });
  },
};
