import { useState, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../AppContext';
import { SKILL_NODES } from '../data';
import './GraphPage.css';

interface GNode {
  id: string;
  label: string;
  type: 'skill' | 'memory' | 'journal' | 'habit' | 'quest';
  x: number;
  y: number;
  color: string;
  symbol: string;
  connections: string[];
}

const TYPE_COLORS: Record<GNode['type'], string> = {
  skill:   '#8b5cf6',
  memory:  '#06b6d4',
  journal: '#3b82f6',
  habit:   '#10b981',
  quest:   '#f59e0b',
};
const TYPE_SYMBOLS: Record<GNode['type'], string> = {
  skill:   '⬡',
  memory:  '◇',
  journal: '▣',
  habit:   '◌',
  quest:   '△',
};

const CX = 600, CY = 400;

function buildGraph(
  completedSkills: string[],
  memories: ReturnType<typeof useApp>['state']['memories'],
  journals: ReturnType<typeof useApp>['state']['journalEntries'],
  habits: ReturnType<typeof useApp>['state']['habits'],
  tasks: ReturnType<typeof useApp>['state']['plannerTasks'],
): { nodes: GNode[]; edges: [string, string][] } {
  const nodes: GNode[] = [];
  const edges: [string, string][] = [];

  // Self-mastery root
  nodes.push({ id: 'self-mastery', label: 'Self Mastery', type: 'skill', x: CX, y: CY, color: '#a855f7', symbol: '◉', connections: [] });

  // Branch skills (inner ring)
  const branches = ['focus', 'habit', 'learning', 'fitness'];
  branches.forEach((bid, i) => {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const node = SKILL_NODES.find(n => n.id === bid);
    nodes.push({
      id: bid,
      label: node?.label ?? bid,
      type: 'skill',
      x: CX + Math.cos(angle) * 140,
      y: CY + Math.sin(angle) * 110,
      color: TYPE_COLORS.skill,
      symbol: node?.icon ?? '⬡',
      connections: ['self-mastery'],
    });
    edges.push(['self-mastery', bid]);
  });

  // Child skills (outer skill ring)
  const childSkills = SKILL_NODES.filter(n => n.parentId && n.parentId !== null && !branches.includes(n.id) && n.id !== 'self-mastery');
  childSkills.forEach((n) => {
    const parentNode = nodes.find(p => p.id === n.parentId);
    if (!parentNode) return;
    const siblings = childSkills.filter(c => c.parentId === n.parentId);
    const idx = siblings.findIndex(c => c.id === n.id);
    const baseAngle = Math.atan2(parentNode.y - CY, parentNode.x - CX);
    const spread = 0.5;
    const angle = baseAngle + (idx - (siblings.length - 1) / 2) * spread;
    const dist = 120;
    nodes.push({
      id: n.id,
      label: n.label,
      type: 'skill',
      x: parentNode.x + Math.cos(angle) * dist,
      y: parentNode.y + Math.sin(angle) * dist,
      color: completedSkills.includes(n.id) ? '#10b981' : TYPE_COLORS.skill,
      symbol: n.icon,
      connections: [n.parentId!],
    });
    edges.push([n.parentId!, n.id]);
  });

  // Memories (outer ring, top half)
  memories.slice(0, 16).forEach((m, i) => {
    const angle = (i / Math.max(memories.length, 8)) * Math.PI * 2;
    const r = 310 + (i % 3) * 30;
    nodes.push({
      id: m.id,
      label: m.title.slice(0, 22),
      type: 'memory',
      x: CX + Math.cos(angle) * r,
      y: CY + Math.sin(angle) * r * 0.75,
      color: TYPE_COLORS.memory,
      symbol: TYPE_SYMBOLS.memory,
      connections: m.linkedSkills,
    });
    m.linkedSkills.forEach(skillId => {
      if (nodes.find(n => n.id === skillId)) {
        edges.push([m.id, skillId]);
      }
    });
  });

  // Journal entries (scattered near memories)
  journals.slice(0, 10).forEach((e, i) => {
    const angle = (i / Math.max(journals.length, 6)) * Math.PI * 2 + Math.PI / 6;
    const r = 270 + (i % 2) * 40;
    nodes.push({
      id: e.id,
      label: (e.title || 'Entry').slice(0, 18),
      type: 'journal',
      x: CX + Math.cos(angle) * r,
      y: CY + Math.sin(angle) * r * 0.7,
      color: TYPE_COLORS.journal,
      symbol: TYPE_SYMBOLS.journal,
      connections: [],
    });
  });

  // Habits (lower ring)
  habits.slice(0, 8).forEach((h, i) => {
    const angle = (i / Math.max(habits.length, 5)) * Math.PI * 2 + Math.PI;
    const r = 200;
    nodes.push({
      id: h.id,
      label: h.label.slice(0, 18),
      type: 'habit',
      x: CX + Math.cos(angle) * r,
      y: CY + Math.sin(angle) * r * 0.6,
      color: TYPE_COLORS.habit,
      symbol: TYPE_SYMBOLS.habit,
      connections: ['habit'],
    });
    if (nodes.find(n => n.id === 'habit')) edges.push([h.id, 'habit']);
  });

  // Active quests (small nodes)
  tasks.slice(0, 8).forEach((t, i) => {
    const angle = (i / Math.max(tasks.length, 5)) * Math.PI * 2 + Math.PI / 3;
    const r = 250;
    nodes.push({
      id: `q-${t.id}`,
      label: t.text.slice(0, 18),
      type: 'quest',
      x: CX + Math.cos(angle) * r,
      y: CY + Math.sin(angle) * r * 0.65,
      color: t.done ? '#374151' : TYPE_COLORS.quest,
      symbol: TYPE_SYMBOLS.quest,
      connections: [],
    });
  });

  return { nodes, edges };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GraphPage() {
  const { state } = useApp();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const { nodes, edges } = useMemo(() =>
    buildGraph(
      state.skillsCompleted,
      state.memories,
      state.journalEntries,
      state.habits,
      state.plannerTasks,
    ),
    [state.skillsCompleted, state.memories, state.journalEntries, state.habits, state.plannerTasks]
  );

  const highlightedNode = highlighted ? nodes.find(n => n.id === highlighted) : null;
  const connectedIds = new Set(highlightedNode?.connections ?? []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(2.5, z - e.deltaY * 0.001)));
  }, []);

  return (
    <div className="graph-page">
      <div className="graph-header">
        <div className="graph-title-row">
          <span className="logo-a">▲</span>
          <span className="graph-title">KNOWLEDGE GRAPH</span>
          <span className="graph-sub">{nodes.length} nodes · {edges.length} connections</span>
        </div>
        <div className="graph-legend">
          {(Object.entries(TYPE_COLORS) as [GNode['type'], string][]).map(([type, color]) => (
            <div key={type} className="legend-item">
              <span className="legend-dot" style={{ background: color }} />
              <span>{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="graph-canvas-wrap"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <svg
          className="graph-svg"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '50% 50%' }}
        >
          {/* Edges */}
          <g className="edges-layer">
            {edges.map(([a, b], i) => {
              const na = nodes.find(n => n.id === a);
              const nb = nodes.find(n => n.id === b);
              if (!na || !nb) return null;
              const isHighlighted = highlighted && (na.id === highlighted || nb.id === highlighted);
              return (
                <line
                  key={i}
                  x1={na.x} y1={na.y}
                  x2={nb.x} y2={nb.y}
                  stroke={isHighlighted ? 'rgba(139,92,246,0.7)' : 'rgba(100,80,200,0.2)'}
                  strokeWidth={isHighlighted ? 1.5 : 0.8}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes-layer">
            {nodes.map(node => {
              const isHighlighted = node.id === highlighted;
              const isConnected = connectedIds.has(node.id);
              const isDimmed = highlighted !== null && !isHighlighted && !isConnected;
              const r = node.type === 'skill' ? (node.id === 'self-mastery' ? 22 : 14) : 10;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setHighlighted(h => h === node.id ? null : node.id)}
                  style={{ cursor: 'pointer' }}
                  opacity={isDimmed ? 0.2 : 1}
                >
                  <circle
                    r={r}
                    fill={`${node.color}22`}
                    stroke={node.color}
                    strokeWidth={isHighlighted ? 2 : 1}
                    style={{
                      filter: isHighlighted ? `drop-shadow(0 0 8px ${node.color})` : undefined,
                    }}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={node.id === 'self-mastery' ? 12 : 8}
                    fill={node.color}
                  >
                    {node.symbol}
                  </text>
                  <text
                    y={r + 10}
                    textAnchor="middle"
                    fontSize={8}
                    fill={isHighlighted ? 'rgba(232,240,255,0.9)' : 'rgba(150,170,220,0.5)'}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Detail panel */}
      {highlightedNode && (
        <div className="graph-detail glass fade-in">
          <div className="graph-detail-header">
            <span className="graph-detail-sym" style={{ color: highlightedNode.color }}>{highlightedNode.symbol}</span>
            <span className="graph-detail-name">{highlightedNode.label}</span>
            <span className="graph-detail-type">{highlightedNode.type}</span>
          </div>
          <div className="graph-detail-connections">
            {highlightedNode.connections.length} connection{highlightedNode.connections.length !== 1 ? 's' : ''}
          </div>
          <button className="btn" style={{ marginTop: 4 }} onClick={() => setHighlighted(null)}>Clear</button>
        </div>
      )}

      <div className="graph-controls">
        <div className="graph-ctrl-hint">Drag to pan · Scroll to zoom · Click node to highlight</div>
      </div>
    </div>
  );
}
