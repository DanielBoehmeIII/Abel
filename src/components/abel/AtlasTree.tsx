import { useId } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import './AtlasTree.css';

// ── Public types ──────────────────────────────────────────────────────────────

export interface AtlasTreeNode {
  id: string;
  label: string;
  subtitle?: string;
  color?: string;
  status?: 'locked' | 'available' | 'active' | 'complete';
  progress?: number;  // 0–1
  weight?: number;    // 0–1, nudges radius up slightly
  children?: AtlasTreeNode[];
}

export interface AtlasTreeProps {
  root: AtlasTreeNode;
  selectedId?: string;
  onNodeClick?: (node: AtlasTreeNode) => void;
  className?: string;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface LayoutNode {
  node: AtlasTreeNode;
  x: number;
  y: number;
  r: number;
  depth: number;
  color: string;    // pearl/silver display color
  rawColor: string; // original branch color — used at ~7% for tint only
}

interface LayoutEdge {
  id: string;
  from: LayoutNode;
  to: LayoutNode;
  hasParticle: boolean;
}

interface Filament { path: string; ex: number; ey: number }

// ── Layout constants ──────────────────────────────────────────────────────────

const VB_W     = 700;
const TOP_PAD  = 72;
const H_PAD    = 52;
const LEVEL_H  = 130;
const BOT_PAD  = 90;
const ROOT_R   = 26;
const MID_R    = 16;
const LEAF_R   = 10;
const R_WEIGHT = 4;

// Expanded star/dust field — original + fine atmospheric scatter
const STARS: ReadonlyArray<{ fx: number; fy: number; r: number; o: number }> = [
  // Outer perimeter
  { fx: 0.07, fy: 0.08,  r: 0.80, o: 0.20 },
  { fx: 0.91, fy: 0.12,  r: 1.00, o: 0.14 },
  { fx: 0.03, fy: 0.39,  r: 0.65, o: 0.16 },
  { fx: 0.95, fy: 0.44,  r: 0.72, o: 0.18 },
  { fx: 0.09, fy: 0.67,  r: 0.88, o: 0.13 },
  { fx: 0.93, fy: 0.72,  r: 0.58, o: 0.15 },
  { fx: 0.17, fy: 0.88,  r: 0.75, o: 0.12 },
  { fx: 0.84, fy: 0.91,  r: 0.82, o: 0.10 },
  { fx: 0.50, fy: 0.03,  r: 0.62, o: 0.11 },
  { fx: 0.43, fy: 0.95,  r: 0.52, o: 0.10 },
  // Mid-field
  { fx: 0.22, fy: 0.16,  r: 0.38, o: 0.08 },
  { fx: 0.78, fy: 0.24,  r: 0.34, o: 0.07 },
  { fx: 0.35, fy: 0.54,  r: 0.42, o: 0.07 },
  { fx: 0.64, fy: 0.61,  r: 0.36, o: 0.09 },
  { fx: 0.12, fy: 0.51,  r: 0.28, o: 0.07 },
  { fx: 0.87, fy: 0.57,  r: 0.30, o: 0.08 },
  { fx: 0.56, fy: 0.78,  r: 0.26, o: 0.06 },
  { fx: 0.27, fy: 0.83,  r: 0.44, o: 0.07 },
  { fx: 0.71, fy: 0.86,  r: 0.28, o: 0.06 },
  { fx: 0.47, fy: 0.21,  r: 0.32, o: 0.08 },
  // Fine dust — denser scatter
  { fx: 0.31, fy: 0.10,  r: 0.22, o: 0.09 },
  { fx: 0.61, fy: 0.14,  r: 0.28, o: 0.07 },
  { fx: 0.15, fy: 0.30,  r: 0.24, o: 0.06 },
  { fx: 0.82, fy: 0.36,  r: 0.20, o: 0.07 },
  { fx: 0.40, fy: 0.42,  r: 0.26, o: 0.05 },
  { fx: 0.73, fy: 0.49,  r: 0.18, o: 0.06 },
  { fx: 0.08, fy: 0.60,  r: 0.22, o: 0.05 },
  { fx: 0.92, fy: 0.65,  r: 0.24, o: 0.06 },
  { fx: 0.19, fy: 0.74,  r: 0.20, o: 0.05 },
  { fx: 0.77, fy: 0.78,  r: 0.26, o: 0.05 },
  { fx: 0.48, fy: 0.33,  r: 0.18, o: 0.06 },
  { fx: 0.55, fy: 0.48,  r: 0.22, o: 0.05 },
  { fx: 0.38, fy: 0.68,  r: 0.20, o: 0.06 },
  { fx: 0.66, fy: 0.73,  r: 0.24, o: 0.05 },
  { fx: 0.26, fy: 0.47,  r: 0.18, o: 0.04 },
  { fx: 0.88, fy: 0.82,  r: 0.20, o: 0.05 },
  { fx: 0.44, fy: 0.85,  r: 0.26, o: 0.04 },
  { fx: 0.60, fy: 0.93,  r: 0.22, o: 0.05 },
];

// Tiny orbital offsets for junction sparks around mid-level nodes
const JUNCTION_OFFSETS: ReadonlyArray<[number, number]> = [
  [-18, -8], [17, -6], [-12, 14], [14, 12],
];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Pearl/silver display colors — neutral, monochrome constellation palette
function resolveColor(node: AtlasTreeNode, depth: number): string {
  if (node.status === 'complete') return '#d8eef5';            // luminous pale blue-white
  if (node.status === 'locked')   return 'rgba(80,76,110,0.55)'; // deep dim violet
  if (depth === 0) return '#f5f2e6';  // warm ivory
  if (depth === 1) return '#dddaee';  // pale silver
  return '#c5c2da';                   // muted silver
}

// Original branch/status color — used only as a barely-perceptible tint overlay
function resolveRawColor(node: AtlasTreeNode, depth: number, parentRaw: string): string {
  if (node.color) return node.color;
  if (node.status === 'complete') return '#34d399';
  if (node.status === 'locked')   return '#4a4488';
  if (depth >= 2) return parentRaw;
  return depth === 0 ? '#f5c518' : '#9898b8';
}

function nodeRadius(node: AtlasTreeNode, depth: number): number {
  const base = depth === 0 ? ROOT_R : depth === 1 ? MID_R : LEAF_R;
  return base + (node.weight ?? 0) * R_WEIGHT;
}

function countLeaves(node: AtlasTreeNode): number {
  if (!node.children?.length) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

// Returns IDs of: selected + all ancestors + all descendants
function getRelated(root: AtlasTreeNode, selectedId: string): Set<string> {
  const related = new Set<string>();
  function addDescendants(n: AtlasTreeNode) {
    related.add(n.id);
    n.children?.forEach(addDescendants);
  }
  function findPath(n: AtlasTreeNode, path: string[]): boolean {
    const cur = [...path, n.id];
    if (n.id === selectedId) {
      cur.forEach(id => related.add(id));
      addDescendants(n);
      return true;
    }
    return (n.children ?? []).some(c => findPath(c, cur));
  }
  findPath(root, []);
  return related;
}

function safeFragment(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '_');
}

// Deterministic jitter from ID string — breaks perfect grid feel
function hashJitter(id: string, scale: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * scale;
}

// ── Tree layout ───────────────────────────────────────────────────────────────

function buildLayout(root: AtlasTreeNode): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  viewBox: string;
  vbH: number;
} {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const pCount = { val: 0 };

  function visit(
    node: AtlasTreeNode,
    depth: number,
    leafCtr: { val: number },
    parentRaw: string,
  ): LayoutNode {
    const color    = resolveColor(node, depth);
    const rawColor = resolveRawColor(node, depth, parentRaw);
    const r        = nodeRadius(node, depth);
    const y        = TOP_PAD + depth * LEVEL_H;
    const children = node.children ?? [];

    let ln: LayoutNode;
    if (!children.length) {
      ln = { node, x: leafCtr.val, y, r, depth, color, rawColor };
      leafCtr.val++;
    } else {
      const childLns = children.map(c => visit(c, depth + 1, leafCtr, rawColor));
      const x = (childLns[0].x + childLns[childLns.length - 1].x) / 2;
      ln = { node, x, y, r, depth, color, rawColor };
      for (const cln of childLns) {
        const hp = pCount.val < 7;
        if (hp) pCount.val++;
        edges.push({ id: `e_${node.id}_${cln.node.id}`, from: ln, to: cln, hasParticle: hp });
      }
    }
    nodes.push(ln);
    return ln;
  }

  visit(root, 0, { val: 0 }, '#f5c518');

  const leafCount = countLeaves(root);
  const leafSlot  = leafCount > 1
    ? Math.min(84, (VB_W - H_PAD * 2) / (leafCount - 1))
    : 0;
  const totalSpan = (leafCount - 1) * leafSlot;
  const shiftX    = VB_W / 2 - totalSpan / 2;

  for (const n of nodes) {
    n.x = n.x * leafSlot + shiftX;
    if (n.depth === 2) n.x += hashJitter(n.node.id, 11);
    if (n.depth === 1) n.x += hashJitter(n.node.id, 4);
  }

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const vbH = TOP_PAD + maxDepth * LEVEL_H + BOT_PAD;
  return { nodes, edges, viewBox: `0 0 ${VB_W} ${vbH}`, vbH };
}

