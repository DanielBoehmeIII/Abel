import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { PageId } from '../../types/abel';
import './OrbitalNav.css';

interface NavNode {
  id: PageId;
  label: string;
  description: string;
  glyph: string;
  angle: number;
  tier: 1 | 2;
}

const NAV_NODES: NavNode[] = [
  { id: 'main',       label: 'Home',       glyph: '◉', tier: 1, description: 'Your living system at a glance.',              angle: 0   },
  { id: 'archive',    label: 'Archive',    glyph: '◈', tier: 1, description: 'AI planning room. Goals and dialogue.',         angle: 36  },
  { id: 'quests',     label: 'Quests',     glyph: '⊕', tier: 1, description: 'Your active path. Every quest shapes you.',     angle: 72  },
  { id: 'focus',      label: 'Focus',      glyph: '⬡', tier: 1, description: 'Deep work sessions. Enter flow state.',         angle: 108 },
  { id: 'graph',      label: 'Graph',      glyph: '◇', tier: 1, description: 'Knowledge graph. Nodes and insight clusters.',  angle: 144 },
  { id: 'skillweb',   label: 'Skillweb',   glyph: '⟁', tier: 2, description: 'Skill web. Mastery milestones and eggs.',       angle: 180 },
  { id: 'egg-hatch',  label: 'Eggs',       glyph: '◌', tier: 2, description: 'Hatch earned eggs into collectible trophies.',  angle: 216 },
  { id: 'trophies',   label: 'Trophies',   glyph: '⬙', tier: 2, description: 'Collectible vault. Artifacts of your journey.', angle: 252 },
  { id: 'exhibition', label: 'Exhibition', glyph: '▣', tier: 2, description: 'Memory museum. Who you are becoming.',          angle: 288 },
  { id: 'settings',   label: 'Settings',   glyph: '⊞', tier: 2, description: 'Configure Abel. Providers and preferences.',    angle: 324 },
];

const ORBIT_R = 228;

interface Props {
  onNavigate: (page: PageId) => void;
  onClose: () => void;
  currentPage: PageId;
}

