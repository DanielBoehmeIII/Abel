import React, { useState, useRef, useCallback } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, GraphNode, GraphNodeType } from '../types/abel';
import { makeGraphNode } from '../state/abelStore';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import './GraphPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const NODE_COLORS: Record<GraphNodeType, string> = {
  memory: '#e879a0', quest: '#7c4dff', skill: '#00d4ff',
  insight: '#f5c518', pdf: '#fb923c', chat: '#34d399',
  journal: '#fb923c', concept: '#a0a0c0', goal: '#f5c518',
  'archetype-trait': '#f472b6',
};

const NODE_SIZE: Record<GraphNodeType, number> = {
  goal: 14, skill: 12, quest: 11, memory: 10, chat: 10,
  concept: 9, insight: 10, journal: 9, pdf: 9, 'archetype-trait': 10,
};

const FILTER_TYPES: Array<GraphNodeType | 'all'> = [
  'all', 'goal', 'skill', 'quest', 'memory', 'chat', 'concept', 'journal',
];

export default function GraphPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { graph } = state;

  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [filter, setFilter] = useState<GraphNodeType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<GraphNodeType>('concept');
  const [newDesc, setNewDesc] = useState('');
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [scale, setScale] = useState(0.9);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const filteredNodes = graph.nodes.filter(n => {
    if (filter !== 'all' && n.type !== filter) return false;
    if (search && !n.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visibleIds = new Set(filteredNodes.map(n => n.id));
  const visibleEdges = graph.edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

  function addNode() {
    if (!newLabel.trim()) return;
    const node = makeGraphNode(newLabel.trim(), newType, newDesc.trim());
    dispatch({ type: 'ADD_GRAPH_NODE', node });
    setShowAddModal(false);
    setNewLabel(''); setNewDesc(''); setNewType('concept');
    setSelected(node);
  }

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('.graph-node-hit')) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.max(0.4, Math.min(2.5, s - e.deltaY * 0.001)));
  }, []);

  return (
    <div className="graph-page">
      {/* Sidebar */}
      <aside className="graph-sidebar">
        <div className="graph-sidebar-top">
          <p className="graph-sidebar-title">KNOWLEDGE GRAPH</p>
          <p className="display-sm" style={{ color: 'var(--text)', marginBottom: '16px', fontWeight: 300, fontStyle: 'italic' }}>Core Graph</p>

          <input
            className="graph-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes…"
          />

          <div className="graph-filters">
            {FILTER_TYPES.map(t => (
              <button
                key={t}
                className={`graph-filter-btn ${filter === t ? 'graph-filter-btn--active' : ''}`}
                style={{ color: t !== 'all' ? NODE_COLORS[t as GraphNodeType] : undefined }}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="graph-node-list">
          {filteredNodes.map(n => (
            <div
              key={n.id}
              className={`graph-node-list-item ${selected?.id === n.id ? 'graph-node-list-item--active' : ''}`}
              onClick={() => setSelected(n)}
            >
              <span className="graph-node-list-dot" style={{ background: NODE_COLORS[n.type] }} />
              <div style={{ overflow: 'hidden' }}>
                <p className="graph-node-list-label">{n.label}</p>
                <p className="caption">{n.type}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="graph-sidebar-footer">
          <p className="caption" style={{ marginBottom: '8px' }}>
            {graph.nodes.length} nodes · {graph.edges.length} edges
          </p>
          <GlowButton variant="cyan" size="sm" style={{ width: '100%' }} onClick={() => setShowAddModal(true)}>
            + ADD NODE
          </GlowButton>
        </div>
      </aside>

      {/* Main graph canvas */}
      <div className="graph-canvas-wrap">
        {/* Atmospheric title overlay */}
        <div className="graph-canvas-title">
          <p className="eyebrow" style={{ letterSpacing: '0.22em', color: 'rgba(150,130,210,0.35)', marginBottom: '6px' }}>
            EVERY INSIGHT CONNECTS
          </p>
          <h1 className="graph-big-title">Knowledge<br />Graph</h1>
          <p className="body-sm graph-big-subtitle">
            a living map of what<br />you know, feel, and are becoming.
          </p>
        </div>
        <svg
          className="graph-canvas"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        >
          <defs>
            <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="node-glow-strong" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.12)" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {visibleEdges.map(edge => {
              const src = graph.nodes.find(n => n.id === edge.source);
              const tgt = graph.nodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;
              const isHighlighted = selected?.id === src.id || selected?.id === tgt.id;
              const srcColor = NODE_COLORS[src.type];
              return (
                <line
                  key={edge.id}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={isHighlighted ? `${srcColor}88` : 'rgba(255,255,255,0.05)'}
                  strokeWidth={isHighlighted ? 1.5 : 0.8}
                  strokeDasharray={isHighlighted ? '' : '3 6'}
                  markerEnd="url(#arrow)"
                />
              );
            })}

            {filteredNodes.map(node => {
              const r = NODE_SIZE[node.type] ?? 10;
              const color = NODE_COLORS[node.type];
              const isSelected = selected?.id === node.id;
              return (
                <g key={node.id} className="graph-node-hit" onClick={() => setSelected(node)}>
                  {/* Outer glow ring on selection */}
                  {isSelected && (
                    <>
                      <circle cx={node.x} cy={node.y} r={r + 14}
                        fill={`${color}08`} stroke={color}
                        strokeWidth="1" strokeDasharray="4 4" opacity="0.6"
                      />
                      <circle cx={node.x} cy={node.y} r={r + 6}
                        fill={`${color}10`} stroke="none"
                      />
                    </>
                  )}
                  <circle
                    cx={node.x} cy={node.y} r={r}
                    fill={`${color}${isSelected ? '30' : '18'}`}
                    stroke={color}
                    strokeWidth={isSelected ? 1.8 : 0.9}
                    filter={isSelected ? 'url(#node-glow-strong)' : 'url(#node-glow)'}
                    style={{ cursor: 'pointer' }}
                  />
                  <text
                    x={node.x} y={node.y + r + 14}
                    textAnchor="middle" fill={isSelected ? color : 'rgba(180,180,210,0.6)'}
                    fontSize="10" fontFamily="var(--font-sans)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="graph-zoom-controls glass">
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.15))}>+</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(0.4, s - 0.15))}>−</button>
          <button onClick={() => { setScale(0.9); setPan({ x: 50, y: 50 }); }}>⊞</button>
        </div>
      </div>

      {/* Node detail panel */}
      {selected && (
        <aside className="graph-detail animate-fade-in-scale">
          <div className="graph-detail-header">
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: NODE_COLORS[selected.type] }}>
              {selected.type}
            </span>
            <button onClick={() => setSelected(null)} style={{ color: 'var(--text-3)', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
          </div>

          <h3 className="graph-detail-title">{selected.label}</h3>
          <p className="body" style={{ marginBottom: '12px' }}>{selected.description}</p>
          <p className="caption">Created {new Date(selected.createdAt).toLocaleDateString()}</p>

          {selected.tags.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selected.tags.map(tag => (
                <span key={tag} className="pill rarity-common">{tag}</span>
              ))}
            </div>
          )}

          <GlassPanel style={{ padding: '14px', marginTop: '16px' }}>
            <p className="eyebrow" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>CONNECTIONS</p>
            {graph.edges
              .filter(e => e.source === selected.id || e.target === selected.id)
              .map(e => {
                const otherId = e.source === selected.id ? e.target : e.source;
                const other = graph.nodes.find(n => n.id === otherId);
                return other ? (
                  <div key={e.id} className="graph-conn-item" onClick={() => setSelected(other)}>
                    <span className="caption" style={{ color: 'var(--text-4)' }}>{e.type}</span>
                    <span className="graph-conn-label">{other.label}</span>
                  </div>
                ) : null;
              })}
          </GlassPanel>

          <div className="graph-detail-actions">
            <GlowButton variant="purple" size="sm" onClick={() => onNavigate('quests')}>
              Create Quest
            </GlowButton>
            <GlowButton variant="cyan" size="sm" onClick={() => onNavigate('skillweb')}>
              Link Skill
            </GlowButton>
          </div>
        </aside>
      )}

      {showAddModal && (
        <div className="graph-modal-overlay" onClick={() => setShowAddModal(false)}>
          <GlassPanel
            variant="raised"
            style={{ padding: '24px', width: '360px', borderRadius: 'var(--radius-xl)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="heading" style={{ marginBottom: '12px' }}>ADD GRAPH NODE</p>
            <input className="graph-input" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Node label" />
            <select className="graph-input" value={newType} onChange={e => setNewType(e.target.value as GraphNodeType)} style={{ marginTop: '8px' }}>
              {(['concept', 'goal', 'insight', 'memory', 'skill', 'quest', 'journal', 'chat'] as const).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <textarea
              className="graph-input" value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)" rows={2}
              style={{ marginTop: '8px', resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <GlowButton variant="purple" onClick={addNode}>ADD</GlowButton>
              <GlowButton variant="ghost" onClick={() => setShowAddModal(false)}>CANCEL</GlowButton>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
