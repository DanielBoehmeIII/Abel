import { syncJobService } from '../db/services/syncJobService';
import { memoryService } from '../db/services/memoryService';
import { chatService } from '../db/services/chatService';
import { graphService } from '../db/services/graphService';
import { DEMO_USER_ID } from '../db/services/userService';
import type { SyncJobRecord } from '../db/schema';

const POLL_MS = 5_000;
let timerId: ReturnType<typeof setInterval> | null = null;
let processing = false;

async function ensureNotCanceled(job: SyncJobRecord): Promise<void> {
  const current = await syncJobService.get(job.id);
  if (current?.status === 'canceled') throw new Error('Job canceled');
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleMemoryImport(job: SyncJobRecord): Promise<Record<string, unknown>> {
  if (job.payload.fail) throw new Error('Intentional failure requested by job payload');

  const text  = (job.payload.text  as string) ?? '';
  const title = (job.payload.title as string) ?? 'Imported Memory';
  if (!text.trim()) throw new Error('Missing memory import text');

  const chunks = text.split(/\n{2,}/).map(c => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    await ensureNotCanceled(job);
    const chunkTitle = chunks.length === 1
      ? title
      : (chunk.split('\n')[0].slice(0, 60) || title);
    await memoryService.create(job.userId, {
      title: chunkTitle,
      content: chunk,
      type: 'document',
      tags: ['import'],
      source: 'import',
      confidence: 0.8,
    });
  }
  return { created: chunks.length };
}

async function handleChatSummary(job: SyncJobRecord): Promise<Record<string, unknown>> {
  const threadId = job.payload.threadId as string;
  if (!threadId) throw new Error('Missing threadId');

  const thread = await chatService.getThread(job.userId, threadId);
  if (!thread) throw new Error(`Thread ${threadId} not found`);

  const msgs = await chatService.getMessages(job.userId, threadId);
  if (!msgs.length) return { skipped: true };

  const excerpt = msgs
    .slice(-12)
    .map(m => `${m.role === 'user' ? 'User' : 'Abel'}: ${m.content.slice(0, 140)}`)
    .join('\n');

  await memoryService.create(job.userId, {
    title: `Summary: ${thread.title}`,
    content: `Thread summary (${msgs.length} messages):\n\n${excerpt}`,
    type: 'fact',
    tags: ['chat-summary', 'archive'],
    source: 'archive',
    confidence: 0.7,
  });

  return { summarized: msgs.length };
}

async function handleGraphRefresh(job: SyncJobRecord): Promise<Record<string, unknown>> {
  await ensureNotCanceled(job);
  const memories = await memoryService.list(job.userId, { archived: false });
  const existing = await graphService.listNodes(job.userId);
  const existingLabels = new Set(existing.map(n => n.label.toLowerCase()));

  const toAdd = memories.filter(
    m => (m.type === 'goal' || m.type === 'project' || m.type === 'skill') &&
         !existingLabels.has(m.title.toLowerCase())
  );

  for (const mem of toAdd) {
    await ensureNotCanceled(job);
    const node = await graphService.makeNode(mem.title, mem.type, mem.content.slice(0, 200));
    await graphService.upsertNode(job.userId, node);
  }

  return { added: toAdd.length };
}

async function handleEmbeddingRefresh(): Promise<Record<string, unknown>> {
  return { status: 'placeholder', note: 'Vector indexing not yet implemented' };
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function processJob(job: SyncJobRecord): Promise<void> {
  await syncJobService.run(job.id, async runningJob => {
    switch (runningJob.type) {
      case 'memory_import':     return handleMemoryImport(runningJob);
      case 'chat_summary':      return handleChatSummary(runningJob);
      case 'graph_refresh':     return handleGraphRefresh(runningJob);
      case 'embedding_refresh': return handleEmbeddingRefresh();
    }
  });
}

async function tick(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    const pending = await syncJobService.listPending(DEMO_USER_ID);
    if (pending.length) await processJob(pending[0]);
  } finally {
    processing = false;
  }
}

export function startSyncWorker(): void {
  if (timerId !== null) return;
  void tick();
  timerId = setInterval(() => { void tick(); }, POLL_MS);
}

export function stopSyncWorker(): void {
  if (timerId !== null) { clearInterval(timerId); timerId = null; }
}
