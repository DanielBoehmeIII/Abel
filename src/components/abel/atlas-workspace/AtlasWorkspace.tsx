import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { KeyboardEvent as RKE, CSSProperties } from 'react';
import type { AtlasTreeNode } from '../AtlasTree';
import {
  buildWorkspaceLayout, buildHierarchyLayout, buildRadialLayout,
} from './atlasLayout';
import type { WorkspaceNode, WorkspaceEdge, DisplayMode } from './atlasLayout';
import './AtlasWorkspace.css';

// ── Persistence ───────────────────────────────────────────────────────────────
const VIEW_KEY  = 'abel-atlas-view-v2';
const USER_KEY  = 'abel-atlas-username';
const NODES_KEY = 'abel-atlas-extra-nodes-v1';

function loadView()   { try { const r = localStorage.getItem(VIEW_KEY);  return r ? JSON.parse(r)  : null; } catch { return null; } }
function saveView(pan: {x:number;y:number}, scale: number) { try { localStorage.setItem(VIEW_KEY, JSON.stringify({pan, scale})); } catch { /* storage unavailable */ } }
function loadUser()   { try { return localStorage.getItem(USER_KEY) ?? ''; } catch { return ''; } }
function saveUser(n: string) { try { localStorage.setItem(USER_KEY, n); } catch { /* storage unavailable */ } }
function loadExtraNodes(): ExtraNode[] { try { const r = localStorage.getItem(NODES_KEY); return r ? JSON.parse(r) : []; } catch { return []; } }
function saveExtraNodes(ns: ExtraNode[]) { try { localStorage.setItem(NODES_KEY, JSON.stringify(ns)); } catch { /* storage unavailable */ } }

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExtraNode { id: string; label: string; subtitle: string; parentId: string; x: number; y: number; }

// ── RNG ───────────────────────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ── Reduced motion ────────────────────────────────────────────────────────────
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Selection helpers ─────────────────────────────────────────────────────────
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
interface Star { cx: number; cy: number; r: number; op: number; dur: number; del: number; kind: 'bg'|'root'|'spine'|'side'; }

function buildStars(rootX: number, rootY: number, W: number, H: number): Star[] {
  const rng = mkRng(54321); const stars: Star[] = [];
  for (let i = 0; i < 260; i++) stars.push({ cx: rng()*W, cy: rng()*H, r: rng()*1.0+0.2, op: rng()*0.20+0.03, dur: 4+rng()*6, del: rng()*9, kind: 'bg' });
  for (let i = 0; i < 140; i++) { const a=rng()*Math.PI*2, d=i<80?rng()*95+10:rng()*180+80; stars.push({ cx: rootX+Math.cos(a)*d, cy: rootY+Math.sin(a)*d, r: rng()*(i<80?2.0:1.4)+0.3, op: rng()*(i<80?0.65:0.38)+(i<80?0.20:0.10), dur: 1.0+rng()*2.5, del: rng()*4, kind: 'root' }); }
  for (let i = 0; i < 130; i++) { const t=rng(), cy=rootY+(t<0.3?t*300:300+(t-0.3)*900), dx=(rng()-0.5)*(cy>rootY+450?280:180); stars.push({ cx: rootX+dx, cy: Math.min(cy,H), r: rng()*1.5+0.25, op: rng()*(cy>rootY+400?0.40:0.28)+0.06, dur: 2.0+rng()*4, del: rng()*7, kind: 'spine' }); }
  for (let i = 0; i < 110; i++) stars.push({ cx: rng()*W, cy: rootY+rng()*720, r: rng()*1.2+0.18, op: rng()*0.22+0.04, dur: 3+rng()*5, del: rng()*8, kind: 'side' });
  return stars;
}

function buildSpecks(node: WorkspaceNode, count: number) {
  const rng = mkRng(node.id.charCodeAt(0)*997+(node.id.charCodeAt(1)||0)*31);
  const isLocked = node.status === 'locked';
  return Array.from({ length: count }, () => {
    const angle = rng()*Math.PI*2, dist = rng()*(node.r-5)*0.86;
    return { cx: node.x+Math.cos(angle)*dist, cy: node.y+Math.sin(angle)*dist, sr: rng()*1.3+0.3, op: rng()*(isLocked?0.16:0.50)+(isLocked?0.03:0.10), dur: 1.6+rng()*3.5, del: rng()*5 };
  });
}

function buildRimDust(node: WorkspaceNode, count: number) {
  const rng = mkRng(node.id.charCodeAt(0)*113+7);
  return Array.from({ length: count }, () => {
    const angle = rng()*Math.PI*2, dist = node.r-3-rng()*4;
    return { cx: node.x+Math.cos(angle)*dist, cy: node.y+Math.sin(angle)*dist, sr: rng()*0.7+0.2, op: rng()*0.28+0.04, dur: 2+rng()*4, del: rng()*6 };
  });
}

