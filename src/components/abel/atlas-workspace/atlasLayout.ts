import type { AtlasTreeNode } from '../AtlasTree';

export type DisplayMode = 'manual' | 'hierarchy' | 'radial';

export interface WorkspaceNode {
  id: string;
  label: string;
  subtitle?: string;
  status?: AtlasTreeNode['status'];
  progress?: number;
  color?: string;
  x: number;
  y: number;
  r: number;
  depth: number;
  rawNode: AtlasTreeNode;
}

export interface WorkspaceEdge {
  id: string;
  from: WorkspaceNode;
  to: WorkspaceNode;
  isSpine: boolean;
}

export interface WorkspaceLayout {
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  rootNode: WorkspaceNode;
  canvasW: number;
  canvasH: number;
}

// ── Canvas constants ──────────────────────────────────────────────────────────
const CANVAS_W = 1200;
const CANVAS_H = 980;
const ROOT_X   = 600;
const ROOT_Y   = 140;

// ── Fixed positions — asymmetric tree (manual / base layout) ──────────────────
export const FIXED: Record<string, { rx: number; ry: number; r: number; subtitle: string; depth: number }> = {
  'core':       { rx: 0,    ry: 0,   r: 56, subtitle: 'Creative Expression', depth: 0 },
  'focus':      { rx: -195, ry: 185, r: 40, subtitle: 'Spark',               depth: 1 },
  'memory':     { rx: 195,  ry: 185, r: 40, subtitle: 'Wisdom',              depth: 1 },
  'expression': { rx: -275, ry: 370, r: 37, subtitle: 'Mastery',             depth: 2 },
  'mastery':    { rx: 275,  ry: 370, r: 37, subtitle: '& Flow',              depth: 2 },
  'social':     { rx: -155, ry: 545, r: 36, subtitle: 'Legacy',              depth: 3 },
  'world':      { rx: 0,    ry: 710, r: 40, subtitle: 'Evolution',           depth: 4 },
};

// ── Edge definitions ──────────────────────────────────────────────────────────
export const EDGE_DEFS: Array<{ from: string; to: string; isSpine?: boolean }> = [
  { from: 'core',       to: 'focus'      },
  { from: 'core',       to: 'memory'     },
  { from: 'focus',      to: 'expression' },
  { from: 'memory',     to: 'mastery'    },
  { from: 'expression', to: 'social'     },
  { from: 'mastery',    to: 'social'     },
  { from: 'social',     to: 'world'      },
  { from: 'core',       to: 'world',     isSpine: true },
];

export function findRawNode(root: AtlasTreeNode, id: string): AtlasTreeNode | null {
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const found = findRawNode(c, id);
    if (found) return found;
  }
  return null;
}

function makeEdges(nodeMap: Map<string, WorkspaceNode>, defs: typeof EDGE_DEFS): WorkspaceEdge[] {
  return defs.flatMap(def => {
    const from = nodeMap.get(def.from);
    const to   = nodeMap.get(def.to);
    if (!from || !to) return [];
    return [{ id: `e_${def.from}_${def.to}`, from, to, isSpine: def.isSpine ?? false }];
  });
}

// ── Manual layout — Base44 asymmetric fixed positions ────────────────────────
export function buildWorkspaceLayout(root: AtlasTreeNode): WorkspaceLayout {
  const nodeMap = new Map<string, WorkspaceNode>();
  for (const [id, pos] of Object.entries(FIXED)) {
    const raw = findRawNode(root, id) ?? { id, label: id, children: [] } as AtlasTreeNode;
    nodeMap.set(id, {
      id, label: raw.label, subtitle: raw.subtitle ?? pos.subtitle,
      status: raw.status, progress: raw.progress, color: raw.color,
      x: ROOT_X + pos.rx, y: ROOT_Y + pos.ry,
      r: pos.r, depth: pos.depth, rawNode: raw,
    });
  }
  const nodes = Array.from(nodeMap.values());
  const edges = makeEdges(nodeMap, EDGE_DEFS);
  return { nodes, edges, rootNode: nodeMap.get('core')!, canvasW: CANVAS_W, canvasH: CANVAS_H };
}

