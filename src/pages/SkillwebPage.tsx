import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAbel } from '../state/useAbel';
import type { PageId, SkillNode } from '../types/abel';
import GlowButton from '../components/common/GlowButton';
import './SkillwebPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const MILESTONES = [20, 40, 60, 80, 100] as const;
const INITIALLY_UNLOCKED = new Set([
  'systems-thinking', 'emotional-clarity', 'creative-direction', 'discipline-flow',
]);

// ─── Layout ──────────────────────────────────────────────────────────────────
const NODE_R = 52;

interface LayoutNode { skill: SkillNode; x: number; y: number; depth: number; }
interface LayoutEdge { from: LayoutNode; to: LayoutNode; }

// Organic layout — use skill's seed x/y positions scaled to panel space
function computeLayout(skills: SkillNode[]): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  // Compute depths
  const depthMap = new Map<string, number>();
  skills.filter(s => s.unlockedBy.length === 0).forEach(s => depthMap.set(s.id, 0));
  let changed = true;
  while (changed) {
    changed = false;
    skills.forEach(s => {
      const pd = s.unlockedBy.map(pid => depthMap.get(pid) ?? -1).filter(d => d >= 0);
      if (pd.length > 0) {
        const nd = Math.max(...pd) + 1;
        if ((depthMap.get(s.id) ?? Infinity) > nd) { depthMap.set(s.id, nd); changed = true; }
      }
    });
  }

  // Use seed x/y (knowledge-graph positions) as organic base, scale to layout space
  const xs = skills.map(s => s.x), ys = skills.map(s => s.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rX   = (maxX - minX) || 1, rY = (maxY - minY) || 1;

  // Layout spans ~640 wide × ~300 tall, centered at origin
  // Children get a small rightward nudge relative to their depth
  const nodes: LayoutNode[] = skills.map(s => {
    const depth = depthMap.get(s.id) ?? 0;
    const nx = ((s.x - minX) / rX - 0.5) * 640 + depth * 60;
    const ny = ((s.y - minY) / rY - 0.5) * 300;
    return { skill: s, x: nx, y: ny, depth };
  });

  const byId = new Map(nodes.map(n => [n.skill.id, n]));
  const edges: LayoutEdge[] = [];
  skills.forEach(s => {
    s.unlockedBy.forEach(pid => {
      const from = byId.get(pid), to = byId.get(s.id);
      if (from && to) edges.push({ from, to });
    });
  });

  return { nodes, edges };
}

// ─── Connected set ────────────────────────────────────────────────────────────
function getConnectedIds(selectedId: string, edges: LayoutEdge[]): Set<string> {
  const connected = new Set<string>([selectedId]);
  let frontier = [selectedId];
  while (true) {
    const next: string[] = [];
    frontier.forEach(id => edges.forEach(e => {
      if (e.to.skill.id === id && !connected.has(e.from.skill.id)) {
        connected.add(e.from.skill.id); next.push(e.from.skill.id);
      }
      if (e.from.skill.id === id && !connected.has(e.to.skill.id)) {
        connected.add(e.to.skill.id); next.push(e.to.skill.id);
      }
    }));
    if (next.length === 0) break;
    frontier = next;
  }
  return connected;
}

// ─── Wave path ────────────────────────────────────────────────────────────────
function getWavePath(_n: LayoutNode[], edges: LayoutEdge[], selectedId: string): string[] {
  function ancestorChain(id: string, seen = new Set<string>()): string[] {
    if (seen.has(id)) return [];
    seen.add(id);
    const pe = edges.find(e => e.to.skill.id === id);
    return pe ? [...ancestorChain(pe.from.skill.id, seen), id] : [id];
  }
  const ancestors = ancestorChain(selectedId).slice(0, -1);
  const visited = new Set([selectedId, ...ancestors]);
  const desc: string[] = [];
  let front = [selectedId];
  while (front.length > 0) {
    const next: string[] = [];
    front.forEach(id => edges.forEach(e => {
      if (e.from.skill.id === id && !visited.has(e.to.skill.id)) {
        visited.add(e.to.skill.id); desc.push(e.to.skill.id); next.push(e.to.skill.id);
      }
    }));
    front = next;
  }
  return [...ancestors, selectedId, ...desc];
}

