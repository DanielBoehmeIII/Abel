import { db } from '../db';
import type { ChatThreadRecord, ChatMessageRecord } from '../schema';
import { auditLogService } from './auditLogService';
import { checkRateLimit } from '../../lib/rateLimit';

const now = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const chatService = {
  // ── Threads ────────────────────────────────────────────────────────────────

  async createThread(userId: string, title: string, journeyId?: string): Promise<ChatThreadRecord> {
    checkRateLimit(`chat:create:${userId}`, { limit: 20, windowMs: 60_000 });
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

  async getThread(userId: string, id: string): Promise<ChatThreadRecord | undefined> {
    const thread = await db.chatThreads.get(id);
    if (thread && thread.userId !== userId) {
      await auditLogService.blocked(userId, 'unauthorized_access', 'chat', id);
      throw new Error('Chat access denied');
    }
    return thread;
  },

  async renameThread(userId: string, id: string, title: string): Promise<void> {
    await this.getThread(userId, id);
    await db.chatThreads.update(id, { title, updatedAt: now() });
  },

  async archiveThread(userId: string, id: string): Promise<void> {
    await this.getThread(userId, id);
    await db.chatThreads.update(id, { archived: true, updatedAt: now() });
    await auditLogService.record({ userId, action: 'chat_archive', resourceType: 'chat', resourceId: id, status: 'succeeded' });
  },

  async deleteThread(userId: string, id: string): Promise<void> {
    checkRateLimit(`chat:delete:${userId}`, { limit: 10, windowMs: 60_000 });
    await this.getThread(userId, id);
    await db.transaction('rw', db.chatThreads, db.chatMessages, async () => {
      await db.chatMessages.where('threadId').equals(id).delete();
      await db.chatThreads.delete(id);
    });
    await auditLogService.record({ userId, action: 'chat_delete', resourceType: 'chat', resourceId: id, status: 'succeeded' });
  },

  async setThreadContext(userId: string, id: string, useAsContext: boolean): Promise<void> {
    await this.getThread(userId, id);
    await db.chatThreads.update(id, { useAsContext, updatedAt: now() });
  },

  // ── Messages ───────────────────────────────────────────────────────────────

  async appendMessage(
    threadId: string,
    userId: string,
    role: 'user' | 'abel',
    content: string
  ): Promise<ChatMessageRecord> {
    const thread = await this.getThread(userId, threadId);
    if (!thread) throw new Error('Thread not found');
    checkRateLimit(`chat:message:${userId}`, { limit: 60, windowMs: 60_000 });
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

  async getMessages(userId: string, threadId: string): Promise<ChatMessageRecord[]> {
    await this.getThread(userId, threadId);
    const msgs = await db.chatMessages.where('threadId').equals(threadId).toArray();
    return msgs
      .filter(m => m.userId === userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async searchMessages(userId: string, query: string): Promise<ChatMessageRecord[]> {
    const all = await db.chatMessages.where('userId').equals(userId).toArray();
    const q = query.toLowerCase();
    return all.filter(m => m.content.toLowerCase().includes(q))
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};
