import { db } from '../db';
import type { SyncJobRecord, SyncJobType, SyncJobStatus } from '../schema';

const now = () => new Date().toISOString();
const uid = () => `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const syncJobService = {
  async create(
    userId: string,
    type: SyncJobType,
    payload: Record<string, unknown> = {}
  ): Promise<SyncJobRecord> {
    const job: SyncJobRecord = {
      id: uid(),
      userId,
      type,
      status: 'pending',
      payload,
      retryCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.syncJobs.add(job);
    return job;
  },

  async get(id: string): Promise<SyncJobRecord | undefined> {
    return db.syncJobs.get(id);
  },

  async list(userId: string, status?: SyncJobStatus): Promise<SyncJobRecord[]> {
    let records = await db.syncJobs.where('userId').equals(userId).toArray();
    if (status) records = records.filter(j => j.status === status);
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async setStatus(id: string, status: SyncJobStatus, patch: Partial<SyncJobRecord> = {}): Promise<void> {
    const update: Partial<SyncJobRecord> = { status, updatedAt: now(), ...patch };
    if (status === 'running' && !patch.startedAt)   update.startedAt  = now();
    if ((status === 'succeeded' || status === 'failed') && !patch.finishedAt) update.finishedAt = now();
    await db.syncJobs.update(id, update);
  },

  async retry(id: string): Promise<void> {
    const job = await db.syncJobs.get(id);
    if (!job) return;
    await db.syncJobs.update(id, {
      status: 'pending',
      retryCount: job.retryCount + 1,
      error: undefined,
      startedAt: undefined,
      finishedAt: undefined,
      updatedAt: now(),
    });
  },

  async cancel(id: string): Promise<void> {
    await db.syncJobs.update(id, { status: 'canceled', updatedAt: now() });
  },
};