// ─── Text: always first-word / rest split ────────────────────────────────────
function wrapName(name: string): [string, string] {
  const idx = name.indexOf(' ');
  if (idx === -1) return [name, ''];
  return [name.slice(0, idx), name.slice(idx + 1)];
}

// ─── Arched tendril path (quadratic bezier with perpendicular lift) ───────────
function tendrilPath(
  fx: number, fy: number, tx: number, ty: number,
  strength: number, flip: boolean
): string {
  const mx = (fx + tx) / 2;
  const my = (fy + ty) / 2;
  const ddx = tx - fx, ddy = ty - fy;
  const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
  const px = -ddy / len, py = ddx / len;          // perpendicular unit vector
  const lift = len * strength * (flip ? -1 : 1);
  return `M${fx},${fy} Q${mx + px * lift},${my + py * lift} ${tx},${ty}`;
}

// ─── Midpoint of a quadratic bezier ──────────────────────────────────────────
function quadMid(
  fx: number, fy: number, cpx: number, cpy: number, tx: number, ty: number
): { x: number; y: number } {
  const t = 0.5, mt = 0.5;
  return {
    x: mt * mt * fx + 2 * mt * t * cpx + t * t * tx,
    y: mt * mt * fy + 2 * mt * t * cpy + t * t * ty,
  };
}


