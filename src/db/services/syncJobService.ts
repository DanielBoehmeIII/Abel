import { db } from '../db';
import type { SyncJobRecord, SyncJobType, SyncJobStatus } from '../schema';

const now = () => new Date().toISOString();
const uid = () => `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type JobResult = Record<string, unknown>;
export type SyncJobRunner = (job: SyncJobRecord) => Promise<JobResult | void>;

function terminal(status: SyncJobStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'canceled';
}

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

  async createTestJob(userId: string, shouldFail = false): Promise<SyncJobRecord> {
    return this.create(userId, 'memory_import', {
      title: shouldFail ? 'Failing test import' : 'Local test import',
      text: shouldFail ? '' : 'This is a local sync worker test memory.',
      fail: shouldFail,
    });
  },

  async get(id: string): Promise<SyncJobRecord | undefined> {
    return db.syncJobs.get(id);
  },

  async list(userId: string, status?: SyncJobStatus): Promise<SyncJobRecord[]> {
    let records = await db.syncJobs.where('userId').equals(userId).toArray();
    if (status) records = records.filter(j => j.status === status);
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listPending(userId?: string): Promise<SyncJobRecord[]> {
    let records = await db.syncJobs.where('status').equals('pending').toArray();
    if (userId) records = records.filter(j => j.userId === userId);
    return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async setStatus(id: string, status: SyncJobStatus, patch: Partial<SyncJobRecord> = {}): Promise<void> {
    const update: Partial<SyncJobRecord> = { status, updatedAt: now(), ...patch };
    if (status === 'running' && !patch.startedAt)   update.startedAt  = now();
    if (terminal(status) && !patch.finishedAt) update.finishedAt = now();
    await db.syncJobs.update(id, update);
  },

  async run(id: string, runner: SyncJobRunner): Promise<SyncJobRecord | undefined> {
    const job = await db.syncJobs.get(id);
    if (!job) return undefined;
    if (job.status === 'canceled') return job;
    if (job.status !== 'pending') return job;

    const startedAt = now();
    await db.syncJobs.update(id, {
      status: 'running',
      error: undefined,
      result: undefined,
      startedAt,
      finishedAt: undefined,
      updatedAt: startedAt,
    });

    const runningJob = { ...job, status: 'running' as const, startedAt, updatedAt: startedAt };

    try {
      const result = (await runner(runningJob)) ?? {};
      const latest = await db.syncJobs.get(id);
      if (!latest || latest.status === 'canceled') return latest;

      const finishedAt = now();
      await db.syncJobs.update(id, {
        status: 'succeeded',
        result,
        error: undefined,
        finishedAt,
        updatedAt: finishedAt,
      });
    } catch (err) {
      const latest = await db.syncJobs.get(id);
      if (!latest || latest.status === 'canceled') return latest;

      const finishedAt = now();
      await db.syncJobs.update(id, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        finishedAt,
        updatedAt: finishedAt,
      });
    }

    return db.syncJobs.get(id);
  },

  async retry(id: string): Promise<void> {
    const job = await db.syncJobs.get(id);
    if (!job || job.status === 'running') return;
    await db.syncJobs.update(id, {
      status: 'pending',
      retryCount: job.retryCount + 1,
      error: undefined,
      result: undefined,
      startedAt: undefined,
      finishedAt: undefined,
      updatedAt: now(),
    });
  },

  async cancel(id: string): Promise<void> {
    const job = await db.syncJobs.get(id);
    if (!job || terminal(job.status)) return;
    await db.syncJobs.update(id, { status: 'canceled', finishedAt: now(), updatedAt: now() });
  },
};
