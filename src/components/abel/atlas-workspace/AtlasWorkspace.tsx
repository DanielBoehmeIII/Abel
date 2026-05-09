import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { KeyboardEvent as RKE } from 'react';
import type { AtlasTreeNode } from '../AtlasTree';
import { buildWorkspaceLayout } from './atlasLayout';
import type { WorkspaceNode, WorkspaceEdge } from './atlasLayout';
import './AtlasWorkspace.css';

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'abel-atlas-view-v2';

function loadView(): { pan: { x: number; y: number }; scale: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveView(pan: { x: number; y: number }, scale: number) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ pan, scale })); } catch {}
}

// ── RNG ───────────────────────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ── Reduced motion ────────────────────────────────────────────────────────────
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Selection: related = selected + ancestors + descendants ───────────────────
function getRelated(root: AtlasTreeNode, selectedId: string): Set<string> {
  const s = new Set<string>();
  function addDesc(n: AtlasTreeNode) { s.add(n.id); n.children?.forEach(addDesc); }
  function findPath(n: AtlasTreeNode, path: string[]): boolean {
    const cur = [...path, n.id];
    if (n.id === selectedId) { cur.forEach(id => s.add(id)); addDesc(n); return true; }
    return (n.children ?? []).some(c => findPath(c, cur));
  }
  findPath(root, []);
  return s;
}

// ── Starfield ─────────────────────────────────────────────────────────────────
interface Star {
  cx: number; cy: number; r: number; op: number;
  dur: number; del: number; kind: 'bg' | 'root' | 'spine' | 'side';
}

function buildStars(rootX: number, rootY: number, W: number, H: number): Star[] {
  const rng = mkRng(54321);
  const stars: Star[] = [];
  for (let i = 0; i < 260; i++) {
    stars.push({ cx: rng() * W, cy: rng() * H, r: rng() * 1.0 + 0.2, op: rng() * 0.20 + 0.03, dur: 4 + rng() * 6, del: rng() * 9, kind: 'bg' });
  }
  for (let i = 0; i < 140; i++) {
    const a = rng() * Math.PI * 2;
    const d = i < 80 ? rng() * 95 + 10 : rng() * 180 + 80;
    stars.push({ cx: rootX + Math.cos(a) * d, cy: rootY + Math.sin(a) * d, r: rng() * (i < 80 ? 2.0 : 1.4) + 0.3, op: rng() * (i < 80 ? 0.65 : 0.38) + (i < 80 ? 0.20 : 0.10), dur: 1.0 + rng() * 2.5, del: rng() * 4, kind: 'root' });
  }
  for (let i = 0; i < 130; i++) {
    const t = rng();
    const cy = rootY + (t < 0.3 ? t * 300 : 300 + (t - 0.3) * 900);
    const dx = (rng() - 0.5) * (cy > rootY + 450 ? 280 : 180);
    stars.push({ cx: rootX + dx, cy: Math.min(cy, H), r: rng() * 1.5 + 0.25, op: rng() * (cy > rootY + 400 ? 0.40 : 0.28) + 0.06, dur: 2.0 + rng() * 4, del: rng() * 7, kind: 'spine' });
  }
  for (let i = 0; i < 110; i++) {
    stars.push({ cx: rng() * W, cy: rootY + rng() * 720, r: rng() * 1.2 + 0.18, op: rng() * 0.22 + 0.04, dur: 3 + rng() * 5, del: rng() * 8, kind: 'side' });
  }
  return stars;
}

// ── Node constellation specks ─────────────────────────────────────────────────
function buildSpecks(node: WorkspaceNode, count: number) {
  const rng = mkRng(node.id.charCodeAt(0) * 997 + (node.id.charCodeAt(1) || 0) * 31);
  const isLocked = node.status === 'locked';
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2;
    const dist  = rng() * (node.r - 5) * 0.86;
    return {
      cx: node.x + Math.cos(angle) * dist,
      cy: node.y + Math.sin(angle) * dist,
      sr: rng() * 1.3 + 0.3,
      op: rng() * (isLocked ? 0.16 : 0.50) + (isLocked ? 0.03 : 0.10),
      dur: 1.6 + rng() * 3.5,
      del: rng() * 5,
    };
  });
}