// ── Path generation ───────────────────────────────────────────────────────────

function bezierPathAt(from: LayoutNode, to: LayoutNode, xOffset = 0): string {
  const x1 = from.x + xOffset, y1 = from.y + from.r;
  const x2 = to.x + xOffset,   y2 = to.y - to.r;
  const dy  = y2 - y1;
  const dx  = x2 - x1;
  const t   = 0.44 + Math.min(Math.abs(dx) / 220, 0.14);
  return `M ${x1} ${y1} C ${x1 + dx * 0.08} ${y1 + dy * t}, ${x2 - dx * 0.08} ${y2 - dy * t}, ${x2} ${y2}`;
}

const bPath  = (from: LayoutNode, to: LayoutNode) => bezierPathAt(from, to);
const hlPath = (from: LayoutNode, to: LayoutNode) => bezierPathAt(from, to, 1.4);

// ── Decorative micro-filaments ────────────────────────────────────────────────

function buildFilaments(edges: LayoutEdge[]): Filament[] {
  const result: Filament[] = [];
  for (const e of edges) {
    const x1 = e.from.x, y1 = e.from.y + e.from.r;
    const x2 = e.to.x,   y2 = e.to.y - e.to.r;
    const dy = y2 - y1;
    const dx = x2 - x1;
    const tt = 0.44 + Math.min(Math.abs(dx) / 220, 0.14);
    // Cubic control points matching bezierPathAt
    const cx1 = x1 + dx * 0.08, cy1 = y1 + dy * tt;
    const cx2 = x2 - dx * 0.08, cy2 = y2 - dy * tt;

    const sproatTs = [0.22, 0.50, 0.74];
    sproatTs.forEach((t, j) => {
      // Evaluate cubic bezier at parameter t
      const mt = 1 - t;
      const px = mt*mt*mt*x1 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x2;
      const py = mt*mt*mt*y1 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y2;

      const seed = e.id + String(j);
      const fdx = hashJitter(seed + 'x', 28);
      const fdy = hashJitter(seed + 'y', 18) + 7; // slight downward bias
      const ex = px + fdx;
      const ey = py + fdy;
      const midX = (px + ex) / 2 + hashJitter(seed + 'mx', 7);
      const midY = (py + ey) / 2;
      result.push({
        path: `M ${px} ${py} Q ${midX} ${midY} ${ex} ${ey}`,
        ex, ey,
      });
    });
  }
  return result;
}