function buildFilaments(edges: WorkspaceEdge[]) {
  const rng = mkRng(9999);
  const list: {x1:number;y1:number;x2:number;y2:number;x3:number;y3:number;op:number;dur:number;del:number;isMicro?:boolean}[] = [];
  edges.forEach(edge => {
    const count = edge.isSpine ? 28 : 16;
    const fdx = edge.to.x - edge.from.x;
    const fdy = edge.to.y - edge.from.y;
    const flen = Math.sqrt(fdx*fdx + fdy*fdy) || 1;
    const px = -fdy/flen, py = fdx/flen; // perpendicular unit vector
    for (let i=0; i<count; i++) {
      const t = (i + rng()*0.8 + 0.1) / count;
      const mx = edge.from.x + fdx*t, my = edge.from.y + fdy*t;
      const side = rng()>0.5 ? 1 : -1;
      const r1 = rng()*10+6, r2 = r1+rng()*42+14, r3 = r2+rng()*28+8;
      const sp = (rng()-0.5)*0.55;
      const x1=mx+px*side*r1, y1=my+py*side*r1;
      const x2=mx+px*side*r2+(rng()-0.5)*10, y2=my+py*side*r2+sp*10;
      const x3=mx+px*side*r3+(rng()-0.5)*14, y3=my+py*side*r3+sp*16;
      const op = edge.isSpine ? rng()*0.30+0.12 : rng()*0.18+0.06;
      list.push({ x1,y1,x2,y2,x3,y3, op, dur:2.2+rng()*4, del:rng()*6 });
      if (i%2===0) {
        const ba = Math.atan2(py*side, px*side)+(rng()-0.5)*0.8;
        list.push({ x1:x2,y1:y2, x2:x2+Math.cos(ba)*(rng()*22+6),y2:y2+Math.sin(ba)*(rng()*22+6), x3:x2+(rng()-0.5)*10,y3:y2+rng()*10, op:op*0.5, dur:2.5+rng()*3.5, del:rng()*6, isMicro:true });
      }
    }
  });
  return list;
}

function buildJunctionStars(edges: WorkspaceEdge[]) {
  const rng = mkRng(7777);
  const pts: {cx:number;cy:number;r:number;op:number;dur:number;del:number}[] = [];
  edges.forEach(e => {
    ([0.28,0.52,0.76] as const).forEach(frac => pts.push({ cx:e.from.x+(e.to.x-e.from.x)*frac+(rng()-0.5)*16, cy:e.from.y+(e.to.y-e.from.y)*frac+(rng()-0.5)*16, r:e.isSpine?rng()*1.5+0.8:rng()*1.3+0.6, op:rng()*0.55+0.22, dur:1.5+rng()*2.5, del:rng()*4 }));
    if (e.isSpine) ([0.38,0.62] as const).forEach(frac => pts.push({ cx:e.from.x+(e.to.x-e.from.x)*frac+(rng()-0.5)*8, cy:e.from.y+(e.to.y-e.from.y)*frac+(rng()-0.5)*8, r:rng()*1.2+0.5, op:rng()*0.45+0.18, dur:1.8+rng()*2, del:rng()*5 }));
  });
  return pts;
}