export default function OrbitalNav({ onNavigate, onClose, currentPage }: Props) {
  const [selected, setSelected]   = useState<PageId>(currentPage);
  const [mounted,  setMounted]    = useState(false);
  const selectedNode = NAV_NODES.find(n => n.id === selected) ?? NAV_NODES[0];

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const rotate = useCallback((dir: 1 | -1) => {
    setSelected(prev => {
      const idx = NAV_NODES.findIndex(n => n.id === prev);
      return NAV_NODES[(idx + dir + NAV_NODES.length) % NAV_NODES.length].id;
    });
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')    { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  rotate(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    rotate(-1);
      if (e.key === 'Enter')     onNavigate(selected);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selected, onClose, onNavigate, rotate]);

  const stars = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.6 + Math.random() * 1.6,
      delay: Math.random() * 6,
      dur: 2 + Math.random() * 4,
    })),
  []);

  return (
    <div className={`orbital-overlay ${mounted ? 'orbital-overlay--in' : ''}`} onClick={onClose}>
      <div className="orbital-scene" onClick={e => e.stopPropagation()}>

        {/* Stars scattered across full overlay */}
        <div className="orbital-stars">
          {stars.map(s => (
            <div key={s.id} className="orbital-star" style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: `${s.size}px`, height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            }} />
          ))}
        </div>

        {/* Nebula blobs */}
        <div className="orbital-nebula-a" />
        <div className="orbital-nebula-b" />

        {/* Orbital container */}
        <div className="orbital-container">

          {/* SVG — rings and spokes */}
          <svg className="orbital-svg" viewBox="-300 -300 600 600">
            {/* Outermost decorative ring */}
            <circle cx="0" cy="0" r="270" fill="none"
              stroke="rgba(139,92,246,0.05)" strokeWidth="1" />

            {/* Secondary decorative ring */}
            <circle cx="0" cy="0" r="248" fill="none"
              stroke="rgba(139,92,246,0.06)" strokeWidth="0.6" />

            {/* Main orbit ring — dashed */}
            <circle cx="0" cy="0" r={ORBIT_R} fill="none"
              stroke="rgba(139,92,246,0.18)" strokeWidth="1"
              strokeDasharray="3 9" />

            {/* Inner ring */}
            <circle cx="0" cy="0" r="180" fill="none"
              stroke="rgba(34,211,238,0.06)" strokeWidth="0.7" />

            {/* Hub ring */}
            <circle cx="0" cy="0" r="58" fill="none"
              stroke="rgba(139,92,246,0.22)" strokeWidth="1.5" />

            {/* Spoke to selected */}
            {NAV_NODES.map(node => {
              const rad = (node.angle - 90) * (Math.PI / 180);
              const x   = Math.cos(rad) * ORBIT_R;
              const y   = Math.sin(rad) * ORBIT_R;
              const sel = node.id === selected;
              return (
                <line key={node.id}
                  x1="0" y1="0" x2={x} y2={y}
                  stroke={sel ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.03)'}
                  strokeWidth={sel ? '1.4' : '0.5'}
                  strokeDasharray={sel ? '3 5' : '2 10'}
                  style={{ transition: 'stroke 0.35s, stroke-width 0.35s' }}
                />
              );
            })}

            {/* Rotating arc highlight */}
            <circle cx="0" cy="0" r={ORBIT_R} fill="none"
              stroke="rgba(34,211,238,0.22)" strokeWidth="1.5"
              strokeDasharray="28 600"
              style={{ animation: 'spin-slow 14s linear infinite', transformOrigin: 'center' }}
            />

            {/* Cross-hairs at center */}
            <line x1="-12" y1="0" x2="12" y2="0" stroke="rgba(139,92,246,0.25)" strokeWidth="1" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="rgba(139,92,246,0.25)" strokeWidth="1" />
          </svg>

          {/* Hub */}
          <div className="orbital-hub">
            <div className="orbital-hub-ring orbital-hub-ring--1" />
            <div className="orbital-hub-ring orbital-hub-ring--2" />
            <div className="orbital-hub-ring orbital-hub-ring--3" />
            <span className="orbital-hub-logo">ABEL</span>
          </div>

          {/* Nav nodes */}
          {NAV_NODES.map(node => {
            const rad = (node.angle - 90) * (Math.PI / 180);
            const x   = Math.cos(rad) * ORBIT_R;
            const y   = Math.sin(rad) * ORBIT_R;
            const isSel = node.id === selected;
            const isCur = node.id === currentPage;

            return (
              <div
                key={node.id}
                className={`orbital-node ${isSel ? 'orbital-node--selected' : ''} ${isCur ? 'orbital-node--current' : ''}`}
                style={{ '--nx': `${x}px`, '--ny': `${y}px` } as React.CSSProperties}
                onClick={() => onNavigate(node.id)}
                onMouseEnter={() => setSelected(node.id)}
              >
                <div className="orbital-node-halo" />
                <div className="orbital-node-dot">
                  <svg width="28" height="28" viewBox="-14 -14 28 28" className="orbital-node-shape">
                    <polygon points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5"
                      fill="rgba(8,8,22,0.85)"
                      stroke="currentColor" strokeWidth="1"
                    />
                  </svg>
                  <span className="orbital-node-glyph">{node.glyph}</span>
                </div>
                <span className="orbital-node-label">{node.label}</span>
              </div>
            );
          })}

          {/* Info panel */}
          <div className="orbital-info" key={selected}>
            <div className="orbital-info-hex">
              <svg width="44" height="44" viewBox="-22 -22 44 44">
                <polygon points="0,-18 15.6,-9 15.6,9 0,18 -15.6,9 -15.6,-9"
                  fill="rgba(139,92,246,0.12)"
                  stroke="rgba(139,92,246,0.5)" strokeWidth="1"
                />
                <text x="0" y="1" textAnchor="middle" dominantBaseline="central"
                  fill="rgba(200,175,255,0.9)" fontSize="14"
                  fontFamily="var(--font-sans)">
                  {selectedNode.glyph}
                </text>
              </svg>
            </div>
            <p className="eyebrow orbital-info-eyebrow">{selectedNode.label}</p>
            <p className="orbital-info-desc">{selectedNode.description}</p>
            <button className="orbital-open-btn" onClick={() => onNavigate(selected)}>
              <span>OPEN</span>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5h7M6.5 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

        </div>

        {/* Bottom hints */}
        <div className="orbital-hints">
          <span className="orbital-hint">↑ ↓ Navigate</span>
          <span className="orbital-hint-sep" />
          <span className="orbital-hint">Enter Select</span>
          <span className="orbital-hint-sep" />
          <span className="orbital-hint">Esc Close</span>
          <span className="orbital-hint-sep" />
          <span className="orbital-hint orbital-hint--status">All systems operational</span>
        </div>

      </div>
    </div>
  );
}