// ── Rim dust sparkles ─────────────────────────────────────────────────────────
function buildRimDust(node: WorkspaceNode, count: number) {
  const rng = mkRng(node.id.charCodeAt(0) * 113 + 7);
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2;
    const dist  = node.r - 3 - rng() * 4;
    return {
      cx: node.x + Math.cos(angle) * dist,
      cy: node.y + Math.sin(angle) * dist,
      sr: rng() * 0.7 + 0.2,
      op: rng() * 0.28 + 0.04,
      dur: 2 + rng() * 4,
      del: rng() * 6,
    };
  });
}

// ── Cubic bezier downward (Base44 cubicDown) ──────────────────────────────────
function cubicDown(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dy = to.y - from.y;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + dy * 0.42}, ${to.x} ${to.y - dy * 0.42}, ${to.x} ${to.y}`;
}

// ── Root hairs — faint branching strands off each wire ────────────────────────
function buildRootHairs(from: { x: number; y: number }, to: { x: number; y: number }, count: number) {
  const hairs: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t    = (i + 1) / (count + 1);
    const mx   = from.x + (to.x - from.x) * t;
    const my   = from.y + (to.y - from.y) * t;
    const side = i % 2 === 0 ? 1 : -1;
    const angle = ((i * 43) % 80) - 40;
    const rad   = (angle * Math.PI) / 180;
    const len   = 18 + (i % 5) * 8;
    hairs.push({
      x1: mx, y1: my,
      x2: mx + Math.cos(rad + Math.PI / 2) * side * (10 + (i % 4) * 7),
      y2: my + Math.sin(rad + Math.PI / 2) * side * (10 + (i % 4) * 7) + len * 0.35,
    });
  }
  return hairs;
}

// ── Decorative filaments radiating from nodes ─────────────────────────────────
interface Filament { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; op: number; dur: number; del: number; isMicro?: boolean }

function buildFilaments(nodes: WorkspaceNode[]): Filament[] {
  const rng  = mkRng(9999);
  const list: Filament[] = [];
  nodes.forEach(node => {
    const count = node.depth === 0 ? 28 : node.depth === 1 ? 18 : 14;
    for (let i = 0; i < count; i++) {
      const a  = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.7;
      const r1 = node.r + 2;
      const r2 = r1 + rng() * 60 + 18;
      const r3 = r2 + rng() * 35 + 10;
      const x1 = node.x + Math.cos(a) * r1,                         y1 = node.y + Math.sin(a) * r1;
      const x2 = node.x + Math.cos(a + (rng() - 0.5) * 0.5) * r2,  y2 = node.y + Math.sin(a + (rng() - 0.5) * 0.5) * r2;
      const x3 = node.x + Math.cos(a + (rng() - 0.5) * 0.7) * r3,  y3 = node.y + Math.sin(a + (rng() - 0.5) * 0.7) * r3;
      const op = node.depth === 0 ? rng() * 0.25 + 0.12 : rng() * 0.14 + 0.04;
      list.push({ x1, y1, x2, y2, x3, y3, op, dur: 2.2 + rng() * 4, del: rng() * 6 });
      if (i % 2 === 0) {
        const ba = a + (rng() - 0.5) * 0.8;
        list.push({ x1: x2, y1: y2, x2: x2 + Math.cos(ba) * (rng() * 28 + 8), y2: y2 + Math.sin(ba) * (rng() * 28 + 8), x3: x2 + (rng() - 0.5) * 12, y3: y2 + rng() * 12, op: op * 0.5, dur: 2.5 + rng() * 3.5, del: rng() * 6, isMicro: true });
      }
    }
  });
  return list;
}

// ── Junction stars at wire midpoints ──────────────────────────────────────────
interface JunctionStar { cx: number; cy: number; r: number; op: number; dur: number; del: number }

function buildJunctionStars(edges: WorkspaceEdge[]): JunctionStar[] {
  const rng = mkRng(7777);
  const pts: JunctionStar[] = [];
  edges.forEach(e => {
    ([0.28, 0.52, 0.76] as const).forEach(frac => {
      pts.push({
        cx: e.from.x + (e.to.x - e.from.x) * frac + (rng() - 0.5) * 16,
        cy: e.from.y + (e.to.y - e.from.y) * frac + (rng() - 0.5) * 16,
        r: e.isSpine ? rng() * 1.5 + 0.8 : rng() * 1.3 + 0.6,
        op: rng() * 0.55 + 0.22,
        dur: 1.5 + rng() * 2.5,
        del: rng() * 4,
      });
    });
    if (e.isSpine) {
      ([0.38, 0.62] as const).forEach(frac => {
        pts.push({
          cx: e.from.x + (e.to.x - e.from.x) * frac + (rng() - 0.5) * 8,
          cy: e.from.y + (e.to.y - e.from.y) * frac + (rng() - 0.5) * 8,
          r: rng() * 1.2 + 0.5, op: rng() * 0.45 + 0.18, dur: 1.8 + rng() * 2, del: rng() * 5,
        });
      });
    }
  });
  return pts;
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface AtlasWorkspaceProps {
  root: AtlasTreeNode;
  selectedId?: string;
  onNodeClick?: (node: AtlasTreeNode) => void;
  className?: string;
}

// SVG filter IDs — static, single instance per page
const F = { bloom: 'aw-bloom', wireGlow: 'aw-wg', ptGlow: 'aw-pg', rimGlow: 'aw-rg' } as const;

// ── Component ─────────────────────────────────────────────────────────────────
export default function AtlasWorkspace({ root, selectedId, onNodeClick }: AtlasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize]         = useState({ w: 0, h: 0 });
  const [isDragging, setDrag]   = useState(false);
  const [dragStart, setDS]      = useState({ x: 0, y: 0 });
  const [hoveredId, setHovered] = useState<string | null>(null);

  const savedView = useMemo(() => loadView(), []);
  const [pan,   setPan]   = useState(savedView?.pan   ?? { x: 0, y: 0 });
  const [scale, setScale] = useState(savedView?.scale ?? 0.72);

  const { nodes, edges, rootNode, canvasW, canvasH } = useMemo(() => buildWorkspaceLayout(root), [root]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Pan drag
  const onMD = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) { setDrag(true); setDS({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }
  }, [pan]);
  const onMM = useCallback((e: React.MouseEvent) => {
    if (isDragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);
  const onMU = useCallback(() => { if (isDragging) saveView(pan, scale); setDrag(false); }, [isDragging, pan, scale]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onW = (e: WheelEvent) => {
      e.preventDefault();
      setScale(s => { const n = Math.min(Math.max(s + (e.deltaY < 0 ? 0.06 : -0.06), 0.3), 2.4); saveView(pan, n); return n; });
    };
    el.addEventListener('wheel', onW, { passive: false });
    return () => el.removeEventListener('wheel', onW);
  }, [pan]);

  // Center root horizontally in viewport
  const treeOffX = size.w > 0 ? size.w / 2 - rootNode.x : 0;
  const treeOffY = 30;

  // Selection highlighting
  const relatedIds  = useMemo(() => selectedId ? getRelated(root, selectedId) : null, [root, selectedId]);
  const connectedSet = useMemo(() => {
    if (!hoveredId) return null;
    const s = new Set<string>([hoveredId]);
    edges.forEach(e => { if (e.from.id === hoveredId) s.add(e.to.id); if (e.to.id === hoveredId) s.add(e.from.id); });
    return s;
  }, [hoveredId, edges]);

  // Static geometry (rebuilt only when layout changes)
  const stars         = useMemo(() => buildStars(rootNode.x, rootNode.y, canvasW, canvasH), [rootNode.x, rootNode.y, canvasW, canvasH]);
  const filaments     = useMemo(() => buildFilaments(nodes), [nodes]);
  const junctionStars = useMemo(() => buildJunctionStars(edges), [edges]);
  const nodeVisuals   = useMemo(() => nodes.map(n => ({
    specks:  buildSpecks(n,   n.depth === 0 ? 26 : n.status === 'locked' ? 7 : 14),
    rimDust: buildRimDust(n,  n.depth === 0 ? 16 : 9),
  })), [nodes]);

  function nodeOp(n: WorkspaceNode): number {
    const locked = n.status === 'locked' ? 0.38 : 1;
    if (connectedSet && !connectedSet.has(n.id)) return 0.14 * locked;
    if (relatedIds   && !relatedIds.has(n.id))   return 0.12 * locked;
    return locked;
  }
  function edgeOp(e: WorkspaceEdge): number {
    if (connectedSet && !(connectedSet.has(e.from.id) && connectedSet.has(e.to.id))) return 0.07;
    if (relatedIds   && !(relatedIds.has(e.from.id)   && relatedIds.has(e.to.id)))   return 0.07;
    return 1;
  }

  function handleKeyDown(node: AtlasTreeNode) {
    return (e: RKE<SVGGElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && node.status !== 'locked') { e.preventDefault(); onNodeClick?.(node); }
    };
  }

  function resetView() { setPan({ x: 0, y: 0 }); setScale(0.72); saveView({ x: 0, y: 0 }, 0.72); }

  return (
    <div
      ref={containerRef}
      className="aw-container"
      onMouseDown={onMD}
      onMouseMove={onMM}
      onMouseUp={onMU}
      onMouseLeave={onMU}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Parallax background grid */}
      <div className="aw-grid" style={{ transform: `translate(${pan.x * 0.06}px, ${pan.y * 0.06}px)` }} />

      <svg
        width={size.w || '100%'}
        height={size.h || '100%'}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <filter id={F.bloom} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="26" result="b1" />
            <feGaussianBlur stdDeviation="9"  result="b2" in="SourceGraphic" />
            <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={F.wireGlow} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={F.ptGlow} x="-250%" y="-250%" width="600%" height="600%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={F.rimGlow} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <g transform={`translate(${treeOffX + pan.x}, ${treeOffY + pan.y}) scale(${scale})`}>

          {/* ══ Starfield ══════════════════════════════════════════════════════ */}
          {stars.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.op}>
              {!prefersReducedMotion && (
                <animate attributeName="opacity" values={`${s.op * 0.2};${s.op};${s.op * 0.2}`} dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />
              )}
              {!prefersReducedMotion && s.kind !== 'bg' && s.kind !== 'side' && (
                <animate attributeName="r" values={`${s.r * 0.5};${s.r * 1.5};${s.r * 0.5}`} dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />
              )}
            </circle>
          ))}

          {/* ══ Spine Column ═══════════════════════════════════════════════════ */}
          {(() => {
            const x  = rootNode.x;
            const y1 = rootNode.y - 55;
            const y2 = rootNode.y + 730;
            return (
              <g>
                <line x1={x} y1={y1} x2={x} y2={y2} stroke="rgba(255,255,255,0.04)" strokeWidth="60" strokeLinecap="round" filter={`url(#${F.bloom})`} />
                <line x1={x} y1={y1} x2={x} y2={y2} stroke="rgba(255,255,255,0.07)" strokeWidth="22" strokeLinecap="round" filter={`url(#${F.bloom})`} />
                <line x1={x} y1={y1} x2={x} y2={y2} stroke="rgba(255,255,255,0.12)" strokeWidth="6"  strokeLinecap="round" filter={`url(#${F.wireGlow})`} />
              </g>
            );
          })()}

          {/* ══ Decorative filaments ═══════════════════════════════════════════ */}
          {!prefersReducedMotion && filaments.map((f, i) => (
            <g key={`f-${i}`}>
              <path d={`M ${f.x1} ${f.y1} Q ${f.x2} ${f.y2} ${f.x3} ${f.y3}`}
                fill="none" stroke={`rgba(255,255,255,${f.op})`}
                strokeWidth={f.isMicro ? '0.35' : '0.55'} strokeLinecap="round">
                <animate attributeName="opacity" values={`${f.op * 0.15};${f.op};${f.op * 0.15}`} dur={`${f.dur}s`} begin={`${f.del}s`} repeatCount="indefinite" />
              </path>
              {!f.isMicro && (
                <circle cx={f.x3} cy={f.y3} r="1.0" fill="rgba(255,255,255,0.65)" filter={`url(#${F.ptGlow})`}>
                  <animate attributeName="opacity" values="0.04;0.75;0.04" dur={`${f.dur}s`} begin={`${f.del}s`} repeatCount="indefinite" />
                </circle>
              )}
            </g>
          ))}

          {/* ══ Wires ══════════════════════════════════════════════════════════ */}
          {edges.map((e, idx) => {
            const path  = cubicDown({ x: e.from.x, y: e.from.y }, { x: e.to.x, y: e.to.y });
            const hairs = !prefersReducedMotion ? buildRootHairs({ x: e.from.x, y: e.from.y }, { x: e.to.x, y: e.to.y }, e.isSpine ? 14 : 8) : [];
            const op    = edgeOp(e);
            const pDur  = `${1.4 + idx * 0.2}s`;
            const isSpine = e.isSpine;
            return (
              <g key={e.id} opacity={op} style={{ transition: 'opacity 0.4s ease' }}>
                {/* Root hairs */}
                {hairs.map((h, i) => (
                  <line key={`rh-${i}`} x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2}
                    stroke={isSpine ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.08)'}
                    strokeWidth={isSpine ? '0.45' : '0.4'} strokeLinecap="round">
                    <animate attributeName="opacity" values="0.03;0.19;0.03" dur={`${2.2 + i * 0.35}s`} begin={`${i * 0.28}s`} repeatCount="indefinite" />
                  </line>
                ))}
                {/* Spine-specific wide bloom */}
                {isSpine && (
                  <>
                    <path d={path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="38" strokeLinecap="round" filter={`url(#${F.bloom})`} />
                    <path d={path} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="16" strokeLinecap="round" filter={`url(#${F.bloom})`} />
                  </>
                )}
                {/* Outer mist bloom (all wires) */}
                <path d={path} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={isSpine ? 9 : 5} strokeLinecap="round" filter={`url(#${F.wireGlow})`} />
                {/* Thin inner glow */}
                <path d={path} fill="none" stroke={isSpine ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)'} strokeWidth={isSpine ? 2.5 : 1.5} strokeLinecap="round" filter={`url(#${F.wireGlow})`} />
                {/* Core filament */}
                <path d={path} fill="none" stroke={isSpine ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.45)'} strokeWidth={isSpine ? 1.1 : 0.75} strokeLinecap="round" />
                {/* Flow particle */}
                {!prefersReducedMotion && (
                  <circle r={isSpine ? 2.0 : 1.3} fill="rgba(255,255,255,0.85)" filter={`url(#${F.ptGlow})`}>
                    <animateMotion dur={pDur} repeatCount="indefinite" path={path} />
                    <animate attributeName="opacity" values="0;0.9;0" dur={pDur} repeatCount="indefinite" />
                  </circle>
                )}
                {/* Counter-flow particle on spine */}
                {isSpine && !prefersReducedMotion && (
                  <circle r="1.4" fill="rgba(255,255,255,0.55)" filter={`url(#${F.ptGlow})`}>
                    <animateMotion dur={`${parseFloat(pDur) * 1.7}s`} repeatCount="indefinite" path={path} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
                    <animate attributeName="opacity" values="0;0.6;0" dur={`${parseFloat(pDur) * 1.7}s`} repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

          {/* ══ Junction stars ═════════════════════════════════════════════════ */}
          {!prefersReducedMotion && junctionStars.map((p, i) => (
            <circle key={`js-${i}`} cx={p.cx} cy={p.cy} r={p.r} fill="white" filter={`url(#${F.ptGlow})`}>
              <animate attributeName="opacity" values={`${p.op * 0.15};${p.op};${p.op * 0.15}`} dur={`${p.dur}s`} begin={`${p.del}s`} repeatCount="indefinite" />
              <animate attributeName="r"       values={`${p.r * 0.5};${p.r * 1.6};${p.r * 0.5}`} dur={`${p.dur}s`} begin={`${p.del}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* ══ Spine Cap ══════════════════════════════════════════════════════ */}
          {!prefersReducedMotion && (() => {
            const cx = rootNode.x;
            const cy = rootNode.y - 66;
            return (
              <g>
                <circle cx={cx} cy={cy} r="28" fill="rgba(255,255,255,0.08)" filter={`url(#${F.bloom})`}>
                  <animate attributeName="r"       values="20;34;20"       dur="4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.05;0.15;0.05" dur="4s" repeatCount="indefinite" />
                </circle>
                <line x1={cx} y1={cy + 10} x2={cx} y2={rootNode.y - rootNode.r} stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" strokeLinecap="round" />
                <circle cx={cx} cy={cy} r="3.2" fill="white" filter={`url(#${F.ptGlow})`}>
                  <animate attributeName="opacity" values="0.55;1;0.55"  dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="r"       values="2.2;4;2.2"    dur="2.8s" repeatCount="indefinite" />
                </circle>
                {[0, 90, 45, 135].map((deg, fi) => {
                  const rad = (deg * Math.PI) / 180;
                  const len = fi < 2 ? 13 : 8;
                  return (
                    <line key={fi}
                      x1={cx + Math.cos(rad) * 3.5} y1={cy + Math.sin(rad) * 3.5}
                      x2={cx + Math.cos(rad) * len}  y2={cy + Math.sin(rad) * len}
                      stroke="rgba(255,255,255,0.55)" strokeWidth="0.7" strokeLinecap="round">
                      <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.8s" begin={`${fi * 0.3}s`} repeatCount="indefinite" />
                    </line>
                  );
                })}
              </g>
            );
          })()}

          {/* ══ Nodes ══════════════════════════════════════════════════════════ */}
          {nodes.map((node, i) => {
            const isRoot     = node.depth === 0;
            const isLocked   = node.status === 'locked';
            const isSelected = selectedId === node.id;
            const isHovered  = hoveredId  === node.id;
            const { specks, rimDust } = nodeVisuals[i];
            const glowR  = node.r + (isRoot ? 42 : 26);
            const gAlpha = isLocked ? 0.02 : isRoot ? 0.18 : isHovered ? 0.14 : 0.10;
            const rimOp  = isLocked ? 0.16 : isSelected ? 0.80 : isHovered ? 0.78 : 0.50;
            const opacity = nodeOp(node);

            return (
              <g
                key={node.id}
                className="aw-node"
                style={{ cursor: isLocked ? 'default' : 'pointer', opacity, transition: 'opacity 0.4s ease', animationDelay: `${0.08 + i * 0.05}s` }}
                onClick={() => { if (!isLocked) onNodeClick?.(node.rawNode); }}
                onKeyDown={handleKeyDown(node.rawNode)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                tabIndex={onNodeClick && !isLocked ? 0 : undefined}
                role={onNodeClick && !isLocked ? 'button' : undefined}
                aria-label={`${node.label}${node.status ? `, ${node.status}` : ''}`}
                aria-pressed={isSelected ? true : undefined}
              >
                {/* Wide outer bloom */}
                {!isLocked && (
                  <circle cx={node.x} cy={node.y} r={glowR} fill={`rgba(255,255,255,${gAlpha * 0.5})`} filter={`url(#${F.bloom})`}>
                    {!prefersReducedMotion && (
                      <>
                        <animate attributeName="r"       values={`${glowR - 10};${glowR + 10};${glowR - 10}`} dur={isRoot ? '5s' : '8s'} repeatCount="indefinite" />
                        <animate attributeName="opacity" values={`${gAlpha * 0.4};${gAlpha};${gAlpha * 0.4}`}  dur={isRoot ? '5s' : '8s'} repeatCount="indefinite" />
                      </>
                    )}
                  </circle>
                )}
                {/* Inner rim luminance ring */}
                {!isLocked && (
                  <circle cx={node.x} cy={node.y} r={node.r + 5} fill="none"
                    stroke="rgba(255,255,255,0.16)" strokeWidth={isRoot ? 10 : 6} filter={`url(#${F.rimGlow})`}>
                    {!prefersReducedMotion && <animate attributeName="opacity" values="0.35;0.95;0.35" dur={isRoot ? '4s' : '6s'} repeatCount="indefinite" />}
                  </circle>
                )}
                {/* Main disc */}
                <circle cx={node.x} cy={node.y} r={node.r}
                  fill="rgba(14,17,26,0.88)"
                  stroke={`rgba(255,255,255,${rimOp})`}
                  strokeWidth={isRoot ? 1.6 : isLocked ? 0.55 : 1.1}
                  style={{ transition: 'stroke-opacity 0.3s ease' }}
                />
                {/* Inset rim depth ring */}
                <circle cx={node.x} cy={node.y} r={node.r - 4} fill="none"
                  stroke={isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)'} strokeWidth="0.6" />
                {/* Rim dust */}
                {!isLocked && !prefersReducedMotion && rimDust.map((s, j) => (
                  <circle key={`rd-${j}`} cx={s.cx} cy={s.cy} r={s.sr} fill="white" opacity={s.op}>
                    <animate attributeName="opacity" values={`${s.op * 0.15};${s.op};${s.op * 0.15}`} dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />
                  </circle>
                ))}
                {/* Constellation specks */}
                {specks.map((s, j) => (
                  <circle key={`sp-${j}`} cx={s.cx} cy={s.cy} r={s.sr} fill="rgba(255,255,255,0.9)" opacity={s.op}>
                    {!prefersReducedMotion && <animate attributeName="opacity" values={`${s.op * 0.15};${s.op};${s.op * 0.15}`} dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />}
                  </circle>
                ))}
                {/* Top anchor light */}
                <circle cx={node.x} cy={node.y - node.r} r={isRoot ? 2.8 : isLocked ? 1.2 : 2.2} fill="white" filter={`url(#${F.ptGlow})`}>
                  {!prefersReducedMotion && <animate attributeName="opacity" values={isRoot ? '0.6;1;0.6' : isLocked ? '0.08;0.22;0.08' : '0.35;0.85;0.35'} dur={isRoot ? '2.5s' : '3.5s'} repeatCount="indefinite" />}
                </circle>
                {/* Bottom anchor light */}
                <circle cx={node.x} cy={node.y + node.r} r={isRoot ? 2.2 : isLocked ? 1.0 : 1.8} fill="white" filter={`url(#${F.ptGlow})`}>
                  {!prefersReducedMotion && <animate attributeName="opacity" values={isLocked ? '0.05;0.18;0.05' : '0.22;0.65;0.22'} dur="4s" repeatCount="indefinite" />}
                </circle>
                {/* Root 4-point star flares */}
                {isRoot && [0, 90, 180, 270].map((deg, fi) => {
                  const rad = (deg * Math.PI) / 180;
                  return (
                    <g key={`rf-${fi}`}>
                      <line
                        x1={node.x + Math.cos(rad) * node.r}        y1={node.y + Math.sin(rad) * node.r}
                        x2={node.x + Math.cos(rad) * (node.r + 12)} y2={node.y + Math.sin(rad) * (node.r + 12)}
                        stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" strokeLinecap="round">
                        {!prefersReducedMotion && <animate attributeName="opacity" values="0.15;0.55;0.15" dur="3.5s" begin={`${fi * 0.6}s`} repeatCount="indefinite" />}
                      </line>
                      <circle cx={node.x + Math.cos(rad) * (node.r + 1)} cy={node.y + Math.sin(rad) * (node.r + 1)} r="1.8" fill="white" filter={`url(#${F.ptGlow})`}>
                        {!prefersReducedMotion && <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.5s" begin={`${fi * 0.6}s`} repeatCount="indefinite" />}
                      </circle>
                    </g>
                  );
                })}
                {/* Label shadow */}
                <text x={node.x} y={node.y - (node.subtitle ? (isRoot ? 10 : 7) : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(0,0,0,0.65)" fontSize={isRoot ? 15 : node.depth <= 2 ? 12 : 10}
                  fontFamily="var(--font-sans)" fontWeight={isRoot ? 600 : 500}
                  dx="0.5" dy="0.5" style={{ pointerEvents: 'none' }}
                >{node.label}</text>
                {/* Label */}
                <text x={node.x} y={node.y - (node.subtitle ? (isRoot ? 10 : 7) : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={`rgba(255,255,255,${isLocked ? 0.35 : isHovered || isSelected ? 1 : 0.93})`}
                  fontSize={isRoot ? 15 : node.depth <= 2 ? 12 : 10}
                  fontFamily="var(--font-sans)" fontWeight={isRoot ? 600 : 500}
                  style={{ pointerEvents: 'none', transition: 'fill 0.3s ease' }}
                >{node.label}</text>
                {/* Subtitle */}
                {node.subtitle && (
                  <text x={node.x} y={node.y + (isRoot ? 11 : 9)}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={`rgba(200,210,230,${isLocked ? 0.22 : 0.60})`}
                    fontSize={isRoot ? 10 : 8.5} fontFamily="var(--font-mono)"
                    fontWeight={300} letterSpacing="0.09em"
                    style={{ pointerEvents: 'none' }}
                  >{node.subtitle}</text>
                )}
                {/* Selected rotating dashed ring */}
                {isSelected && (
                  <circle cx={node.x} cy={node.y} r={node.r + 14}
                    fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.7" strokeDasharray="3 6">
                    {!prefersReducedMotion && (
                      <animateTransform attributeName="transform" type="rotate"
                        from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`}
                        dur="18s" repeatCount="indefinite" />
                    )}
                  </circle>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <button className="aw-reset-btn" onClick={resetView} title="Reset view">RESET VIEW</button>
      <span className="aw-hint">scroll to zoom · drag to pan</span>
    </div>
  );
}
