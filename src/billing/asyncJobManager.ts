import { db } from '../db';

const iso = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export type AsyncJobType = 'memory_import' | 'chat_summary' | 'graph_refresh' | 'embedding_refresh' | 'export' | 'bulk_operation';
export type AsyncJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface AsyncJob {
  id: string;
  userId: string;
  type: AsyncJobType;
  status: AsyncJobStatus;
  priority: number;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  progress: number;
  estimatedCostCents: number;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export async function enqueueJob(
  userId: string,
  type: AsyncJobType,
  payload: Record<string, unknown>,
  priority: number = 0,
  estimatedCostCents: number = 0,
): Promise<AsyncJob> {
  const job: AsyncJob = {
    id: `aj-${uid()}`,
    userId,
    type,
    status: 'pending',
    priority,
    payload,
    progress: 0,
    estimatedCostCents,
    retryCount: 0,
    maxRetries: 3,
    createdAt: iso(),
  };
  await db.table('asyncJobs').put(job);
  return job;
}

export async function getPendingJobs(): Promise<AsyncJob[]> {
  const jobs = await db.table('asyncJobs').where('status').equals('pending').toArray() as AsyncJob[];
  return jobs.sort((a, b) => b.priority - a.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function startJob(jobId: string): Promise<void> {
  await db.table('asyncJobs').update(jobId, { status: 'running', startedAt: iso() });
}

export async function completeJob(jobId: string, result: Record<string, unknown>): Promise<void> {
  await db.table('asyncJobs').update(jobId, { status: 'succeeded', result, progress: 100, finishedAt: iso() });
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await db.table('asyncJobs').update(jobId, { status: 'failed', error, finishedAt: iso() });
}

export async function retryJob(jobId: string): Promise<AsyncJob | null> {
  const job = await db.table('asyncJobs').get(jobId) as AsyncJob | undefined;
  if (!job || job.retryCount >= job.maxRetries) return null;
  await db.table('asyncJobs').update(jobId, {
    status: 'pending',
    retryCount: job.retryCount + 1,
    progress: 0,
    error: undefined,
    finishedAt: undefined,
  });
  return { ...job, status: 'pending' as const, retryCount: job.retryCount + 1 };
}

export async function getJobsForUser(userId: string, limit: number = 20): Promise<AsyncJob[]> {
  return db.table('asyncJobs')
    .where('userId').equals(userId)
    .reverse()
    .limit(limit)
    .toArray() as Promise<AsyncJob[]>;
}

declare module '../db/db' {
  interface AbelDatabase {
    asyncJobs: import('dexie').Table<AsyncJob, string>;
  }
}
