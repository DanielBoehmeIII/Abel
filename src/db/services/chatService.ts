import { db } from '../db';
import type { ChatThreadRecord, ChatMessageRecord } from '../schema';

const now = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const chatService = {
  // ── Threads ────────────────────────────────────────────────────────────────

  async createThread(userId: string, title: string, journeyId?: string): Promise<ChatThreadRecord> {
    const thread: ChatThreadRecord = {
      id: `t-${uid()}`,
      userId,
      title,
      journeyId,
      archived: false,
      useAsContext: false,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.chatThreads.add(thread);
    return thread;
  },

  async listThreads(userId: string, includeArchived = false): Promise<ChatThreadRecord[]> {
    const all = await db.chatThreads.where('userId').equals(userId).toArray();
    const filtered = includeArchived ? all : all.filter(t => !t.archived);
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getThread(id: string): Promise<ChatThreadRecord | undefined> {
    return db.chatThreads.get(id);
  },

  async renameThread(id: string, title: string): Promise<void> {
    await db.chatThreads.update(id, { title, updatedAt: now() });
  },

  async archiveThread(id: string): Promise<void> {
    await db.chatThreads.update(id, { archived: true, updatedAt: now() });
  },

  async setThreadContext(id: string, useAsContext: boolean): Promise<void> {
    await db.chatThreads.update(id, { useAsContext, updatedAt: now() });
  },

  // ── Messages ───────────────────────────────────────────────────────────────

  async appendMessage(
    threadId: string,
    userId: string,
    role: 'user' | 'abel',
    content: string
  ): Promise<ChatMessageRecord> {
    const msg: ChatMessageRecord = {
      id: `msg-${uid()}`,
      threadId,
      userId,
      role,
      content,
      createdAt: now(),
    };
    await db.chatMessages.add(msg);
    await db.chatThreads.update(threadId, { updatedAt: now() });
    return msg;
  },

  async getMessages(threadId: string): Promise<ChatMessageRecord[]> {
    const msgs = await db.chatMessages.where('threadId').equals(threadId).toArray();
    return msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async searchMessages(userId: string, query: string): Promise<ChatMessageRecord[]> {
    const all = await db.chatMessages.where('userId').equals(userId).toArray();
    const q = query.toLowerCase();
    return all.filter(m => m.content.toLowerCase().includes(q))
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};
