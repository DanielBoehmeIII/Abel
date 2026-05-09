import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, GraphNode, GraphNodeType, GraphEdgeType } from '../types/abel';
import { makeGraphNode } from '../state/abelStore';
import './GraphPage.css';

// ── Constants ────────────────────────────────────────────────────────────────

const CARD_W = 180;
const CARD_H = 108;

const NODE_CFG: Record<GraphNodeType, { color: string; icon: string; label: string }> = {
  goal:              { color: '#7c4dff', icon: '✦', label: 'Goal' },
  concept:           { color: '#7c4dff', icon: '⬡', label: 'Concept' },
  chat:              { color: '#00d4ff', icon: '◉', label: 'AI Conversation' },
  journal:           { color: '#fb923c', icon: '▣', label: 'Journal Entry' },
  quest:             { color: '#f5c518', icon: '◎', label: 'Quest' },
  skill:             { color: '#34d399', icon: '⟨⟩', label: 'Skill' },
  memory:            { color: '#e879a0', icon: '◈', label: 'Memory' },
  insight:           { color: '#f5c518', icon: '◈', label: 'Insight' },
  pdf:               { color: '#fb923c', icon: '▤', label: 'Document' },
  'archetype-trait': { color: '#f472b6', icon: '◆', label: 'Archetype' },
};

const EDGE_COLORS: Record<GraphEdgeType, string> = {
  'relates-to':    '#7c4dff',
  'caused-by':     '#e879a0',
  'supports':      '#00d4ff',
  'contradicts':   '#f87171',
  'unlocks':       '#f5c518',
  'remembered-in': '#34d399',
  'part-of':       '#a0a0c0',
};

const SIDEBAR_TYPES: GraphNodeType[] = ['goal', 'concept', 'chat', 'journal', 'quest', 'skill', 'memory'];
const SIDEBAR_LINKS: GraphEdgeType[] = ['supports', 'relates-to', 'part-of', 'unlocks'];

// ── Bezier helpers ────────────────────────────────────────────────────────────

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function bezierPt(t: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = (x2 - x1) * 0.5;
  const cx1 = x1 + dx, cy1 = y1, cx2 = x2 - dx, cy2 = y2;
  const mt = 1 - t;
  return {
    x: mt*mt*mt*x1 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x2,
    y: mt*mt*mt*y1 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y2,
  };
}

// ── Persistence ───────────────────────────────────────────────────────────────

