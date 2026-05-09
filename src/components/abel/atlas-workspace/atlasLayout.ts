import type { AtlasTreeNode } from '../AtlasTree';

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

// ── Canvas constants — match Base44 SkillTreeCanvas ──────────────────────────
const CANVAS_W = 1200;
const CANVAS_H = 980;
const ROOT_X   = 600;
const ROOT_Y   = 140;

// ── Fixed positions matching Base44 RAW_NODES layout ─────────────────────────
// Abel branch nodes mapped to Base44's asymmetric tree positions
const FIXED: Record<string, { rx: number; ry: number; r: number; subtitle: string; depth: number }> = {
  'core':       { rx: 0,    ry: 0,   r: 56, subtitle: 'Creative Expression', depth: 0 },
  'focus':      { rx: -195, ry: 185, r: 40, subtitle: 'Spark',               depth: 1 },
  'memory':     { rx: 195,  ry: 185, r: 40, subtitle: 'Wisdom',              depth: 1 },
  'expression': { rx: -275, ry: 370, r: 37, subtitle: 'Mastery',             depth: 2 },
  'mastery':    { rx: 275,  ry: 370, r: 37, subtitle: '& Flow',              depth: 2 },
  'social':     { rx: -155, ry: 545, r: 36, subtitle: 'Legacy',              depth: 3 },
  'world':      { rx: 0,    ry: 710, r: 40, subtitle: 'Evolution',           depth: 4 },
};

// ── Edge list matching Base44 EDGES structure ─────────────────────────────────
const EDGE_DEFS: Array<{ from: string; to: string; isSpine?: boolean }> = [
  { from: 'core',       to: 'focus'      },
  { from: 'core',       to: 'memory'     },
  { from: 'focus',      to: 'expression' },
  { from: 'memory',     to: 'mastery'    },
  { from: 'expression', to: 'social'     },
  { from: 'mastery',    to: 'social'     },
  { from: 'social',     to: 'world'      },
  { from: 'core',       to: 'world',     isSpine: true },
];

// Traverse ATLAS_ROOT tree to find a node by id
function findRawNode(root: AtlasTreeNode, id: string): AtlasTreeNode | null {
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const found = findRawNode(c, id);
    if (found) return found;
  }
  return null;
}

export function buildWorkspaceLayout(root: AtlasTreeNode): WorkspaceLayout {
  const nodeMap = new Map<string, WorkspaceNode>();

  for (const [id, pos] of Object.entries(FIXED)) {
    const raw = findRawNode(root, id) ?? { id, label: id, children: [] } as AtlasTreeNode;
    nodeMap.set(id, {
      id,
      label:    raw.label,
      subtitle: raw.subtitle ?? pos.subtitle,
      status:   raw.status,
      progress: raw.progress,
      color:    raw.color,
      x: ROOT_X + pos.rx,
      y: ROOT_Y + pos.ry,
      r: pos.r,
      depth: pos.depth,
      rawNode: raw,
    });
  }

  const nodes = Array.from(nodeMap.values());

  const edges: WorkspaceEdge[] = EDGE_DEFS.flatMap(def => {
    const from = nodeMap.get(def.from);
    const to   = nodeMap.get(def.to);
    if (!from || !to) return [];
    return [{ id: `e_${def.from}_${def.to}`, from, to, isSpine: def.isSpine ?? false }];
  });

  const rootNode = nodeMap.get('core')!;
  return { nodes, edges, rootNode, canvasW: CANVAS_W, canvasH: CANVAS_H };
}