// ─── SVG Canvas ───────────────────────────────────────────────────────────────
function SkillWebCanvas({
  nodes, edges, selectedId, waveIds, wavePhase, unlockedIds, onNodeClick, onDeselect,
}: {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  selectedId: string | null;
  waveIds: string[];
  wavePhase: number;
  unlockedIds: Set<string>;
  onNodeClick: (id: string) => void;
  onDeselect: () => void;
}) {
  if (nodes.length === 0) return null;

  const xs  = nodes.map(n => n.x);
  const ys  = nodes.map(n => n.y);
  const pad = NODE_R + 100;
  const vX  = Math.min(...xs) - pad;
  const vY  = Math.min(...ys) - pad;
  const vW  = Math.max(...xs) + pad - vX;
  const vH  = Math.max(...ys) + pad - vY;

  const connSet = selectedId ? getConnectedIds(selectedId, edges) : null;

  // Ambient edge set: nearest 3 neighbors per unlocked node not in real edges
  const unlockedNodes = nodes.filter(n => unlockedIds.has(n.skill.id));
  const realEdgeKeys = new Set(edges.map(e => `${e.from.skill.id}|${e.to.skill.id}`));
  const ambientSet = new Set<string>();
  const ambientPairs: [LayoutNode, LayoutNode][] = [];
  for (const a of unlockedNodes) {
    const others = unlockedNodes
      .filter(b => b !== a &&
        !realEdgeKeys.has(`${a.skill.id}|${b.skill.id}`) &&
        !realEdgeKeys.has(`${b.skill.id}|${a.skill.id}`))
      .sort((b, c) => {
        const db = (b.x-a.x)**2 + (b.y-a.y)**2;
        const dc = (c.x-a.x)**2 + (c.y-a.y)**2;
        return db - dc;
      })
      .slice(0, 3);
    for (const b of others) {
      const key = [a.skill.id, b.skill.id].sort().join('|');
      if (!ambientSet.has(key)) { ambientSet.add(key); ambientPairs.push([a, b]); }
    }
  }

  // Nebula center (average unlocked node position for atmosphere)
  const unlockedCx = unlockedNodes.length > 0
    ? unlockedNodes.reduce((s, n) => s + n.x, 0) / unlockedNodes.length : 0;
  const unlockedCy = unlockedNodes.length > 0
    ? unlockedNodes.reduce((s, n) => s + n.y, 0) / unlockedNodes.length : 0;

  return (
    <svg
      viewBox={`${vX} ${vY} ${vW} ${vH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      {/* Deselect background */}
      <rect x={vX} y={vY} width={vW} height={vH} fill="transparent" onClick={onDeselect} />

      <defs>
        {/* Node gradients — fade to transparent at edge for water-drop boundary */}
        <radialGradient id="swg-norm" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#0e1438" stopOpacity="0.97" />
          <stop offset="65%"  stopColor="#080c26" stopOpacity="0.95" />
          <stop offset="88%"  stopColor="#0c1232" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#10184a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="swg-sel" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#162268" stopOpacity="0.97" />
          <stop offset="65%"  stopColor="#0a1445" stopOpacity="0.95" />
          <stop offset="88%"  stopColor="#1440a0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2055cc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="swg-conn" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#111a35" stopOpacity="0.97" />
          <stop offset="65%"  stopColor="#090f28" stopOpacity="0.95" />
          <stop offset="88%"  stopColor="#102a80" stopOpacity="0.50" />
          <stop offset="100%" stopColor="#1a3aaa" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="swg-lock" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#0a0a1a" stopOpacity="0.90" />
          <stop offset="72%"  stopColor="#0e0e1e" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#111120" stopOpacity="0" />
        </radialGradient>

        {/* Nebula radial gradient for background atmosphere */}
        <radialGradient id="swg-nebula" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1a3aff" stopOpacity="0.055" />
          <stop offset="50%"  stopColor="#0d22cc" stopOpacity="0.028" />
          <stop offset="100%" stopColor="#050a55" stopOpacity="0" />
        </radialGradient>

        {/* Filters */}
        <filter id="swf-haze" x="-150%" y="-800%" width="400%" height="1700%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id="swf-amb" x="-150%" y="-800%" width="400%" height="1700%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="swf-mid" x="-60%" y="-800%" width="220%" height="1700%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="swf-bloom" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="20" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="swf-dot" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="4.5" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="swf-rim" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="swf-nebula" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
        {/* Wisp: heavy turbulence displacement → soft glow — node rings break into organic filaments */}
        <filter id="swf-wisp" x="-100%" y="-100%" width="300%" height="300%">
          <feTurbulence type="fractalNoise" baseFrequency="0.038 0.025" numOctaves="5" seed="7" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="22"
            xChannelSelector="R" yChannelSelector="G" result="warped"/>
          <feGaussianBlur in="warped" stdDeviation="3.0" result="blurred"/>
          <feMerge>
            <feMergeNode in="blurred"/>
          </feMerge>
        </filter>
        {/* Thin corona: small blur with source on top for inner bright ring */}
        <filter id="swf-corona" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.0" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Background nebula atmosphere ──────────────────────────────── */}
      <ellipse cx={unlockedCx} cy={unlockedCy}
        rx={vW * 0.55} ry={vH * 0.48}
        fill="rgba(18,55,255,0.07)"
        filter="url(#swf-nebula)"
      />
      <ellipse cx={unlockedCx} cy={unlockedCy}
        rx={vW * 0.30} ry={vH * 0.28}
        fill="rgba(30,80,255,0.10)"
        filter="url(#swf-nebula)"
      />

      {/* ── Ambient web connections — arched tendrils ───────────────── */}
      {ambientPairs.map(([a, b], i) => {
        const ambActive = !!(selectedId && (a.skill.id === selectedId || b.skill.id === selectedId));
        // Two tendrils per connection: one arching each way, different strengths
        const flip = (i % 2) === 0;
        const strength1 = 0.38 + (i % 3) * 0.08;   // 0.38 – 0.54
        const strength2 = strength1 * 0.5;
        const p1 = tendrilPath(a.x, a.y, b.x, b.y, strength1,  flip);
        const p2 = tendrilPath(a.x, a.y, b.x, b.y, strength2, !flip);
        // Midpoint of primary tendril for junction dot
        const ddx = b.x - a.x, ddy = b.y - a.y;
        const len = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
        const px = -ddy/len, py = ddx/len;
        const lift = len * strength1 * (flip ? -1 : 1);
        const cpx = (a.x+b.x)/2 + px*lift, cpy = (a.y+b.y)/2 + py*lift;
        const ambMid = quadMid(a.x, a.y, cpx, cpy, b.x, b.y);
        // Cycle wire color: blue / cyan / violet for visual variety
        const hue      = i % 3;
        const baseGlow = hue === 0 ? '25,70,210' : hue === 1 ? '20,140,220' : '90,40,220';
        const beam     = hue === 0 ? '70,150,255' : hue === 1 ? '60,200,255' : '160,100,255';
        return (
          <g key={`amb-${i}`}>
            {/* Soft outer glow */}
            <path d={p1} fill="none"
              stroke={ambActive ? `rgba(${baseGlow},0.42)` : `rgba(${baseGlow},0.24)`}
              strokeWidth={ambActive ? 18 : 12}
              filter="url(#swf-amb)"
            />
            {/* Secondary tendril glow */}
            <path d={p2} fill="none"
              stroke={ambActive ? `rgba(${baseGlow},0.30)` : `rgba(${baseGlow},0.18)`}
              strokeWidth={ambActive ? 10 : 7}
              filter="url(#swf-amb)"
            />
            {/* Bright inner beam — the visible tendril */}
            <path d={p1} fill="none"
              stroke={ambActive ? `rgba(${beam},0.90)` : `rgba(${beam},0.65)`}
              strokeWidth={ambActive ? 6 : 3.5}
              filter="url(#swf-mid)"
            />
            {/* Apex junction dot */}
            <circle cx={ambMid.x} cy={ambMid.y}
              r={ambActive ? 4.5 : 2.8}
              fill={ambActive ? 'rgba(160,225,255,0.96)' : 'rgba(80,150,235,0.65)'}
              filter="url(#swf-dot)"
            />
          </g>
        );
      })}

      {/* ── Real edges — arched tendrils, bolder than ambient ───────── */}
      {edges.map((edge, i) => {
        const { from, to } = edge;
        const fromLocked = !unlockedIds.has(from.skill.id);
        const toLocked   = !unlockedIds.has(to.skill.id);

        if (fromLocked || toLocked) {
          const p = tendrilPath(from.x, from.y, to.x, to.y, 0.18, i % 2 === 0);
          return (
            <path key={`e${i}`} d={p} fill="none"
              stroke="rgba(35,45,110,0.22)" strokeWidth="10"
              filter="url(#swf-amb)" />
          );
        }

        const active = !!(connSet && connSet.has(from.skill.id) && connSet.has(to.skill.id));
        const flip = i % 2 === 0;
        const s1 = active ? 0.42 : 0.32;
        const s2 = active ? 0.18 : 0.14;
        const p1 = tendrilPath(from.x, from.y, to.x, to.y, s1,  flip);
        const p2 = tendrilPath(from.x, from.y, to.x, to.y, s2, !flip);
        // Apex of primary tendril for junction dot
        const edx = to.x - from.x, edy = to.y - from.y;
        const elen = Math.sqrt(edx*edx + edy*edy) || 1;
        const epx = -edy/elen, epy = edx/elen;
        const elift = elen * s1 * (flip ? -1 : 1);
        const ecpx = (from.x+to.x)/2 + epx*elift;
        const ecpy = (from.y+to.y)/2 + epy*elift;
        const apex = quadMid(from.x, from.y, ecpx, ecpy, to.x, to.y);

        return (
          <g key={`e${i}`}>
            {/* Outer ambient haze */}
            <path d={p1} fill="none"
              stroke={active ? 'rgba(30,100,255,0.42)' : 'rgba(20,70,220,0.28)'}
              strokeWidth={active ? 28 : 20}
              filter="url(#swf-haze)"
            />
            {/* Secondary arch soft glow */}
            <path d={p2} fill="none"
              stroke={active ? 'rgba(35,110,255,0.32)' : 'rgba(22,78,200,0.20)'}
              strokeWidth={active ? 16 : 12}
              filter="url(#swf-amb)"
            />
            {/* Main glowing tendril beam */}
            <path d={p1} fill="none"
              stroke={active ? 'rgba(100,190,255,0.90)' : 'rgba(65,145,255,0.62)'}
              strokeWidth={active ? 12 : 7}
              filter="url(#swf-mid)"
            />
            {/* Bright hot core */}
            <path d={p1} fill="none"
              stroke={active ? 'rgba(210,245,255,0.98)' : 'rgba(160,215,255,0.75)'}
              strokeWidth={active ? 4.5 : 2.8}
              filter="url(#swf-mid)"
            />
            {/* Apex junction dot */}
            <circle cx={apex.x} cy={apex.y}
              r={active ? 7 : 5}
              fill={active ? 'rgba(150,220,255,0.98)' : 'rgba(80,150,240,0.75)'}
              filter="url(#swf-dot)"
            />
          </g>
        );
      })}

      {/* ── Nodes ── */}
      {nodes.map((node, idx) => {
        const { skill } = node;
        const isLocked = !unlockedIds.has(skill.id);
        const isSel    = selectedId === skill.id;
        const isConn   = !isLocked && (connSet?.has(skill.id) ?? false);

        // Wave
        let wY = 0, wS = 1;
        const wIdx = waveIds.indexOf(skill.id);
        if (wIdx >= 0 && waveIds.length > 0) {
          const frac  = wIdx / waveIds.length;
          const local = Math.max(0, Math.min((wavePhase - frac) / 0.42, 1));
          const amp   = Math.sin(local * Math.PI);
          wY = -5 * amp;
          wS = 1 + 0.07 * amp;
        }

        const [line1, line2] = wrapName(skill.name);
        const r       = NODE_R;
        const gradId  = isSel ? 'swg-sel' : isConn ? 'swg-conn' : isLocked ? 'swg-lock' : 'swg-norm';
        const rimA    = isLocked ? 0.20 : isSel ? 0.98 : isConn ? 0.88 : 0.72;
        const rimC    = isLocked ? '70,75,130' : isSel ? '175,230,255' : '140,205,255';

        // Unique float parameters per node — staggered phase so nodes never peak together
        const floatDur  = 3.4 + (idx * 0.31) % 1.6;     // 3.4s – 5.0s
        const floatAmp  = 5.5 + (idx * 0.7)  % 2.5;     // 5.5px – 8px
        const floatBeg  = -((idx * 0.55) % floatDur);    // negative = already in-progress
        const floatVals = `0,0; 0,${-floatAmp.toFixed(1)}; 0,0; 0,${floatAmp.toFixed(1)}; 0,0`;
        const scaleDur  = floatDur * 1.3;
        const scaleVals = `1 1; 1.018 1.018; 1 1; 0.984 0.984; 1 1`;

        return (
          <g key={skill.id}
            transform={`translate(${node.x}, ${node.y})`}
            onClick={e => { e.stopPropagation(); if (!isLocked) onNodeClick(skill.id); }}
            style={{ cursor: isLocked ? 'default' : 'pointer' }}
          >
            {/* Idle float — SMIL, runs entirely off JS thread */}
            <animateTransform attributeName="transform" type="translate"
              values={floatVals} dur={`${floatDur}s`} begin={`${floatBeg}s`}
              repeatCount="indefinite" additive="sum" calcMode="spline"
              keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
            />
            {/* Wave pop on node click — additive translate */}
            <animateTransform attributeName="transform" type="translate"
              values={`0,0; 0,${-wY}; 0,0`} dur="0.001s"
              repeatCount="1" additive="sum" begin="indefinite"
            />
            {/* Subtle breathe scale */}
            <animateTransform attributeName="transform" type="scale"
              values={scaleVals} dur={`${scaleDur}s`} begin={`${floatBeg * 0.7}s`}
              repeatCount="indefinite" additive="sum" calcMode="spline"
              keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
            />
            {/* Wave/click animation group */}
            <g transform={`translate(0, ${wY}) scale(${wS})`}>

            {/* Body fill — gradient fades to transparent */}
            <circle cx={0} cy={0} r={r} fill={`url(#${gradId})`} />

            {/* Outer wisp halo — heavy displacement scatters ring into organic filaments */}
            {!isLocked && (
              <circle cx={0} cy={0} r={r}
                fill="none"
                stroke={`rgba(${rimC},${(rimA * 0.72).toFixed(2)})`}
                strokeWidth={isSel ? 7 : 5}
                filter="url(#swf-wisp)"
              />
            )}

            {/* Inner corona ring — crisp bright core on top of wisp halo */}
            {!isLocked && (
              <circle cx={0} cy={0} r={r}
                fill="none"
                stroke={`rgba(${rimC},${(rimA * 0.60).toFixed(2)})`}
                strokeWidth={isSel ? 2.5 : 1.5}
                filter="url(#swf-corona)"
              />
            )}

            {/* Selection / connection inner bloom — very subtle, contained */}
            {!isLocked && (isSel || isConn) && (
              <circle cx={0} cy={0} r={r * 0.7}
                fill={isSel ? 'rgba(40,100,255,0.08)' : 'rgba(25,75,200,0.05)'}
                filter="url(#swf-corona)"
              />
            )}

            {/* Mastery arc — blurred so it reads as glow, not a line */}
            {!isLocked && skill.mastery > 0 && (() => {
              const ar = r + 10, circ = 2 * Math.PI * ar;
              return (
                <circle cx={0} cy={0} r={ar} fill="none"
                  stroke={isSel ? `rgba(${rimC},0.80)` : `rgba(${rimC},0.42)`}
                  strokeWidth={isSel ? 5 : 3.5}
                  strokeDasharray={`${circ * skill.mastery / 100} ${circ}`}
                  strokeLinecap="round"
                  transform="rotate(-90)"
                  filter="url(#swf-rim)"
                />
              );
            })()}

            {/* Lock symbol */}
            {isLocked && (
              <text x={0} y={2} textAnchor="middle" dominantBaseline="central"
                fontSize={16} fill="rgba(100,100,150,0.38)" fontFamily="var(--font-sans)">⊘</text>
            )}

            {/* Skill text — 2 line */}
            {!isLocked && (
              <>
                <text x={0} y={line2 ? -10 : -2}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={13} fontWeight="600" letterSpacing="0.01em"
                  fill={isSel ? 'rgba(235,248,255,0.98)' : 'rgba(210,230,255,0.85)'}
                  fontFamily="var(--font-sans)">
                  {line1}
                </text>
                {line2 && (
                  <text x={0} y={9}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={10.5} fontWeight="400" letterSpacing="0.02em"
                    fill={isSel ? 'rgba(170,210,255,0.82)' : 'rgba(140,180,240,0.58)'}
                    fontFamily="var(--font-sans)">
                    {line2}
                  </text>
                )}
              </>
            )}
            {/* Locked label */}
            {isLocked && (
              <text x={0} y={r + 18} textAnchor="middle"
                fontSize={9.5} fill="rgba(80,80,130,0.40)" fontFamily="var(--font-sans)">
                {skill.name}
              </text>
            )}
            </g>{/* end wave group */}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SkillwebPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { skills, eggs, quests } = state;

  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [unlockedIds,   setUnlockedIds]   = useState<Set<string>>(new Set(INITIALLY_UNLOCKED));
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [showDebug,     setShowDebug]     = useState(false);
  const [showBoost,     setShowBoost]     = useState(false);
  const [waveIds,       setWaveIds]       = useState<string[]>([]);
  const [wavePhase,     setWavePhase]     = useState(0);
  const waveRef = useRef<number | null>(null);

  const { nodes, edges } = useMemo(() => computeLayout(skills), [skills]);

  const selected       = selectedId ? (skills.find(s => s.id === selectedId) ?? null) : null;
  const selectedQuests = quests.filter(q => selected && q.linkedSkillIds.includes(selected.id));
  const activePaths    = skills.filter(s => unlockedIds.has(s.id) && s.mastery > 0 && s.mastery < 100).length;
  const masteryPoints  = skills.reduce((a, s) => a + Math.floor(s.mastery / 10), 0);
  const lockedSkills   = skills.filter(s => !unlockedIds.has(s.id));

  useEffect(() => () => { if (waveRef.current) cancelAnimationFrame(waveRef.current); }, []);

  const triggerWave = useCallback((ids: string[]) => {
    if (waveRef.current) cancelAnimationFrame(waveRef.current);
    setWaveIds(ids);
    const start = performance.now();
    function tick() {
      const t = (performance.now() - start) / 1400;
      if (t >= 1) { setWavePhase(0); waveRef.current = null; return; }
      setWavePhase(t);
      waveRef.current = requestAnimationFrame(tick);
    }
    waveRef.current = requestAnimationFrame(tick);
  }, []);

  function handleNodeClick(id: string) {
    if (selectedId === id) {
      setSelectedId(null); setWaveIds([]); setWavePhase(0);
      if (waveRef.current) { cancelAnimationFrame(waveRef.current); waveRef.current = null; }
      return;
    }
    setSelectedId(id);
    setShowBoost(false);
    triggerWave(getWavePath(nodes, edges, id));
  }

  function handleDeselect() {
    setSelectedId(null); setWaveIds([]); setWavePhase(0);
    if (waveRef.current) { cancelAnimationFrame(waveRef.current); waveRef.current = null; }
  }

  function boostSkill(amt: number) {
    if (!selected) return;
    dispatch({ type: 'INCREASE_SKILL', skillId: selected.id, amount: amt });
    setShowBoost(false);
  }

  return (
    <div className="sw-page">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className={`sw-hero${panelExpanded ? ' sw-hero--collapsed' : ''}`}>
        <div className="sw-hero-left">
          <p className="sw-eyebrow">EVERY SKILL CONNECTS · EVERY CONNECTION TRANSFORMS</p>
          <h1 className="sw-title">SKILL<br />WEB</h1>
        </div>
        <div className="sw-hero-center">
          <p className="sw-subtitle">A living map of what<br />you know, feel, and are becoming.</p>
          <div className="sw-title-accent" />
        </div>
        <div className="sw-hero-right">
          <div className="sw-stat-card">
            <span className="sw-stat-label">MASTERY POINTS</span>
            <span className="sw-stat-val">+{masteryPoints}</span>
          </div>
        </div>
      </div>

      {/* ── Panel ────────────────────────────────────────── */}
      <div className={`sw-panel${panelExpanded ? ' sw-panel--expanded' : ''}`}>
        <button className="sw-expand-btn" onClick={() => setPanelExpanded(e => !e)}>
          {panelExpanded ? '↙' : '↗'}
        </button>

        <div className="sw-panel-inner">

          {/* Left: focus */}
          <div className="sw-panel-focus">
            {selected ? (
              <>
                <p className="sw-focus-eyebrow">CURRENT FOCUS</p>
                <h2 className="sw-focus-name">{selected.name}</h2>
                <p className="sw-focus-sub">{selected.category}</p>
                <p className="sw-focus-desc">{selected.description}</p>
                <div className="sw-milestones">
                  {MILESTONES.map(m => {
                    const egg    = eggs.find(e => e.skillId === selected.id && e.milestone === m);
                    const reached = selected.mastery >= m;
                    return (
                      <div key={m} className="sw-milestone">
                        <div className={`sw-milestone-dot${reached ? ' sw-milestone-dot--on' : ''}`} />
                        <span className="sw-milestone-pct">{m}%</span>
                        {egg && egg.state !== 'unearned' ? (
                          <span className={`pill status-${egg.state === 'hatched' ? 'completed' : 'available'}`}
                            style={{ fontSize: '0.58rem', cursor: egg.state === 'earned' ? 'pointer' : 'default' }}
                            onClick={() => egg.state === 'earned' && onNavigate('egg-hatch')}>
                            {egg.state === 'hatched' ? '✓' : 'HATCH'}
                          </span>
                        ) : reached ? <span className="sw-milestone-done">·</span> : null}
                      </div>
                    );
                  })}
                </div>
                {selectedQuests.length > 0 && (
                  <div className="sw-linked-quests">
                    <p className="sw-focus-eyebrow" style={{ marginTop: '6px' }}>LINKED QUESTS</p>
                    {selectedQuests.map(q => (
                      <div key={q.id} className="sw-quest-row" onClick={() => onNavigate('quests')}>
                        <span className={`pill status-${q.status}`} style={{ fontSize: '0.55rem' }}>{q.status}</span>
                        <span className="sw-quest-title">{q.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="sw-focus-actions">
                  <GlowButton variant="purple" size="sm" onClick={() => setShowBoost(b => !b)}>+ BOOST</GlowButton>
                  <GlowButton variant="ghost" size="sm" onClick={() => onNavigate('egg-hatch')}>EGGS →</GlowButton>
                </div>
                {showBoost && (
                  <div className="sw-boost-row">
                    {[5,10,20].map(a => (
                      <GlowButton key={a} variant="cyan" size="sm" onClick={() => boostSkill(a)}>+{a}%</GlowButton>
                    ))}
                    <GlowButton variant="ghost" size="sm" onClick={() => setShowBoost(false)}>×</GlowButton>
                  </div>
                )}
              </>
            ) : (
              <div className="sw-focus-empty">
                <p className="sw-focus-eyebrow">SKILL WEB</p>
                <p className="sw-focus-hint">Select a node to explore your mastery path.</p>
              </div>
            )}
          </div>

          {/* Center: SVG */}
          <div className="sw-panel-canvas">
            <SkillWebCanvas
              nodes={nodes} edges={edges}
              selectedId={selectedId}
              waveIds={waveIds} wavePhase={wavePhase}
              unlockedIds={unlockedIds}
              onNodeClick={handleNodeClick}
              onDeselect={handleDeselect}
            />
          </div>

          {/* Right: stats + debug */}
          <div className="sw-panel-stats">
            <div className="sw-big-stat">
              <span className="sw-big-num">{activePaths}</span>
              <span className="sw-big-lbl">ACTIVE PATHS</span>
            </div>
            <div className="sw-big-stat">
              <span className="sw-big-num">{masteryPoints}</span>
              <span className="sw-big-lbl">CONNECTING MEMORIES</span>
            </div>
            <div className="sw-debug-area">
              <button className="sw-debug-btn" onClick={() => setShowDebug(d => !d)}>
                {showDebug ? '× CLOSE' : '⚙ DEBUG'}
              </button>
              {showDebug && (
                <div className="sw-debug-panel">
                  <p className="sw-debug-title">LOCKED SKILLS</p>
                  {lockedSkills.length === 0
                    ? <p className="sw-debug-all-clear">All unlocked</p>
                    : lockedSkills.map(s => (
                      <button key={s.id} className="sw-debug-unlock"
                        onClick={() => setUnlockedIds(prev => new Set([...prev, s.id]))}>
                        🔓 {s.name}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
