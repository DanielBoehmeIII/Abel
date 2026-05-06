import React, { useEffect, useState, useCallback } from 'react';
import type { PageId } from '../../types/abel';
import './OrbitalNav.css';

interface NavNode {
  id: PageId;
  label: string;
  description: string;
  icon: string;
  angle: number;
}

const NAV_NODES: NavNode[] = [
  { id: 'main',       label: 'Main',       icon: '◉', description: 'Cinematic entry. Your system at a glance.',              angle: 0   },
  { id: 'archive',    label: 'Archive',    icon: '◈', description: 'AI planning room. Goals, journeys, quests.',             angle: 36  },
  { id: 'quests',     label: 'Quests',     icon: '⊕', description: 'Your active path. Every quest shapes the system.',       angle: 72  },
  { id: 'focus',      label: 'Focus',      icon: '⬡', description: 'Deep work sessions. Enter the flow state.',              angle: 108 },
  { id: 'graph',      label: 'Graph',      icon: '◇', description: 'Knowledge graph. Nodes, edges, and insight clusters.',   angle: 144 },
  { id: 'skillweb',   label: 'Skillweb',   icon: '⟁', description: 'Skill progression map. Mastery milestones and eggs.',    angle: 180 },
  { id: 'egg-hatch',  label: 'Egg Hatch',  icon: '◌', description: 'Hatch earned eggs into collectible trophies.',           angle: 216 },
  { id: 'trophies',   label: 'Trophies',   icon: '⬙', description: 'Collectible vault. Artifacts of your journey.',         angle: 252 },
  { id: 'exhibition', label: 'Exhibition', icon: '▣', description: 'Memory museum. A curated view of who you are becoming.', angle: 288 },
  { id: 'settings',   label: 'Settings',   icon: '⊞', description: 'Configure Abel. LLM provider, themes, preferences.',    angle: 324 },
];

const ORBIT_R = 190;

interface Props {
  onNavigate: (page: PageId) => void;
  onClose: () => void;
  currentPage: PageId;
}

export default function OrbitalNav({ onNavigate, onClose, currentPage }: Props) {
  const [selected, setSelected] = useState<PageId>(currentPage);
  const selectedNode = NAV_NODES.find(n => n.id === selected) ?? NAV_NODES[0];

  const rotate = useCallback((dir: 1 | -1) => {
    const idx = NAV_NODES.findIndex(n => n.id === selected);
    const next = (idx + dir + NAV_NODES.length) % NAV_NODES.length;
    setSelected(NAV_NODES[next].id);
  }, [selected]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')                             { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  rotate(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    rotate(-1);
      if (e.key === 'Enter')                              { onNavigate(selected); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, onClose, onNavigate, rotate]);

  return (
    <div className="orbital-overlay" onClick={onClose}>
      <div className="orbital-container" onClick={e => e.stopPropagation()}>

        {/* Stars background */}
        <div className="orbital-stars" aria-hidden>
          {Array.from({ length: 40 }, (_, i) => (
            <div key={i} className="orbital-star" style={{
              left: `${Math.random() * 100}%`,
              top:  `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }} />
          ))}
        </div>

        {/* Orbit ring */}
        <div className="orbital-ring" />
        <div className="orbital-ring orbital-ring--2" />

        {/* Center hub */}
        <div className="orbital-hub">
          <span className="orbital-hub-logo">ABEL</span>
        </div>

        {/* Nav nodes */}
        {NAV_NODES.map(node => {
          const rad = (node.angle - 90) * (Math.PI / 180);
          const x = Math.cos(rad) * ORBIT_R;
          const y = Math.sin(rad) * ORBIT_R;
          const isSelected = node.id === selected;
          const isCurrent  = node.id === currentPage;

          return (
            <div
              key={node.id}
              className={`orbital-node ${isSelected ? 'orbital-node--selected' : ''} ${isCurrent ? 'orbital-node--current' : ''}`}
              style={{ '--nx': `${x}px`, '--ny': `${y}px` } as React.CSSProperties}
              onClick={() => onNavigate(node.id)}
              onMouseEnter={() => setSelected(node.id)}
            >
              <div className="orbital-node-dot">
                <span className="orbital-node-icon">{node.icon}</span>
              </div>
              <span className="orbital-node-label">{node.label}</span>
            </div>
          );
        })}

        {/* Info panel */}
        <div className="orbital-info animate-fade-in-scale" key={selected}>
          <p className="heading">{selectedNode.label}</p>
          <p className="orbital-info-desc">{selectedNode.description}</p>
          <button
            className="orbital-open-btn"
            onClick={() => onNavigate(selected)}
          >
            OPEN →
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="orbital-hints">
          <span>↑ ↓ Navigate</span>
          <span>Enter Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