// ── Reduced motion ────────────────────────────────────────────────────────────

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AtlasTree({
  root,
  selectedId,
  onNodeClick,
  className = '',
}: AtlasTreeProps) {
  const uid  = useId();
  const safe = safeFragment(uid);

  const edgeMistId   = `at_em_${safe}`;
  const edgeStreamId = `at_es_${safe}`;
  const edgeBlurId   = `at_eb_${safe}`;
  const nodeGlowId   = `at_ng_${safe}`;
  const nodeHardId   = `at_nh_${safe}`;
  const nodeMistId   = `at_nm_${safe}`;
  const axisGradId   = `at_ax_${safe}`;
  const trunkGradId  = `at_tk_${safe}`;
  const spineGradId  = `at_sp_${safe}`;
  const grainFiltId  = `at_gr_${safe}`;

  const { nodes, edges, viewBox, vbH } = buildLayout(root);
  const relatedIds = selectedId ? getRelated(root, selectedId) : null;
  const filaments  = buildFilaments(edges);

  function nodeClass(ln: LayoutNode): string {
    if (!relatedIds) return 'atlas-node-group';
    if (selectedId === ln.node.id) return 'atlas-node-group atlas-node--selected';
    if (relatedIds.has(ln.node.id)) return 'atlas-node-group atlas-node--related';
    return 'atlas-node-group atlas-node--dimmed';
  }

  function edgeClass(e: LayoutEdge): string {
    if (!relatedIds) return 'atlas-edge';
    if (relatedIds.has(e.from.node.id) && relatedIds.has(e.to.node.id)) return 'atlas-edge atlas-edge--related';
    return 'atlas-edge atlas-edge--dimmed';
  }

  function dimOpacity(ln: LayoutNode): number {
    if (!relatedIds) return 1;
    if (relatedIds.has(ln.node.id)) return 1;
    return 0.11;
  }

  function handleKeyDown(node: AtlasTreeNode) {
    return (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNodeClick?.(node);
      }
    };
  }

  const rootNode = nodes.find(n => n.depth === 0);
  const midNodes = nodes.filter(n => n.depth === 1);

  return (
    <svg
      viewBox={viewBox}
      className={`atlas-tree-svg ${className}`}
      aria-label="Atlas tree visualization"
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* ── Edge filters ── */}

        <filter id={edgeMistId} x="-250%" y="-250%" width="600%" height="600%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="13" />
        </filter>

        <filter id={edgeStreamId} x="-130%" y="-130%" width="360%" height="360%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
        </filter>

        <filter id={edgeBlurId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>

        {/* ── Node filters ── */}

        <filter id={nodeGlowId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={nodeHardId} x="-110%" y="-110%" width="320%" height="320%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ── Organic node mist — turbulence warps circle into irregular haze ── */}
        <filter id={nodeMistId} x="-150%" y="-150%" width="400%" height="400%">
          <feTurbulence type="fractalNoise" baseFrequency="0.030 0.020" numOctaves="3" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G" result="warped" />
          <feGaussianBlur in="warped" stdDeviation="8" />
        </filter>

        {/* ── Grain/mist atmosphere filter ── */}
        <filter id={grainFiltId} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
          <feBlend in="SourceGraphic" in2="grayNoise" mode="soft-light" result="blended" />
          <feComposite in="blended" in2="SourceGraphic" operator="in" />
        </filter>

        {/* ── Background gradients ── */}

        {/* Axis spine — pearl column */}
        <linearGradient id={axisGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(200,196,240,0.22)" />
          <stop offset="50%"  stopColor="rgba(180,175,230,0.07)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </linearGradient>

        {/* Wide trunk mist — cool silver */}
        <linearGradient id={trunkGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(245,242,235,0.12)" />
          <stop offset="28%"  stopColor="rgba(200,196,240,0.07)" />
          <stop offset="70%"  stopColor="rgba(185,182,225,0.025)" />
          <stop offset="100%" stopColor="rgba(185,182,225,0)" />
        </linearGradient>

        {/* Organic energy spine — warm ivory bright column */}
        <linearGradient id={spineGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(245,242,235,0.55)" />
          <stop offset="40%"  stopColor="rgba(220,216,250,0.22)" />
          <stop offset="100%" stopColor="rgba(200,196,240,0)" />
        </linearGradient>

        {/* ── Per-edge pearl gradients (parent → silver mist, ghost tint mid) ── */}
        {edges.map(e => (
          <linearGradient
            key={`lg_${e.id}`}
            id={`lg_${safeFragment(e.id)}_${safe}`}
            gradientUnits="userSpaceOnUse"
            x1={e.from.x} y1={e.from.y}
            x2={e.to.x}   y2={e.to.y}
          >
            <stop offset="0%"   stopColor="rgba(240,237,255,0.70)" />
            <stop offset="50%"  stopColor={e.from.rawColor}        stopOpacity="0.12" />
            <stop offset="100%" stopColor="rgba(215,212,240,0.55)" />
          </linearGradient>
        ))}

        {/* ── Per-node radial gradients — luminous misty orb center ── */}
        {nodes.map(ln => (
          <radialGradient
            key={`rg_${ln.node.id}`}
            id={`rg_${safeFragment(ln.node.id)}_${safe}`}
            gradientUnits="userSpaceOnUse"
            cx={ln.x} cy={ln.y}
            r={ln.r * 1.7}
          >
            <stop offset="0%"   stopColor={ln.color} stopOpacity="0.30" />
            <stop offset="55%"  stopColor={ln.color} stopOpacity="0.07" />
            <stop offset="100%" stopColor={ln.color} stopOpacity="0"    />
          </radialGradient>
        ))}

        {/* ── Motion paths (invisible; referenced by animateMotion) ── */}
        {!prefersReducedMotion && edges.filter(e => e.hasParticle).map(e => (
          <path
            key={`pd_${e.id}`}
            id={`pd_${safeFragment(e.id)}_${safe}`}
            d={bPath(e.from, e.to)}
            fill="none"
            stroke="none"
          />
        ))}
      </defs>

      {/* ═══ Background atmosphere ═══════════════════════════════════════════ */}

      {/* Wide trunk mist — cool silver column behind everything */}
      {rootNode && (
        <rect
          x={rootNode.x - 130}
          y={rootNode.y - 30}
          width={260}
          height={vbH - rootNode.y + 40}
          rx="130"
          fill={`url(#${trunkGradId})`}
          style={{ pointerEvents: 'none' } as CSSProperties}
        />
      )}

      {/* Axis spine */}
      {rootNode && (
        <rect
          x={rootNode.x - 65}
          y={rootNode.y - 22}
          width={130}
          height={vbH - rootNode.y + 32}
          rx="65"
          fill={`url(#${axisGradId})`}
          opacity="0.9"
          style={{ pointerEvents: 'none' } as CSSProperties}
        />
      )}

      {/* Organic energy spine — narrow bright ivory column */}
      {rootNode && (
        <rect
          x={rootNode.x - 24}
          y={rootNode.y - 18}
          width={48}
          height={vbH - rootNode.y + 26}
          rx="24"
          fill={`url(#${spineGradId})`}
          opacity="0.55"
          style={{ pointerEvents: 'none' } as CSSProperties}
        />
      )}

      {/* Grain/mist atmosphere overlay */}
      <rect
        x="0" y="0"
        width={VB_W} height={vbH}
        fill="rgba(200,196,245,0.018)"
        filter={`url(#${grainFiltId})`}
        style={{ pointerEvents: 'none' } as CSSProperties}
      />

      {/* Star / dust field */}
      {STARS.map((s, i) => (
        <circle
          key={`star_${i}`}
          cx={s.fx * VB_W}
          cy={s.fy * vbH}
          r={s.r}
          fill="rgba(220,217,252,0.9)"
          opacity={s.o}
        />
      ))}

      {/* Root power source — layered ivory halo rings */}
      {rootNode && (
        <g style={{ pointerEvents: 'none' } as CSSProperties}>
          <ellipse cx={rootNode.x} cy={rootNode.y} rx="240" ry="105"
            fill="#f5f2e6" opacity="0.022" />
          <ellipse cx={rootNode.x} cy={rootNode.y} rx="130" ry="56"
            fill="#f5f2e6" opacity="0.036" />
          <ellipse cx={rootNode.x} cy={rootNode.y} rx="65" ry="28"
            fill="#f5f2e6" opacity="0.055" />
          <rect
            x={rootNode.x - 4} y={rootNode.y + rootNode.r}
            width={8} height={vbH - rootNode.y - rootNode.r - 22}
            rx="4"
            fill="#f5f2e6"
            opacity="0.028"
          />
        </g>
      )}

      {/* Junction sparks — tiny dots orbiting mid-level nodes */}
      {midNodes.map(ln =>
        JUNCTION_OFFSETS.map(([ox, oy], j) => (
          <circle
            key={`jspark_${ln.node.id}_${j}`}
            cx={ln.x + ox} cy={ln.y + oy}
            r="0.50"
            fill="rgba(230,227,255,0.35)"
            style={{ pointerEvents: 'none' } as CSSProperties}
          />
        ))
      )}

      {/* ═══ Decorative micro-filaments ══════════════════════════════════════ */}

      {filaments.map((f, i) => (
        <path
          key={`fil_${i}`}
          d={f.path}
          fill="none"
          stroke="rgba(228,225,255,0.13)"
          strokeWidth="0.24"
          style={{ pointerEvents: 'none' } as CSSProperties}
        />
      ))}

      {filaments.map((f, i) => (
        <circle
          key={`fsp_${i}`}
          cx={f.ex} cy={f.ey}
          r="0.52"
          fill="rgba(240,238,255,0.42)"
          style={{ pointerEvents: 'none' } as CSSProperties}
        />
      ))}

      {/* ═══ Edges — 5 pearl layers each ═════════════════════════════════════ */}

      {/* Layer 1: Outer mist */}
      {edges.map((e, i) => (
        <path
          key={`em_${e.id}`}
          d={bPath(e.from, e.to)}
          fill="none"
          stroke={`url(#lg_${safeFragment(e.id)}_${safe})`}
          strokeWidth="20"
          filter={`url(#${edgeMistId})`}
          className={`atlas-path--mist ${edgeClass(e)}`}
          style={{ '--draw-delay': `${i * 0.055}s` } as CSSProperties}
        />
      ))}

      {/* Layer 2: Stream */}
      {edges.map((e, i) => (
        <path
          key={`es_${e.id}`}
          d={bPath(e.from, e.to)}
          fill="none"
          stroke={`url(#lg_${safeFragment(e.id)}_${safe})`}
          strokeWidth="5"
          filter={`url(#${edgeStreamId})`}
          className={`atlas-path--stream ${edgeClass(e)}`}
          style={{ '--draw-delay': `${i * 0.055}s` } as CSSProperties}
        />
      ))}

      {/* Layer 3: Inner soft glow */}
      {edges.map((e, i) => (
        <path
          key={`eg_${e.id}`}
          d={bPath(e.from, e.to)}
          fill="none"
          stroke={`url(#lg_${safeFragment(e.id)}_${safe})`}
          strokeWidth="1.7"
          filter={`url(#${edgeBlurId})`}
          className={`atlas-path--glow ${edgeClass(e)}`}
          style={{ '--draw-delay': `${i * 0.055}s` } as CSSProperties}
        />
      ))}

      {/* Layer 4: Crisp thread */}
      {edges.map((e, i) => (
        <path
          key={`ec_${e.id}`}
          d={bPath(e.from, e.to)}
          fill="none"
          stroke={`url(#lg_${safeFragment(e.id)}_${safe})`}
          strokeWidth="0.50"
          pathLength={1}
          className={`atlas-path--crisp ${edgeClass(e)}`}
          style={{ '--draw-delay': `${i * 0.055}s` } as CSSProperties}
        />
      ))}

      {/* Layer 5: Highlight strand */}
      {edges.map((e, i) => (
        <path
          key={`eh_${e.id}`}
          d={hlPath(e.from, e.to)}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.20"
          pathLength={1}
          className={`atlas-path--highlight ${edgeClass(e)}`}
          style={{ '--draw-delay': `${i * 0.055}s` } as CSSProperties}
        />
      ))}

      {/* ═══ Particles ═══════════════════════════════════════════════════════ */}
      {!prefersReducedMotion && edges.filter(e => e.hasParticle).map((e, i) => {
        const pid = `#pd_${safeFragment(e.id)}_${safe}`;
        const isRelated = !relatedIds ||
          (relatedIds.has(e.from.node.id) && relatedIds.has(e.to.node.id));
        return (
          <circle
            key={`pt_${e.id}`}
            r="1.0"
            fill="rgba(238,236,255,0.9)"
            opacity={isRelated ? 0.72 : 0.06}
            style={{ transition: 'opacity 0.4s ease' } as CSSProperties}
          >
            <animateMotion
              dur={`${4.4 + i * 0.52}s`}
              repeatCount="indefinite"
              begin={`${i * 0.72}s`}
            >
              <mpath href={pid} />
            </animateMotion>
          </circle>
        );
      })}

      {/* ═══ Nodes ═══════════════════════════════════════════════════════════ */}
      {nodes.map((ln, i) => {
        const isRoot     = ln.depth === 0;
        const isSelected = selectedId === ln.node.id;
        const isLocked   = ln.node.status === 'locked';
        const isActive   = ln.node.status === 'active';
        const isComplete = ln.node.status === 'complete';
        const progress   = ln.node.progress ?? 0;
        const progR      = ln.r + 3.4;
        const progCirc   = 2 * Math.PI * progR;

        const glowFilter  = (isRoot || isSelected) ? `url(#${nodeHardId})` : `url(#${nodeGlowId})`;
        const nodeRadGrad = `url(#rg_${safeFragment(ln.node.id)}_${safe})`;
        const displayColor = ln.color; // always pearl/silver

        const fontSize = ln.node.label.length > 11
          ? 6.5 : isRoot ? 8.5 : ln.depth === 1 ? 7.5 : 7;

        const ariaLabel = [
          ln.node.label,
          ln.node.status ?? null,
          progress > 0 ? `${Math.round(progress * 100)}%` : null,
        ].filter(Boolean).join(', ');

        return (
          <g
            key={ln.node.id}
            className={nodeClass(ln)}
            onClick={() => onNodeClick?.(ln.node)}
            onKeyDown={handleKeyDown(ln.node)}
            tabIndex={onNodeClick ? 0 : undefined}
            role={onNodeClick ? 'button' : undefined}
            aria-label={ariaLabel}
            aria-pressed={isSelected ? true : undefined}
            style={{
              cursor: onNodeClick ? 'pointer' : 'default',
              animationDelay: `${0.16 + i * 0.055}s`,
              opacity: dimOpacity(ln) * (isLocked ? 0.30 : 1),
              transition: 'opacity 0.45s ease',
            } as CSSProperties}
          >
            <title>
              {ln.node.label}
              {ln.node.subtitle ? ` — ${ln.node.subtitle}` : ''}
              {ln.node.status ? ` (${ln.node.status})` : ''}
            </title>

            {/* Atmospheric mist — turbulence-warped, no clean circular halo */}
            <circle
              cx={ln.x} cy={ln.y}
              r={isRoot ? ln.r + 14 : ln.r + 8}
              fill={displayColor}
              opacity={isLocked ? 0.010 : isSelected || isRoot ? 0.058 : 0.024}
              filter={`url(#${nodeMistId})`}
              style={{ pointerEvents: 'none' } as CSSProperties}
            />

            {/* Cloud glow — luminous misty orb fill (radial gradient) */}
            {!isLocked && (
              <circle
                cx={ln.x} cy={ln.y}
                r={ln.r * 1.6}
                fill={nodeRadGrad}
                opacity={isRoot ? 0.95 : isSelected ? 0.92 : 0.85}
              />
            )}

            {/* Branch tint overlay — barely-perceptible color identity */}
            {!isLocked && (
              <circle
                cx={ln.x} cy={ln.y}
                r={ln.r * 0.88}
                fill={ln.rawColor}
                opacity="0.07"
              />
            )}

            {/* Pulse ring */}
            {(isRoot || isSelected || isActive) && !prefersReducedMotion && (
              <circle
                cx={ln.x} cy={ln.y}
                r={ln.r + 11}
                fill="none"
                stroke={displayColor}
                strokeWidth="0.55"
                className="atlas-pulse-ring"
              />
            )}

            {/* Selection rings */}
            {isSelected && (
              <>
                <circle
                  cx={ln.x} cy={ln.y}
                  r={ln.r + 28}
                  fill="none"
                  stroke={displayColor}
                  strokeWidth="0.35"
                  strokeDasharray="2 6"
                  strokeOpacity="0.22"
                />
                <circle
                  cx={ln.x} cy={ln.y}
                  r={ln.r + 19}
                  fill="none"
                  stroke={displayColor}
                  strokeWidth="0.50"
                  strokeDasharray="4 7"
                  strokeOpacity="0.30"
                />
              </>
            )}

            {/* Progress arc — whisper thin, nearly invisible */}
            {progress > 0 && !isComplete && (
              <circle
                cx={ln.x} cy={ln.y}
                r={progR}
                fill="none"
                stroke={displayColor}
                strokeWidth="0.40"
                strokeLinecap="round"
                strokeDasharray={`${progress * progCirc} ${progCirc}`}
                strokeOpacity="0.20"
                transform={`rotate(-90, ${ln.x}, ${ln.y})`}
              />
            )}

            {/* Node body — smoky translucent core with whisper rim */}
            <circle
              cx={ln.x} cy={ln.y}
              r={ln.r}
              fill={isLocked ? 'rgba(9,8,20,0.52)' : 'rgba(14,10,32,0.40)'}
              stroke={displayColor}
              strokeWidth={isSelected ? 0.72 : isRoot ? 0.58 : 0.22}
              filter={isLocked ? undefined : glowFilter}
              className="atlas-node-ring"
            />

            {/* Inner light core — active/complete/selected */}
            {(isActive || isComplete || isSelected) && !isLocked && (
              <circle
                cx={ln.x} cy={ln.y}
                r={ln.r * (isComplete ? 0.44 : 0.30)}
                fill={displayColor}
                opacity={isComplete ? 0.72 : isSelected ? 0.24 : 0.14}
              />
            )}

            {/* Root glyph */}
            {isRoot && (
              <text
                x={ln.x} y={ln.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fill={displayColor}
                fontFamily="var(--font-sans)"
                opacity="0.55"
                style={{ pointerEvents: 'none', userSelect: 'none' } as CSSProperties}
              >◉</text>
            )}

            {/* Label */}
            <text
              x={ln.x}
              y={ln.y + ln.r + 14}
              textAnchor="middle"
              fill={
                isSelected || isRoot
                  ? displayColor
                  : isLocked
                    ? 'rgba(100,90,155,0.38)'
                    : 'var(--atlas-label, rgba(212,208,242,0.82))'
              }
              fontSize={fontSize}
              fontFamily="var(--font-sans)"
              fontWeight={isRoot || isSelected ? '600' : '400'}
              letterSpacing="0.06em"
              style={{ pointerEvents: 'none', userSelect: 'none' } as CSSProperties}
            >
              {ln.node.label}
            </text>

            {/* Subtitle */}
            {ln.node.subtitle && (
              <text
                x={ln.x}
                y={ln.y + ln.r + 25}
                textAnchor="middle"
                fill="var(--atlas-sublabel, rgba(188,184,218,0.52))"
                fontSize="5.8"
                fontFamily="var(--font-sans)"
                className="atlas-node-subtitle"
                style={{ pointerEvents: 'none', userSelect: 'none' } as CSSProperties}
              >
                {ln.node.subtitle}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
