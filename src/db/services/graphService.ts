import { db } from '../db';
import type { GraphNodeRecord, GraphEdgeRecord } from '../schema';

const now = () => new Date().toISOString();
const uid = () => `gn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const graphService = {
  async upsertNode(userId: string, node: Omit<GraphNodeRecord, 'userId' | 'updatedAt'>): Promise<void> {
    await db.graphNodes.put({ ...node, userId, updatedAt: now() });
  },

  async listNodes(userId: string): Promise<GraphNodeRecord[]> {
    return db.graphNodes.where('userId').equals(userId).toArray();
  },

  async deleteNode(id: string): Promise<void> {
    await db.graphNodes.delete(id);
    // Remove dangling edges
    const edges = await db.graphEdges.where('source').equals(id).toArray();
    const targetEdges = await db.graphEdges.where('target').equals(id).toArray();
    const ids = [...edges, ...targetEdges].map(e => e.id);
    if (ids.length) await db.graphEdges.bulkDelete(ids);
  },

  async upsertEdge(userId: string, edge: Omit<GraphEdgeRecord, 'userId'>): Promise<void> {
    await db.graphEdges.put({ ...edge, userId });
  },

  async listEdges(userId: string): Promise<GraphEdgeRecord[]> {
    return db.graphEdges.where('userId').equals(userId).toArray();
  },

  // Bulk sync — replaces all graph data for a user.
  // Called from AbelProvider when graph state changes.
  // Future: AI memory sync (graph_refresh jobs) will also call this after
  // enriching the graph with embeddings and inferred connections.
  async syncFromState(
    userId: string,
    nodes: Omit<GraphNodeRecord, 'userId' | 'updatedAt'>[],
    edges: Omit<GraphEdgeRecord, 'userId'>[],
  ): Promise<void> {
    await db.transaction('rw', db.graphNodes, db.graphEdges, async () => {
      await db.graphNodes.where('userId').equals(userId).delete();
      await db.graphEdges.where('userId').equals(userId).delete();
      await db.graphNodes.bulkAdd(nodes.map(n => ({ ...n, userId, updatedAt: now() })));
      await db.graphEdges.bulkAdd(edges.map(e => ({ ...e, userId })));
    });
  },

  async makeNode(label: string, type: string, description: string): Promise<Omit<GraphNodeRecord, 'userId' | 'updatedAt'>> {
    return {
      id: uid(),
      label, type, description,
      tags: [],
      x: 100 + Math.random() * 600,
      y: 100 + Math.random() * 400,
      createdAt: now(),
    };
  },
};