function cubicDown(from: {x:number;y:number}, to: {x:number;y:number}): string {
  const dy = to.y - from.y;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y+dy*0.42}, ${to.x} ${to.y-dy*0.42}, ${to.x} ${to.y}`;
}


function buildRootHairs(from: {x:number;y:number}, to: {x:number;y:number}, count: number) {
  const hairs: {x1:number;y1:number;x2:number;y2:number}[] = [];
  for (let i=0; i<count; i++) {
    const t=(i+1)/(count+1), mx=from.x+(to.x-from.x)*t, my=from.y+(to.y-from.y)*t;
    const side=i%2===0?1:-1, angle=((i*43)%80)-40, rad=angle*Math.PI/180, len=18+(i%5)*8;
    hairs.push({ x1:mx,y1:my, x2:mx+Math.cos(rad+Math.PI/2)*side*(10+(i%4)*7), y2:my+Math.sin(rad+Math.PI/2)*side*(10+(i%4)*7)+len*0.35 });
  }
  return hairs;
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface AtlasWorkspaceProps {
  root: AtlasTreeNode;
  selectedId?: string;
  onNodeClick?: (node: AtlasTreeNode) => void;
  onAddNode?:   (label: string, subtitle: string, parentId: string) => void;
  className?: string;
}

// SVG filter IDs — static single-instance
const F = { bloom: 'aw-bloom', wireGlow: 'aw-wg', ptGlow: 'aw-pg', rimGlow: 'aw-rg', hlGlow: 'aw-hl' } as const;

// ── Component ─────────────────────────────────────────────────────────────────
export default function AtlasWorkspace({ root, selectedId, onNodeClick, onAddNode }: AtlasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);

  const [size,       setSize]       = useState({ w: 0, h: 0 });
  const [isDragging, setDrag]       = useState(false);
  const [dragStart,  setDS]         = useState({ x: 0, y: 0 });
  const [hoveredId,  setHovered]    = useState<string | null>(null);
  const [displayMode, setMode]      = useState<DisplayMode>('manual');

  // Manual-mode node dragging
  const [nodeDragId,  setNodeDragId]  = useState<string | null>(null);
  const [nodeDragOff, setNodeDragOff] = useState({ ox: 0, oy: 0 });
  const [nodeOverrides, setOverrides] = useState<Map<string, {x:number;y:number}>>(new Map());

  // Extra nodes (user-added)
  const [extraNodes, setExtraNodes] = useState<ExtraNode[]>(() => loadExtraNodes());

  // Add-node modal
  const [addOpen,  setAddOpen]  = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addSub,   setAddSub]   = useState('');
  const [addParent,setAddParent]= useState('core');

  // Login / username
  const [userName,    setUserName]    = useState(() => loadUser());
  const [loginOpen,   setLoginOpen]   = useState(() => !loadUser());
  const [loginInput,  setLoginInput]  = useState('');

  const savedView = useMemo(() => loadView(), []);
  const [pan,   setPan]   = useState(savedView?.pan   ?? { x: 0, y: 0 });
  const [scale, setScale] = useState(savedView?.scale ?? 0.72);

  // ── Layout ──────────────────────────────────────────────────────────────────
  const baseLayout = useMemo(() => {
    switch (displayMode) {
      case 'hierarchy': return buildHierarchyLayout(root);
      case 'radial':    return buildRadialLayout(root);
      default:          return buildWorkspaceLayout(root);
    }
  }, [root, displayMode]);

  // Apply node position overrides (manual mode dragging)
  const { nodes, edges, rootNode, canvasW, canvasH } = useMemo(() => {
    if (displayMode !== 'manual' || nodeOverrides.size === 0) return baseLayout;
    const overriddenNodes = baseLayout.nodes.map(n => {
      const ov = nodeOverrides.get(n.id);
      return ov ? { ...n, x: ov.x, y: ov.y } : n;
    });
    const nodeMap = new Map(overriddenNodes.map(n => [n.id, n]));
    const overriddenEdges = baseLayout.edges.map(e => ({
      ...e,
      from: nodeMap.get(e.from.id) ?? e.from,
      to:   nodeMap.get(e.to.id)   ?? e.to,
    }));
    return { ...baseLayout, nodes: overriddenNodes, edges: overriddenEdges, rootNode: nodeMap.get('core') ?? baseLayout.rootNode };
  }, [baseLayout, displayMode, nodeOverrides]);

  // ── Reset view when mode changes ─────────────────────────────────────────────
  useEffect(() => {
    const defaultScale = displayMode === 'radial' ? 0.58 : 0.72;
    const raf = requestAnimationFrame(() => {
      setPan({ x: 0, y: 0 });
      setScale(defaultScale);
    });
    saveView({ x: 0, y: 0 }, defaultScale);
    return () => cancelAnimationFrame(raf);
  }, [displayMode]);

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // ── SVG coordinate helpers ─────────────────────────────────────────────────
  // Account for scale so root stays centered as scale changes
  const treeOffX = size.w > 0 ? size.w / 2 - rootNode.x * scale : 0;
  const treeOffY = displayMode === 'radial' && size.h > 0
    ? size.h / 2 - rootNode.y * scale
    : 30;

  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    return {
      x: (clientX - (treeOffX + pan.x)) / scale,
      y: (clientY - (treeOffY + pan.y)) / scale,
    };
  }, [treeOffX, treeOffY, pan, scale]);

  // ── Canvas pan ───────────────────────────────────────────────────────────────
  const onMD = useCallback((e: React.MouseEvent) => {
    if (nodeDragId) return;
    if (e.button === 0 || e.button === 1) { setDrag(true); setDS({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }
  }, [pan, nodeDragId]);

  const onMM = useCallback((e: React.MouseEvent) => {
    if (nodeDragId) {
      const svgPt = screenToSvg(e.clientX, e.clientY);
      setOverrides(prev => {
        const next = new Map(prev);
        next.set(nodeDragId, { x: svgPt.x - nodeDragOff.ox, y: svgPt.y - nodeDragOff.oy });
        return next;
      });
      return;
    }
    if (isDragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart, nodeDragId, nodeDragOff, screenToSvg]);

  const onMU = useCallback(() => {
    if (isDragging) saveView(pan, scale);
    setDrag(false);
    setNodeDragId(null);
  }, [isDragging, pan, scale]);

  // ── Node drag (manual mode) ──────────────────────────────────────────────────
  function handleNodePointerDown(e: React.MouseEvent, node: WorkspaceNode) {
    if (displayMode !== 'manual') return;
    e.stopPropagation();
    const svgPt = screenToSvg(e.clientX, e.clientY);
    setNodeDragOff({ ox: svgPt.x - node.x, oy: svgPt.y - node.y });
    setNodeDragId(node.id);
  }

  // ── Wheel zoom ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onW = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s: number) => { const n = Math.min(Math.max(s+(e.deltaY<0?0.06:-0.06),0.25),3.0); saveView(pan,n); return n; });
    };
    el.addEventListener('wheel', onW, { passive: false });
    return () => el.removeEventListener('wheel', onW);
  }, [pan]);

  function zoom(dir: 1 | -1) {
    setScale((s: number) => { const n = Math.min(Math.max(s+dir*0.14,0.25),3.0); saveView(pan,n); return n; });
  }

  // ── Selection highlighting ───────────────────────────────────────────────────
  const relatedIds   = useMemo(() => selectedId ? getRelated(root, selectedId) : null, [root, selectedId]);
  const connectedSet = useMemo(() => {
    if (!hoveredId) return null;
    const s = new Set<string>([hoveredId]);
    edges.forEach(e => { if (e.from.id===hoveredId) s.add(e.to.id); if (e.to.id===hoveredId) s.add(e.from.id); });
    return s;
  }, [hoveredId, edges]);

  function activeSet(): Set<string> | null { return connectedSet ?? relatedIds; }

  function nodeOp(n: WorkspaceNode): number {
    const locked = n.status==='locked' ? 0.38 : 1;
    const act = activeSet();
    if (act && !act.has(n.id)) return 0.10 * locked;
    return locked;
  }
  function edgeOp(e: WorkspaceEdge): number {
    const act = activeSet();
    if (act && !(act.has(e.from.id) && act.has(e.to.id))) return 0.04;
    return 1;
  }
  function isEdgeActive(e: WorkspaceEdge): boolean {
    const act = activeSet();
    if (!act) return false;
    return act.has(e.from.id) && act.has(e.to.id);
  }

  // ── Add node ─────────────────────────────────────────────────────────────────
  function submitAddNode() {
    if (!addLabel.trim()) return;
    const parentNode = nodes.find(n => n.id === addParent);
    if (!parentNode) return;
    const rng = mkRng(Date.now() % 999999);
    const newNode: ExtraNode = {
      id: `extra_${Date.now()}`,
      label: addLabel.trim(),
      subtitle: addSub.trim(),
      parentId: addParent,
      x: parentNode.x + (rng()-0.5)*180,
      y: parentNode.y + 140 + rng()*40,
    };
    const updated = [...extraNodes, newNode];
    setExtraNodes(updated);
    saveExtraNodes(updated);
    onAddNode?.(addLabel.trim(), addSub.trim(), addParent);
    setAddLabel(''); setAddSub(''); setAddParent('core'); setAddOpen(false);
  }

  // ── Username submit ────────────────────────────────────────────────────────
  function submitLogin() {
    const name = loginInput.trim() || 'EXPLORER';
    setUserName(name); saveUser(name); setLoginOpen(false);
  }

  // ── View reset ────────────────────────────────────────────────────────────
  function resetView() { setPan({x:0,y:0}); setScale(0.72); saveView({x:0,y:0},0.72); }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  function handleKeyDown(node: AtlasTreeNode) {
    return (e: RKE<SVGGElement>) => {
      if ((e.key==='Enter'||e.key===' ') && node.status!=='locked') { e.preventDefault(); onNodeClick?.(node); }
    };
  }

  // ── Static geometry ───────────────────────────────────────────────────────
  const stars         = useMemo(() => buildStars(rootNode.x, rootNode.y, canvasW, canvasH), [rootNode.x, rootNode.y, canvasW, canvasH]);
  const filaments     = useMemo(() => buildFilaments(edges), [edges]);
  const junctionStars = useMemo(() => buildJunctionStars(edges), [edges]);
  const nodeVisuals   = useMemo(() => nodes.map(n => ({
    specks:  buildSpecks(n, n.depth===0?26:n.status==='locked'?7:14),
    rimDust: buildRimDust(n, n.depth===0?16:9),
  })), [nodes]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="aw-container"
      onMouseDown={onMD}
      onMouseMove={onMM}
      onMouseUp={onMU}
      onMouseLeave={onMU}
      style={{ cursor: nodeDragId ? 'grabbing' : isDragging ? 'grabbing' : displayMode==='manual' ? 'grab' : 'default' }}
    >
      {/* Parallax background grid */}
      <div className="aw-grid" style={{ transform: `translate(${pan.x*0.06}px,${pan.y*0.06}px)` }} />

      {/* ── Mode switcher ──────────────────────────────────────────────────── */}
      <div className="aw-mode-bar" onMouseDown={e => e.stopPropagation()}>
        {(['manual','hierarchy','radial'] as const).map(m => (
          <button
            key={m}
            className={`aw-mode-btn ${displayMode===m ? 'aw-mode-btn--active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Top right: username + reset ────────────────────────────────────── */}
      <div className="aw-top-right" onMouseDown={e => e.stopPropagation()}>
        <button className="aw-reset-btn" onClick={resetView}>↺ RESET</button>
        <button className="aw-username-btn" onClick={() => { setLoginInput(userName); setLoginOpen(true); }}>
          {userName || 'SIGN IN'}
        </button>
      </div>

      {/* ── Zoom buttons ───────────────────────────────────────────────────── */}
      <div className="aw-zoom-btns" onMouseDown={e => e.stopPropagation()}>
        <button className="aw-zoom-btn" onClick={() => zoom(1)} aria-label="Zoom in">+</button>
        <button className="aw-zoom-btn" onClick={() => zoom(-1)} aria-label="Zoom out">−</button>
      </div>

      {/* ── SVG canvas ─────────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        width={size.w||'100%'}
        height={size.h||'100%'}
        style={{ position:'absolute', inset:0, display:'block' }}
      >
        <defs>
          <filter id={F.bloom}   x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="26" result="b1" />
            <feGaussianBlur stdDeviation="9"  result="b2" in="SourceGraphic" />
            <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={F.wireGlow} x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="7.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={F.ptGlow}  x="-250%" y="-250%" width="600%" height="600%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={F.rimGlow} x="-80%"  y="-80%"  width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Highlight glow — warmer, wider bloom for active path */}
          <filter id={F.hlGlow}  x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="18" result="b1" />
            <feGaussianBlur stdDeviation="6"  result="b2" in="SourceGraphic" />
            <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Pre-warm SVG filters to prevent first-paint rasterization flicker */}
        <g opacity="0" aria-hidden="true" style={{ willChange: 'filter' }}>
          <path d="M0,0" filter={`url(#${F.wireGlow})`} />
          <path d="M0,0" filter={`url(#${F.bloom})`} />
          <path d="M0,0" filter={`url(#${F.ptGlow})`} />
          <path d="M0,0" filter={`url(#${F.rimGlow})`} />
          <path d="M0,0" filter={`url(#${F.hlGlow})`} />
        </g>

        <g transform={`translate(${treeOffX+pan.x},${treeOffY+pan.y}) scale(${scale})`}>

          {/* ── Starfield ─────────────────────────────────────────────────── */}
          {stars.map((s,i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.op}>
              {!prefersReducedMotion && <animate attributeName="opacity" values={`${s.op};${s.op*0.2};${s.op}`} dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />}
              {!prefersReducedMotion && s.kind!=='bg' && s.kind!=='side' && <animate attributeName="r" values={`${s.r};${s.r*1.5};${s.r}`} dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />}
            </circle>
          ))}


          {/* ── Decorative filaments ─────────────────────────────────────── */}
          {!prefersReducedMotion && filaments.map((f,i) => (
            <g key={`f-${i}`}>
              <path d={`M ${f.x1} ${f.y1} Q ${f.x2} ${f.y2} ${f.x3} ${f.y3}`} fill="none" stroke={`rgba(255,255,255,${f.op})`} strokeWidth={f.isMicro?'0.35':'0.55'} strokeLinecap="round">
                <animate attributeName="opacity" values="1;0.15;1" dur={`${f.dur}s`} begin={`${f.del}s`} repeatCount="indefinite" />
              </path>
              {!f.isMicro && <circle cx={f.x3} cy={f.y3} r="1.0" fill="rgba(255,255,255,0.65)" filter={`url(#${F.ptGlow})`}><animate attributeName="opacity" values="1;0.053;1" dur={`${f.dur}s`} begin={`${f.del}s`} repeatCount="indefinite" /></circle>}
            </g>
          ))}

          {/* ── Wires ────────────────────────────────────────────────────── */}
          {edges.map((e, idx) => {
            const path   = cubicDown({x:e.from.x,y:e.from.y},{x:e.to.x,y:e.to.y});
            const hairs  = !prefersReducedMotion ? buildRootHairs({x:e.from.x,y:e.from.y},{x:e.to.x,y:e.to.y}, e.isSpine?22:13) : [];
            const op     = edgeOp(e);
            const active = isEdgeActive(e);
            const pDur   = `${1.4+idx*0.2}s`;
            return (
              <g key={e.id} opacity={op} style={{ transition:'opacity 0.35s ease' }}>
                {/* Root hairs */}
                {hairs.map((h,i) => (
                  <line key={`rh-${i}`} x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2}
                    stroke={e.isSpine?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.14)'}
                    strokeWidth={e.isSpine?'0.55':'0.45'} strokeLinecap="round"
                    opacity={0.06}>
                    <animate attributeName="opacity" values="0.06;0.32;0.06" dur={`${2.2+i*0.35}s`} begin={`${i*0.28}s`} repeatCount="indefinite" />
                  </line>
                ))}
                {/* Spine bloom */}
                {e.isSpine && <>
                  <path d={path} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="56" strokeLinecap="round" filter={`url(#${F.bloom})`} />
                  <path d={path} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="22" strokeLinecap="round" filter={`url(#${F.bloom})`} />
                </>}
                {/* Active/hover path — extra highlight bloom */}
                {active && (<>
                  <path d={path} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="22" strokeLinecap="round" filter={`url(#${F.hlGlow})`} />
                  <path d={path} fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="8"  strokeLinecap="round" filter={`url(#${F.wireGlow})`} />
                </>)}
                {/* Outer mist */}
                <path d={path} fill="none" stroke={active?'rgba(255,255,255,0.40)':'rgba(255,255,255,0.18)'} strokeWidth={e.isSpine?13:9} strokeLinecap="round" filter={`url(#${F.wireGlow})`} />
                {/* Inner glow */}
                <path d={path} fill="none" stroke={active?'rgba(255,255,255,0.65)':e.isSpine?'rgba(255,255,255,0.32)':'rgba(255,255,255,0.22)'} strokeWidth={active?4.5:e.isSpine?3.0:2.2} strokeLinecap="round" filter={`url(#${F.wireGlow})`} />
                {/* Core filament */}
                <path d={path} fill="none" stroke={active?'rgba(255,255,255,1.0)':e.isSpine?'rgba(255,255,255,0.80)':'rgba(255,255,255,0.68)'} strokeWidth={active?2.5:e.isSpine?1.4:1.05} strokeLinecap="round" />
                {/* Flow particle */}
                {!prefersReducedMotion && (
                  <circle r={e.isSpine?2.0:1.3} fill="rgba(255,255,255,0.85)" filter={`url(#${F.ptGlow})`}>
                    <animateMotion dur={pDur} repeatCount="indefinite" path={path} />
                    <animate attributeName="opacity" values="0;0.9;0" dur={pDur} repeatCount="indefinite" />
                  </circle>
                )}
                {e.isSpine && !prefersReducedMotion && (
                  <circle r="1.4" fill="rgba(255,255,255,0.55)" filter={`url(#${F.ptGlow})`}>
                    <animateMotion dur={`${parseFloat(pDur)*1.7}s`} repeatCount="indefinite" path={path} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
                    <animate attributeName="opacity" values="0;0.6;0" dur={`${parseFloat(pDur)*1.7}s`} repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

          {/* ── Junction stars ────────────────────────────────────────────── */}
          {!prefersReducedMotion && junctionStars.map((p,i) => (
            <circle key={`js-${i}`} cx={p.cx} cy={p.cy} r={p.r} fill="white" filter={`url(#${F.ptGlow})`}>
              <animate attributeName="opacity" values="1;0.15;1" dur={`${p.dur}s`} begin={`${p.del}s`} repeatCount="indefinite" />
              <animate attributeName="r"       values={`${p.r};${p.r*1.6};${p.r}`} dur={`${p.dur}s`} begin={`${p.del}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* ── Spine cap ────────────────────────────────────────────────── */}
          {!prefersReducedMotion && (() => {
            const cx=rootNode.x, cy=rootNode.y-80;
            return (
              <g>
                {/* Wide halo */}
                <circle cx={cx} cy={cy} r="42" fill="rgba(255,255,255,0.10)" filter={`url(#${F.bloom})`}>
                  <animate attributeName="r"       values="28;48;28"       dur="4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.06;0.18;0.06" dur="4s" repeatCount="indefinite" />
                </circle>
                {/* Connector thread */}
                <line x1={cx} y1={cy+14} x2={cx} y2={rootNode.y-rootNode.r} stroke="rgba(255,255,255,0.45)" strokeWidth="0.9" strokeLinecap="round" />
                {/* Bright center point */}
                <circle cx={cx} cy={cy} r="4.0" fill="white" filter={`url(#${F.ptGlow})`}>
                  <animate attributeName="opacity" values="0.65;1;0.65"  dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="r"       values="2.8;5.2;2.8"  dur="2.8s" repeatCount="indefinite" />
                </circle>
                {/* 4-ray cross flares — longer for the reference star look */}
                {[0,90,45,135].map((deg,fi) => {
                  const rad=deg*Math.PI/180, len=fi<2?18:11;
                  return <line key={fi} x1={cx+Math.cos(rad)*4.5} y1={cy+Math.sin(rad)*4.5} x2={cx+Math.cos(rad)*len} y2={cy+Math.sin(rad)*len} stroke="rgba(255,255,255,0.70)" strokeWidth="0.8" strokeLinecap="round"><animate attributeName="opacity" values="0.25;0.92;0.25" dur="2.8s" begin={`${fi*0.3}s`} repeatCount="indefinite" /></line>;
                })}
              </g>
            );
          })()}

          {/* ── Nodes ────────────────────────────────────────────────────── */}
          {nodes.map((node,i) => {
            const isRoot     = node.depth===0;
            const isLocked   = node.status==='locked';
            const isSelected = selectedId===node.id;
            const isHovered  = hoveredId===node.id;
            const isActive   = isHovered || isSelected;
            const { specks, rimDust } = nodeVisuals[i];
            const rimOp  = isLocked?0.22:isSelected?0.98:isHovered?0.92:0.72;
            const opacity = nodeOp(node);
            const canDrag = displayMode==='manual' && !isLocked;
            const act = activeSet();
            const isPathHighlighted = !isLocked && (act ? act.has(node.id) : false);

            return (
              <g
                key={node.id}
                className="aw-node"
                style={{ cursor: isLocked?'default':canDrag?'move':'pointer', opacity, transition:'opacity 0.4s ease', animationDelay:'0.04s' } as CSSProperties}
                onClick={() => { if (!isLocked && !nodeDragId) onNodeClick?.(node.rawNode); }}
                onMouseDown={(e) => handleNodePointerDown(e, node)}
                onKeyDown={handleKeyDown(node.rawNode)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                tabIndex={onNodeClick && !isLocked ? 0 : undefined}
                role={onNodeClick && !isLocked ? 'button' : undefined}
                aria-label={`${node.label}${node.status?`, ${node.status}`:''}`}
                aria-pressed={isSelected?true:undefined}
              >
                {/* Extra active shadow for highlighted nodes */}
                {isActive && !isLocked && (
                  <circle cx={node.x} cy={node.y} r={node.r+18}
                    fill="rgba(255,255,255,0.06)" filter={`url(#${F.hlGlow})`} />
                )}
                {/* Soft dissipated glow — path-highlighted nodes only, barely noticeable */}
                {isPathHighlighted && (
                  <circle cx={node.x} cy={node.y} r={node.r + 20}
                    fill="rgba(255,255,255,0.022)" filter={`url(#${F.bloom})`} opacity={0.55} />
                )}
                {/* Tight focused thrum ring — path-highlighted nodes only */}
                {isPathHighlighted && (
                  <circle cx={node.x} cy={node.y} r={node.r + 3} fill="none"
                    stroke="rgba(255,255,255,0.14)" strokeWidth={isRoot?4:2.5} filter={`url(#${F.rimGlow})`}
                    opacity={0.4}>
                    {!prefersReducedMotion && <>
                      <animate attributeName="opacity" values="0.20;0.48;0.20" dur={isRoot?'3.5s':'5s'} repeatCount="indefinite" />
                      <animate attributeName="r" values={`${node.r+2};${node.r+4};${node.r+2}`} dur={isRoot?'3.5s':'5s'} repeatCount="indefinite" />
                    </>}
                  </circle>
                )}
                {/* Main disc — semi-transparent fill, slightly lighter than bg */}
                <circle cx={node.x} cy={node.y} r={node.r}
                  fill={isLocked?'rgba(18,17,18,0.85)':'rgba(24,23,24,0.70)'}
                  stroke={`rgba(255,255,255,${rimOp})`}
                  strokeWidth={isRoot?2.0:isLocked?0.7:isActive?1.8:1.4}
                  style={{ transition:'stroke-opacity 0.25s ease, stroke-width 0.25s ease' }}
                />
                {/* Inset depth ring */}
                <circle cx={node.x} cy={node.y} r={node.r-4} fill="none" stroke={isLocked?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.07)'} strokeWidth="0.6" />
                {/* Rim dust */}
                {!isLocked && !prefersReducedMotion && rimDust.map((s,j) => (
                  <circle key={`rd-${j}`} cx={s.cx} cy={s.cy} r={s.sr} fill="white" opacity={s.op}>
                    <animate attributeName="opacity" values={`${s.op*0.15};${s.op};${s.op*0.15}`} dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />
                  </circle>
                ))}
                {/* Constellation specks */}
                {specks.map((s,j) => (
                  <circle key={`sp-${j}`} cx={s.cx} cy={s.cy} r={s.sr} fill="rgba(255,255,255,0.9)" opacity={s.op}>
                    {!prefersReducedMotion && <animate attributeName="opacity" values={`${s.op*0.15};${s.op};${s.op*0.15}`} dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />}
                  </circle>
                ))}
                {/* Top anchor light */}
                <circle cx={node.x} cy={node.y-node.r} r={isRoot?2.8:isLocked?1.2:2.2} fill="white" filter={`url(#${F.ptGlow})`}>
                  {!prefersReducedMotion && <animate attributeName="opacity" values={isRoot?'0.6;1;0.6':isLocked?'0.08;0.22;0.08':'0.35;0.85;0.35'} dur={isRoot?'2.5s':'3.5s'} repeatCount="indefinite" />}
                </circle>
                {/* Bottom anchor light */}
                <circle cx={node.x} cy={node.y+node.r} r={isRoot?2.2:isLocked?1.0:1.8} fill="white" filter={`url(#${F.ptGlow})`}>
                  {!prefersReducedMotion && <animate attributeName="opacity" values={isLocked?'0.05;0.18;0.05':'0.22;0.65;0.22'} dur="4s" repeatCount="indefinite" />}
                </circle>
                {/* Root star flares */}
                {isRoot && [0,90,180,270].map((deg,fi) => {
                  const rad=deg*Math.PI/180;
                  return (
                    <g key={`rf-${fi}`}>
                      <line x1={node.x+Math.cos(rad)*node.r} y1={node.y+Math.sin(rad)*node.r} x2={node.x+Math.cos(rad)*(node.r+12)} y2={node.y+Math.sin(rad)*(node.r+12)} stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" strokeLinecap="round">
                        {!prefersReducedMotion && <animate attributeName="opacity" values="0.15;0.55;0.15" dur="3.5s" begin={`${fi*0.6}s`} repeatCount="indefinite" />}
                      </line>
                      <circle cx={node.x+Math.cos(rad)*(node.r+1)} cy={node.y+Math.sin(rad)*(node.r+1)} r="1.8" fill="white" filter={`url(#${F.ptGlow})`}>
                        {!prefersReducedMotion && <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.5s" begin={`${fi*0.6}s`} repeatCount="indefinite" />}
                      </circle>
                    </g>
                  );
                })}
                {/* Label shadow */}
                <text x={node.x} y={node.y-(node.subtitle?(isRoot?10:7):0)} textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(0,0,0,0.65)" fontSize={isRoot?15:node.depth<=2?12:10}
                  fontFamily="var(--font-sans)" fontWeight={isRoot?600:500} dx="0.5" dy="0.5"
                  style={{ pointerEvents:'none' }}>{node.label}</text>
                {/* Label */}
                <text x={node.x} y={node.y-(node.subtitle?(isRoot?10:7):0)} textAnchor="middle" dominantBaseline="middle"
                  fill={`rgba(255,255,255,${isLocked?0.35:isActive?1:0.93})`}
                  fontSize={isRoot?15:node.depth<=2?12:10}
                  fontFamily="var(--font-sans)" fontWeight={isRoot?600:500}
                  style={{ pointerEvents:'none', transition:'fill 0.25s ease' }}>{node.label}</text>
                {/* Subtitle */}
                {node.subtitle && (
                  <text x={node.x} y={node.y+(isRoot?11:9)} textAnchor="middle" dominantBaseline="middle"
                    fill={`rgba(200,210,230,${isLocked?0.22:0.60})`}
                    fontSize={isRoot?10:8.5} fontFamily="var(--font-mono)"
                    fontWeight={300} letterSpacing="0.09em"
                    style={{ pointerEvents:'none' }}>{node.subtitle}</text>
                )}
                {/* Selected dashed ring */}
                {isSelected && (
                  <circle cx={node.x} cy={node.y} r={node.r+14}
                    fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.7" strokeDasharray="3 6">
                    {!prefersReducedMotion && (
                      <animateTransform attributeName="transform" type="rotate"
                        from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`}
                        dur="18s" repeatCount="indefinite" />
                    )}
                  </circle>
                )}
                {/* Drag handle indicator in manual mode */}
                {canDrag && isHovered && (
                  <circle cx={node.x} cy={node.y} r={node.r+2}
                    fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeDasharray="4 5" />
                )}
              </g>
            );
          })}

          {/* ── Extra nodes (user-added) ──────────────────────────────────── */}
          {extraNodes.map(en => {
            const px = nodes.find(n => n.id === en.parentId);
            const ex = en.x, ey = en.y;
            return (
              <g key={en.id}>
                {px && <line x1={px.x} y1={px.y} x2={ex} y2={ey} stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" strokeLinecap="round" strokeDasharray="3 5" />}
                <circle cx={ex} cy={ey} r="22" fill="rgba(14,17,26,0.88)" stroke="rgba(255,255,255,0.40)" strokeWidth="0.9" filter={`url(#${F.rimGlow})`} />
                <text x={ex} y={ey-(en.subtitle?6:0)} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.90)" fontSize="10" fontFamily="var(--font-sans)" fontWeight={500} style={{ pointerEvents:'none' }}>{en.label}</text>
                {en.subtitle && <text x={ex} y={ey+8} textAnchor="middle" dominantBaseline="middle" fill="rgba(200,210,230,0.55)" fontSize="7.5" fontFamily="var(--font-mono)" style={{ pointerEvents:'none' }}>{en.subtitle}</text>}
              </g>
            );
          })}

        </g>
      </svg>

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      <div className="aw-bottom-bar" onMouseDown={e => e.stopPropagation()}>
        <button className="aw-add-btn" onClick={() => setAddOpen(true)}>
          <span className="aw-add-btn-icon">+</span> ADD NODE
        </button>
        <span className="aw-hint">scroll to zoom · drag to pan{displayMode==='manual' ? ' · drag node to move' : ''}</span>
      </div>

      {/* ── Add Node modal ──────────────────────────────────────────────────── */}
      {addOpen && (
        <div className="aw-modal-backdrop" onMouseDown={e => e.stopPropagation()} onClick={() => setAddOpen(false)}>
          <div className="aw-modal" onClick={e => e.stopPropagation()}>
            <p className="aw-modal-eyebrow">ADD NODE</p>
            <h2 className="aw-modal-title">New branch</h2>
            <input
              className="aw-modal-input"
              placeholder="Node name"
              value={addLabel}
              onChange={e => setAddLabel(e.target.value)}
              onKeyDown={e => e.key==='Enter' && submitAddNode()}
              autoFocus
            />
            <input
              className="aw-modal-input"
              placeholder="Subtitle (optional)"
              value={addSub}
              onChange={e => setAddSub(e.target.value)}
            />
            <div className="aw-modal-field">
              <label className="aw-modal-label">CONNECT TO</label>
              <select className="aw-modal-select" value={addParent} onChange={e => setAddParent(e.target.value)}>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </div>
            <div className="aw-modal-actions">
              <button className="aw-modal-cancel" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="aw-modal-submit" onClick={submitAddNode} disabled={!addLabel.trim()}>Add Node</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Login / username modal ──────────────────────────────────────────── */}
      {loginOpen && (
        <div className="aw-modal-backdrop" onMouseDown={e => e.stopPropagation()} onClick={() => { if (userName) setLoginOpen(false); }}>
          <div className="aw-modal aw-modal--login" onClick={e => e.stopPropagation()}>
            <p className="aw-modal-eyebrow">ATLAS OF BEING</p>
            <h2 className="aw-modal-title">{userName ? 'Your atlas.' : 'Begin your atlas.'}</h2>
            <p className="aw-modal-subtitle">A living map of what you know, feel, and are becoming.</p>
            <input
              className="aw-modal-input"
              placeholder="Your name"
              value={loginInput}
              onChange={e => setLoginInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && submitLogin()}
              autoFocus
            />
            <div className="aw-modal-actions">
              {userName && <button className="aw-modal-cancel" onClick={() => setLoginOpen(false)}>Cancel</button>}
              <button className="aw-modal-submit" onClick={submitLogin}>
                {userName ? 'Update' : 'Enter Atlas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
