// Seed the IndexedDB from the current AbelState on first run.
// This gives every user a working dataset without needing a backend.
// Called once from AbelProvider when the DB has no user record yet.

import { db } from './db';
import { DEMO_USER_ID } from './services/userService';
import { DEFAULT_AI_CONFIG } from './services/aiConfigService';
import type { AbelState } from '../types/abel';
import type { MemoryRecord, ChatThreadRecord, ChatMessageRecord, GraphNodeRecord, GraphEdgeRecord } from './schema';

const now = () => new Date().toISOString();

export async function seedDatabaseFromState(state: AbelState): Promise<void> {
  await db.transaction('rw',
    [db.users, db.workspaces, db.memories, db.chatThreads,
     db.chatMessages, db.graphNodes, db.graphEdges,
     db.aiConfigs, db.syncJobs],
    async () => {
      // User
      await db.users.put({
        id: DEMO_USER_ID,
        name: state.user.name,
        title: state.user.title,
        createdAt: state.user.createdAt,
        updatedAt: now(),
      });

      // Default workspace
      await db.workspaces.put({
        id: 'ws-default',
        userId: DEMO_USER_ID,
        name: 'Personal',
        description: 'Default personal workspace',
        createdAt: state.user.createdAt,
        updatedAt: now(),
      });

      // AI config — default settings
      await db.aiConfigs.put({
        ...DEFAULT_AI_CONFIG,
        id: `aicfg-${DEMO_USER_ID}`,
        userId: DEMO_USER_ID,
        providerPreference: state.settings.llmProvider,
        createdAt: now(),
        updatedAt: now(),
      });

      // Memories from state
      const memoryRecords: MemoryRecord[] = state.memories.map(m => ({
        id: m.id,
        userId: DEMO_USER_ID,
        title: m.title,
        content: m.body,
        type: 'fact' as const,
        tags: m.subtypes ?? [],
        source: m.source,
        confidence: 0.8,
        archived: false,
        createdAt: m.createdAt,
        updatedAt: m.createdAt,
      }));
      if (memoryRecords.length) await db.memories.bulkAdd(memoryRecords);

      // Chat threads + messages from archive
      const threadRecords: ChatThreadRecord[] = state.archiveThreads.map(t => ({
        id: t.id,
        userId: DEMO_USER_ID,
        title: t.title,
        journeyId: t.journeyId,
        archived: false,
        useAsContext: false,
        createdAt: t.createdAt,
        updatedAt: t.createdAt,
      }));
      if (threadRecords.length) await db.chatThreads.bulkAdd(threadRecords);

      const msgRecords: ChatMessageRecord[] = state.archiveThreads.flatMap(t =>
        t.messages.map(m => ({
          id: m.id,
          threadId: t.id,
          userId: DEMO_USER_ID,
          role: m.role as 'user' | 'abel',
          content: m.content,
          createdAt: m.createdAt,
        }))
      );
      if (msgRecords.length) await db.chatMessages.bulkAdd(msgRecords);

      // Graph nodes + edges
      const nodeRecords: GraphNodeRecord[] = state.graph.nodes.map(n => ({
        id: n.id,
        userId: DEMO_USER_ID,
        label: n.label,
        type: n.type,
        description: n.description,
        tags: n.tags ?? [],
        x: n.x,
        y: n.y,
        createdAt: n.createdAt,
        updatedAt: n.createdAt,
      }));
      if (nodeRecords.length) await db.graphNodes.bulkAdd(nodeRecords);

      const edgeRecords: GraphEdgeRecord[] = state.graph.edges.map(e => ({
        id: e.id,
        userId: DEMO_USER_ID,
        source: e.source,
        target: e.target,
        type: e.type,
      }));
      if (edgeRecords.length) await db.graphEdges.bulkAdd(edgeRecords);
    }
  );
}