// ── Hierarchy layout — clean top-down tree by depth ──────────────────────────
export function buildHierarchyLayout(root: AtlasTreeNode): WorkspaceLayout {
  const nodeMap = new Map<string, WorkspaceNode>();

  // Group node IDs by depth
  const byDepth: Record<number, string[]> = {};
  for (const [id, pos] of Object.entries(FIXED)) {
    (byDepth[pos.depth] ??= []).push(id);
  }

  const LEVEL_H  = 210;
  const Y_START  = 110;
  const X_MARGIN = 160;

  for (const [id, pos] of Object.entries(FIXED)) {
    const raw   = findRawNode(root, id) ?? { id, label: id, children: [] } as AtlasTreeNode;
    const group = byDepth[pos.depth];
    const idx   = group.indexOf(id);
    const count = group.length;
    const span  = CANVAS_W - X_MARGIN * 2;
    const x     = count === 1
      ? CANVAS_W / 2
      : X_MARGIN + (span / (count - 1)) * idx;
    const y = Y_START + pos.depth * LEVEL_H;

    nodeMap.set(id, {
      id, label: raw.label, subtitle: raw.subtitle ?? pos.subtitle,
      status: raw.status, progress: raw.progress, color: raw.color,
      x, y, r: pos.r, depth: pos.depth, rawNode: raw,
    });
  }

  const nodes   = Array.from(nodeMap.values());
  const edges   = makeEdges(nodeMap, EDGE_DEFS);
  const maxDep  = Math.max(...Object.values(FIXED).map(p => p.depth));
  return { nodes, edges, rootNode: nodeMap.get('core')!, canvasW: CANVAS_W, canvasH: Y_START + maxDep * LEVEL_H + 150 };
}

// ── Radial layout — root at center, others in a circle ───────────────────────
export function buildRadialLayout(root: AtlasTreeNode): WorkspaceLayout {
  const nodeMap = new Map<string, WorkspaceNode>();
  const CX = CANVAS_W / 2;
  const CY = CANVAS_H / 2;
  const RADIUS = 220;

  const rootRaw = findRawNode(root, 'core') ?? root;
  nodeMap.set('core', {
    id: 'core', label: rootRaw.label, subtitle: rootRaw.subtitle ?? FIXED.core.subtitle,
    status: rootRaw.status, progress: rootRaw.progress, color: rootRaw.color,
    x: CX, y: CY, r: FIXED.core.r, depth: 0, rawNode: rootRaw,
  });

  const otherIds = Object.keys(FIXED).filter(id => id !== 'core');
  otherIds.forEach((id, i) => {
    const pos  = FIXED[id];
    const raw  = findRawNode(root, id) ?? { id, label: id, children: [] } as AtlasTreeNode;
    const angle = (i / otherIds.length) * Math.PI * 2 - Math.PI / 2;
    nodeMap.set(id, {
      id, label: raw.label, subtitle: raw.subtitle ?? pos.subtitle,
      status: raw.status, progress: raw.progress, color: raw.color,
      x: CX + Math.cos(angle) * RADIUS,
      y: CY + Math.sin(angle) * RADIUS,
      r: pos.r, depth: 1, rawNode: raw,
    });
  });

  const nodes = Array.from(nodeMap.values());
  // Radial uses only root→satellite edges (no spine, no depth edges)
  const edges: WorkspaceEdge[] = otherIds.map(id => ({
    id:      `e_core_${id}`,
    from:    nodeMap.get('core')!,
    to:      nodeMap.get(id)!,
    isSpine: false,
  }));

  return { nodes, edges, rootNode: nodeMap.get('core')!, canvasW: CANVAS_W, canvasH: CANVAS_H };
}
