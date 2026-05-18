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

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function atlasRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ── Animated star field — seeded deterministic, 3 weighted layers ─────────────

interface AtlasStar {
  fx: number; fy: number;
  r: number; o: number;
  kind: 'bg' | 'spine' | 'root';
  dur: number; del: number;
}

function buildAtlasStars(): AtlasStar[] {
  const rng = atlasRng(54321);
  const stars: AtlasStar[] = [];
  // Background quiet scatter — very dim, no animation
  for (let i = 0; i < 80; i++) {
    stars.push({ fx: rng(), fy: rng(), r: rng() * 0.80 + 0.14, o: rng() * 0.14 + 0.022, kind: 'bg', dur: 5 + rng() * 5, del: rng() * 8 });
  }
  // Root halo — dense top-center concentration, brighter + faster pulse
  for (let i = 0; i < 55; i++) {
    stars.push({ fx: 0.5 + (rng() - 0.5) * 0.48, fy: rng() * 0.28, r: rng() * 1.1 + 0.18, o: rng() * 0.28 + 0.07, kind: 'root', dur: 1.5 + rng() * 2.5, del: rng() * 5 });
  }
  // Spine column — center-biased across full height
  for (let i = 0; i < 55; i++) {
    stars.push({ fx: 0.5 + (rng() - 0.5) * 0.20, fy: 0.04 + rng() * 0.90, r: rng() * 0.95 + 0.16, o: rng() * 0.22 + 0.04, kind: 'spine', dur: 2 + rng() * 4, del: rng() * 7 });
  }
  return stars;
}

const ATLAS_STARS = buildAtlasStars();

// ── Wire hair filaments — faint branching strands off each edge curve ─────────

interface WireHair {
  x1: number; y1: number;
  x2: number; y2: number;
  op: number; dur: number; del: number;
}