const VIEW_KEY = 'abel-graph-view-v2';
function loadView() { try { const r = localStorage.getItem(VIEW_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function saveView(pan: {x:number;y:number}, scale: number) { try { localStorage.setItem(VIEW_KEY, JSON.stringify({ pan, scale })); } catch {} }

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props { onNavigate: (page: PageId) => void; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function GraphPage({ onNavigate: _onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { graph } = state;

  const saved = loadView();
  const [selected,  setSelected]  = useState<GraphNode | null>(null);
  const [filter,    setFilter]    = useState<GraphNodeType | 'all'>('all');
  const [search,    setSearch]    = useState('');
  const [addOpen,   setAddOpen]   = useState(false);
  const [newLabel,  setNewLabel]  = useState('');
  const [newType,   setNewType]   = useState<GraphNodeType>('concept');
  const [newDesc,   setNewDesc]   = useState('');
  const [pan,       setPan]       = useState<{x:number;y:number}>(saved?.pan ?? { x: 60, y: 30 });
  const [scale,     setScale]     = useState<number>(saved?.scale ?? 0.80);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const canvasRef  = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredNodes = graph.nodes.filter(n => {
    if (filter !== 'all' && n.type !== filter) return false;
    if (search && !n.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const visibleIds  = new Set(filteredNodes.map(n => n.id));
  const visibleEdges = graph.edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

  // ── Highlight set ─────────────────────────────────────────────────────────

  const focusId = hoveredId ?? selected?.id ?? null;
  const hlSet: Set<string> | null = focusId ? (() => {
    const s = new Set<string>([focusId]);
    visibleEdges.forEach(e => {
      if (e.source === focusId) s.add(e.target);
      if (e.target === focusId) s.add(e.source);
    });
    return s;
  })() : null;

  const nodeOp    = (id: string) => !hlSet || hlSet.has(id) ? 1 : 0.12;
  const edgeActive = (e: {source:string;target:string}) => !!hlSet && hlSet.has(e.source) && hlSet.has(e.target);

  // ── Pan ───────────────────────────────────────────────────────────────────

  const onMD = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('.gn-card')) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMM = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan(p => { const np = { x: p.x + dx, y: p.y + dy }; saveView(np, scale); return np; });
  }, [scale]);

  const onMU = useCallback(() => { isDragging.current = false; }, []);

  // ── Wheel zoom ────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setScale(s => {
        const ns = Math.max(0.3, Math.min(2.5, s - e.deltaY * 0.001));
        setPan(p => { saveView(p, ns); return p; });
        return ns;
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ── Add node ──────────────────────────────────────────────────────────────

  function addNode() {
    if (!newLabel.trim()) return;
    const node = makeGraphNode(newLabel.trim(), newType, newDesc.trim());
    dispatch({ type: 'ADD_GRAPH_NODE', node });
    setAddOpen(false); setNewLabel(''); setNewDesc(''); setNewType('concept');
    setSelected(node);
  }

  // ── Card center for edge connections ──────────────────────────────────────

  const center = (n: GraphNode) => ({ x: n.x + CARD_W / 2, y: n.y + CARD_H / 2 });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="gp-page">

      {/* ── Left sidebar */}
      <aside className="gp-sidebar">
        <div className="gp-sidebar-header">
          <span className="gp-sidebar-icon">◈</span>
          <div>
            <p className="gp-sidebar-eyebrow">KNOWLEDGE GRAPH</p>
            <p className="gp-sidebar-name">Core Graph</p>
          </div>
        </div>

        <div className="gp-sidebar-sect">
          <p className="gp-sect-label">NODE TYPES</p>
          {SIDEBAR_TYPES.map(t => {
            const cfg = NODE_CFG[t];
            const active = filter === t;
            return (
              <button
                key={t}
                className={`gp-type-row ${active ? 'gp-type-row--on' : ''}`}
                onClick={() => setFilter(active ? 'all' : t)}
              >
                <span className="gp-type-dot" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}88` }} />
                <span className="gp-type-label">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        <div className="gp-sidebar-sect">
          <p className="gp-sect-label">LINK TYPES</p>
          {SIDEBAR_LINKS.map(lt => (
            <div key={lt} className="gp-link-row">
              <span className="gp-link-dash" style={{ background: EDGE_COLORS[lt] }} />
              <span className="gp-link-label">{lt}</span>
            </div>
          ))}
        </div>

        <div className="gp-sidebar-footer">
          <p className="gp-stat">{graph.nodes.length} nodes · {graph.edges.length} edges</p>
          <button className="gp-add-btn" onClick={() => setAddOpen(true)}>+ ADD NODE</button>
        </div>
      </aside>

      {/* ── Main */}
      <div className="gp-main">

        {/* Top bar */}
        <div className="gp-topbar">
          <div className="gp-breadcrumb">
            <span className="gp-bc-workspace">Workspace</span>
            <span className="gp-bc-sep">/</span>
            <span className="gp-bc-page">Core Graph</span>
          </div>
          <div className="gp-topbar-right">
            <input
              className="gp-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search nodes, links, tags…"
            />
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="gp-canvas"
          onMouseDown={onMD}
          onMouseMove={onMM}
          onMouseUp={onMU}
          onMouseLeave={onMU}
          style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        >
          {/* Transformed content group */}
          <div
            className="gp-world"
            style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`, transformOrigin: '0 0' }}
          >
            {/* Edge SVG */}
            <svg className="gp-edges-svg">
              <defs>
                <filter id="gpGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3.5" result="b" />
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              {visibleEdges.map(edge => {
                const src = graph.nodes.find(n => n.id === edge.source);
                const tgt = graph.nodes.find(n => n.id === edge.target);
                if (!src || !tgt) return null;
                const sc = center(src), tc = center(tgt);
                const path = bezierPath(sc.x, sc.y, tc.x, tc.y);
                const active = edgeActive(edge);
                const color = EDGE_COLORS[edge.type] ?? '#7c4dff';
                const dots = [0.25, 0.5, 0.75].map(t => bezierPt(t, sc.x, sc.y, tc.x, tc.y));
                return (
                  <g key={edge.id} style={{ transition: 'opacity 0.3s ease' }} opacity={!hlSet || active ? 1 : 0.05}>
                    {/* Glow bloom */}
                    <path d={path} fill="none" stroke={color} strokeWidth={active ? 5 : 3} opacity={active ? 0.30 : 0.10} filter="url(#gpGlow)" />
                    {/* Core line */}
                    <path d={path} fill="none" stroke={color} strokeWidth={active ? 1.8 : 1.2} opacity={active ? 0.80 : 0.28} />
                    {/* Dots */}
                    {dots.map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y} r={active ? 3.5 : 2.5} fill={color} opacity={active ? 0.90 : 0.38} filter="url(#gpGlow)" />
                    ))}
                  </g>
                );
              })}
            </svg>

            {/* Node cards */}
            {filteredNodes.map(node => {
              const cfg = NODE_CFG[node.type];
              const isSel = selected?.id === node.id;
              const op = nodeOp(node.id);
              return (
                <div
                  key={node.id}
                  className={`gn-card ${isSel ? 'gn-card--sel' : ''}`}
                  style={{
                    left: node.x, top: node.y,
                    borderColor: isSel ? `${cfg.color}cc` : hoveredId === node.id ? `${cfg.color}70` : `${cfg.color}2a`,
                    opacity: op,
                    transition: 'opacity 0.3s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onClick={() => setSelected(isSel ? null : node)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="gn-header">
                    <span className="gn-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span className="gn-title">{node.label}</span>
                  </div>
                  {node.description && (
                    <p className="gn-desc">{node.description}</p>
                  )}
                  <div className="gn-footer">
                    {node.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="gn-badge">{tag}</span>
                    ))}
                    <span className="gn-type" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zoom controls */}
          <div className="gp-zoom">
            <button onClick={() => setScale(s => { const n = Math.min(2.5, s + 0.12); saveView(pan, n); return n; })}>+</button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => { const n = Math.max(0.3, s - 0.12); saveView(pan, n); return n; })}>−</button>
            <button onClick={() => { const p = {x:60,y:30}; const sc=0.80; setPan(p); setScale(sc); saveView(p,sc); }}>⊞</button>
          </div>
        </div>

        {/* ── Right detail panel */}
        {selected && (() => {
          const cfg = NODE_CFG[selected.type];
          const conns = graph.edges.filter(e => e.source === selected.id || e.target === selected.id);
          return (
            <aside className="gp-detail">
              <div className="gp-detail-bar">
                <span className="gp-detail-bar-title">Node Details</span>
                <button className="gp-detail-close" onClick={() => setSelected(null)}>×</button>
              </div>

              <div className="gp-detail-hero">
                <span className="gp-detail-heroicon" style={{ color: cfg.color, borderColor: `${cfg.color}40`, background: `${cfg.color}12` }}>
                  {cfg.icon}
                </span>
                <div>
                  <p className="gp-detail-heroname">{selected.label}</p>
                  <p className="gp-detail-herotype" style={{ color: cfg.color }}>{cfg.label}</p>
                </div>
              </div>

              {selected.description && (
                <p className="gp-detail-desc">{selected.description}</p>
              )}

              <div className="gp-detail-sect">
                <p className="gp-detail-sect-label">Connections</p>
                {conns.length === 0
                  ? <p className="gp-detail-empty">No connections yet</p>
                  : conns.map(e => {
                      const otherId = e.source === selected.id ? e.target : e.source;
                      const other = graph.nodes.find(n => n.id === otherId);
                      if (!other) return null;
                      const oc = NODE_CFG[other.type];
                      return (
                        <button key={e.id} className="gp-conn-row" onClick={() => setSelected(other)}>
                          <span className="gp-conn-icon" style={{ color: oc.color }}>{oc.icon}</span>
                          <div>
                            <p className="gp-conn-name">{other.label}</p>
                            <p className="gp-conn-rel">{e.type}</p>
                          </div>
                        </button>
                      );
                    })
                }
              </div>

              <div className="gp-detail-sect">
                <p className="gp-detail-sect-label">Properties</p>
                <div className="gp-props">
                  <div className="gp-prop"><span>Created</span><span>{new Date(selected.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></div>
                  <div className="gp-prop"><span>Type</span><span style={{ color: cfg.color }}>{cfg.label}</span></div>
                </div>
                {selected.tags.length > 0 && (
                  <div className="gp-detail-tags">
                    {selected.tags.map(tag => <span key={tag} className="gp-detail-tag">{tag}</span>)}
                  </div>
                )}
              </div>
            </aside>
          );
        })()}
      </div>

      {/* ── Add modal */}
      {addOpen && (
        <div className="gp-overlay" onClick={() => setAddOpen(false)}>
          <div className="gp-modal" onClick={e => e.stopPropagation()}>
            <p className="gp-modal-title">ADD NODE</p>
            <input className="gp-modal-inp" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Node label" autoFocus />
            <select className="gp-modal-inp" value={newType} onChange={e => setNewType(e.target.value as GraphNodeType)}>
              {(['concept','goal','insight','memory','skill','quest','journal','chat'] as const).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <textarea className="gp-modal-inp" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{ resize: 'none' }} />
            <div className="gp-modal-actions">
              <button className="gp-modal-btn gp-modal-btn--primary" onClick={addNode}>ADD</button>
              <button className="gp-modal-btn" onClick={() => setAddOpen(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