function buildWireHairs(edges: LayoutEdge[]): WireHair[] {
  const result: WireHair[] = [];
  edges.forEach((e, ei) => {
    const x1 = e.from.x, y1 = e.from.y + e.from.r;
    const x2 = e.to.x,   y2 = e.to.y - e.to.r;
    const dy = y2 - y1, dx = x2 - x1;
    const tt = 0.44 + Math.min(Math.abs(dx) / 220, 0.14);
    const cx1 = x1 + dx * 0.08, cy1 = y1 + dy * tt;
    const cx2 = x2 - dx * 0.08, cy2 = y2 - dy * tt;
    const count = 5;
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      const mt = 1 - t;
      const px = mt*mt*mt*x1 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x2;
      const py = mt*mt*mt*y1 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y2;
      const side = i % 2 === 0 ? 1 : -1;
      const spread = (8 + (i % 3) * 5) * side;
      const down = 6 + (i % 4) * 4;
      result.push({
        x1: px, y1: py,
        x2: px + spread * 0.65, y2: py + down,
        op: 0.05 + (i % 3) * 0.018,
        dur: 2.4 + i * 0.38,
        del: i * 0.28 + ei * 0.12,
      });
    }
  });
  return result;
}

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
  const wireHairs  = buildWireHairs(edges);

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

      {/* SpineCap — pulsing focal anchor above the root node */}
      {rootNode && !prefersReducedMotion && (
        <g style={{ pointerEvents: 'none' } as CSSProperties}>
          {/* Breathing bloom halo */}
          <circle cx={rootNode.x} cy={rootNode.y - 44} r={16}
            fill="rgba(245,242,235,0.06)"
            filter={`url(#${nodeHardId})`}
          >
            <animate attributeName="r" values="12;22;12" dur="4.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.04;0.14;0.04" dur="4.2s" repeatCount="indefinite" />
          </circle>
          {/* Connector thread to root rim */}
          <line
            x1={rootNode.x} y1={rootNode.y - 52}
            x2={rootNode.x} y2={rootNode.y - rootNode.r}
            stroke="rgba(245,242,235,0.28)" strokeWidth="0.6" strokeLinecap="round"
          >
            <animate attributeName="opacity" values="0.12;0.44;0.12" dur="4.2s" repeatCount="indefinite" />
          </line>
          {/* Bright center point */}
          <circle cx={rootNode.x} cy={rootNode.y - 44} r={2.2}
            fill="rgba(245,242,235,0.92)"
            filter={`url(#${nodeGlowId})`}
          >
            <animate attributeName="opacity" values="0.45;1;0.45" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="r" values="1.5;3.0;1.5" dur="2.8s" repeatCount="indefinite" />
          </circle>
          {/* 4-ray cross flares */}
          {[0, 90, 45, 135].map((deg, fi) => {
            const rad = (deg * Math.PI) / 180;
            const len = fi < 2 ? 10 : 6;
            return (
              <line key={fi}
                x1={rootNode.x + Math.cos(rad) * 2.5}
                y1={rootNode.y - 44 + Math.sin(rad) * 2.5}
                x2={rootNode.x + Math.cos(rad) * len}
                y2={rootNode.y - 44 + Math.sin(rad) * len}
                stroke="rgba(245,242,235,0.42)" strokeWidth="0.55" strokeLinecap="round"
              >
                <animate attributeName="opacity" values="0.15;0.60;0.15" dur="2.8s" begin={`${fi * 0.28}s`} repeatCount="indefinite" />
              </line>
            );
          })}
        </g>
      )}

      {/* Grain/mist atmosphere overlay */}
      <rect
        x="0" y="0"
        width={VB_W} height={vbH}
        fill="rgba(200,196,245,0.018)"
        filter={`url(#${grainFiltId})`}
        style={{ pointerEvents: 'none' } as CSSProperties}
      />

      {/* Star / dust field — seeded, 3 weighted layers, animated non-background stars */}
      {ATLAS_STARS.map((s, i) => (
        <circle
          key={`star_${i}`}
          cx={s.fx * VB_W}
          cy={s.fy * vbH}
          r={s.r}
          fill="rgba(220,217,252,0.9)"
          opacity={s.o}
          style={{ pointerEvents: 'none' } as CSSProperties}
        >
          {!prefersReducedMotion && s.kind !== 'bg' && (
            <animate
              attributeName="opacity"
              values={`${s.o * 0.18};${s.o};${s.o * 0.18}`}
              dur={`${s.dur}s`}
              begin={`${s.del}s`}
              repeatCount="indefinite"
            />
          )}
        </circle>
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

      {/* Junction sparks — animated tiny dots orbiting mid-level nodes */}
      {midNodes.map(ln =>
        JUNCTION_OFFSETS.map(([ox, oy], j) => (
          <circle
            key={`jspark_${ln.node.id}_${j}`}
            cx={ln.x + ox} cy={ln.y + oy}
            r="0.50"
            fill="rgba(230,227,255,0.35)"
            style={{ pointerEvents: 'none' } as CSSProperties}
          >
            {!prefersReducedMotion && (
              <animate
                attributeName="opacity"
                values="0.07;0.45;0.07"
                dur={`${2.4 + j * 0.65}s`}
                begin={`${j * 0.38}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        ))
      )}

      {/* ═══ Decorative micro-filaments — animated opacity breathe ═══════════ */}

      {filaments.map((f, i) => (
        <path
          key={`fil_${i}`}
          d={f.path}
          fill="none"
          stroke="rgba(228,225,255,0.13)"
          strokeWidth="0.24"
          style={{ pointerEvents: 'none' } as CSSProperties}
        >
          {!prefersReducedMotion && (
            <animate
              attributeName="opacity"
              values="0.14;1;0.14"
              dur={`${3 + (i % 7) * 0.48}s`}
              begin={`${(i % 5) * 0.55}s`}
              repeatCount="indefinite"
            />
          )}
        </path>
      ))}

      {filaments.map((f, i) => (
        <circle
          key={`fsp_${i}`}
          cx={f.ex} cy={f.ey}
          r="0.52"
          fill="rgba(240,238,255,0.42)"
          style={{ pointerEvents: 'none' } as CSSProperties}
        >
          {!prefersReducedMotion && (
            <animate
              attributeName="opacity"
              values="0.07;0.62;0.07"
              dur={`${2 + (i % 5) * 0.55}s`}
              begin={`${(i % 4) * 0.48}s`}
              repeatCount="indefinite"
            />
          )}
        </circle>
      ))}

      {/* ═══ Wire hair filaments — faint organic strands branching off edges ═ */}
      {!prefersReducedMotion && wireHairs.map((h, i) => (
        <line
          key={`wh_${i}`}
          x1={h.x1} y1={h.y1}
          x2={h.x2} y2={h.y2}
          stroke={`rgba(228,225,255,${h.op})`}
          strokeWidth="0.40"
          strokeLinecap="round"
          style={{ pointerEvents: 'none' } as CSSProperties}
        >
          <animate
            attributeName="opacity"
            values={`${h.op * 0.15};${h.op};${h.op * 0.15}`}
            dur={`${h.dur}s`}
            begin={`${h.del}s`}
            repeatCount="indefinite"
          />
        </line>
      ))}

      {/* ═══ Edges — 5 pearl layers each ═════════════════════════════════════ */}

      {/* Layer 1: Outer mist */}
      {edges.map((e) => (
        <path
          key={`em_${e.id}`}
          d={bPath(e.from, e.to)}
          fill="none"
          stroke={`url(#lg_${safeFragment(e.id)}_${safe})`}
          strokeWidth="20"
          filter={`url(#${edgeMistId})`}
          className={`atlas-path--mist ${edgeClass(e)}`}
        />
      ))}

      {/* Layer 2: Stream */}
      {edges.map((e) => (
        <path
          key={`es_${e.id}`}
          d={bPath(e.from, e.to)}
          fill="none"
          stroke={`url(#lg_${safeFragment(e.id)}_${safe})`}
          strokeWidth="5"
          filter={`url(#${edgeStreamId})`}
          className={`atlas-path--stream ${edgeClass(e)}`}
        />
      ))}

      {/* Layer 3: Inner soft glow */}
      {edges.map((e) => (
        <path
          key={`eg_${e.id}`}
          d={bPath(e.from, e.to)}
          fill="none"
          stroke={`url(#lg_${safeFragment(e.id)}_${safe})`}
          strokeWidth="1.7"
          filter={`url(#${edgeBlurId})`}
          className={`atlas-path--glow ${edgeClass(e)}`}
        />
      ))}

      {/* Layer 4: Crisp thread */}
      {edges.map((e) => (
        <path
          key={`ec_${e.id}`}
          d={bPath(e.from, e.to)}
          fill="none"
          stroke={`url(#lg_${safeFragment(e.id)}_${safe})`}
          strokeWidth="0.50"
          pathLength={1}
          className={`atlas-path--crisp ${edgeClass(e)}`}
        />
      ))}

      {/* Layer 5: Highlight strand */}
      {edges.map((e) => (
        <path
          key={`eh_${e.id}`}
          d={hlPath(e.from, e.to)}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.20"
          pathLength={1}
          className={`atlas-path--highlight ${edgeClass(e)}`}
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
                {/* Outer rotating dashed ring — slow celestial rotation */}
                {!prefersReducedMotion && (
                  <circle
                    cx={ln.x} cy={ln.y}
                    r={ln.r + 40}
                    fill="none"
                    stroke={displayColor}
                    strokeWidth="0.28"
                    strokeDasharray="2 9"
                    strokeOpacity="0.15"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 ${ln.x} ${ln.y}`}
                      to={`360 ${ln.x} ${ln.y}`}
                      dur="22s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
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

            {/* Top anchor light — where parent wire meets this node's rim */}
            {!isLocked && !prefersReducedMotion && (
              <circle
                cx={ln.x} cy={ln.y - ln.r}
                r={isRoot ? 2.0 : 1.5}
                fill="rgba(240,237,255,0.88)"
                filter={`url(#${nodeGlowId})`}
                style={{ pointerEvents: 'none' } as CSSProperties}
              >
                <animate
                  attributeName="opacity"
                  values={isRoot ? '0.45;1;0.45' : '0.22;0.72;0.22'}
                  dur={isRoot ? '2.5s' : '3.5s'}
                  begin={`${i * 0.07}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Bottom anchor light — where child wires leave this node's rim */}
            {!isLocked && !prefersReducedMotion && (ln.node.children?.length ?? 0) > 0 && (
              <circle
                cx={ln.x} cy={ln.y + ln.r}
                r={isRoot ? 1.6 : 1.1}
                fill="rgba(230,227,255,0.72)"
                filter={`url(#${nodeGlowId})`}
                style={{ pointerEvents: 'none' } as CSSProperties}
              >
                <animate
                  attributeName="opacity"
                  values="0.12;0.52;0.12"
                  dur="4s"
                  begin={`${i * 0.07 + 0.28}s`}
                  repeatCount="indefinite"
                />
              </circle>
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
