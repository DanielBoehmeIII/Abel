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

const ORBIT_R = 240;

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
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.5 + Math.random() * 1.4,
      delay: Math.random() * 6,
      dur: 2 + Math.random() * 4,
    })),
  []);

  return (
    <div className={`orbital-overlay ${mounted ? 'orbital-overlay--in' : ''}`} onClick={onClose}>
      <div className="orbital-scene" onClick={e => e.stopPropagation()}>

        {/* Stars */}
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

        {/* Full-scene background SVG — large outer orbital ellipses */}
        <svg className="orbital-bg-svg" aria-hidden="true">
          <ellipse cx="50%" cy="50%" rx="44%" ry="14%"
            fill="none" stroke="rgba(139,92,246,0.13)" strokeWidth="1"
            style={{ transform: 'rotate(-18deg)', transformOrigin: '50% 50%' }} />
          <ellipse cx="50%" cy="50%" rx="40%" ry="11%"
            fill="none" stroke="rgba(100,70,210,0.08)" strokeWidth="0.8"
            style={{ transform: 'rotate(24deg)', transformOrigin: '50% 50%' }} />
          <ellipse cx="50%" cy="50%" rx="47%" ry="8%"
            fill="none" stroke="rgba(80,50,180,0.06)" strokeWidth="0.7"
            style={{ transform: 'rotate(0deg)', transformOrigin: '50% 50%' }} />
        </svg>

        {/* Orbital container */}
        <div className="orbital-container">

          {/* Sphere backplate — rendered as screen-blend to let dark bg show through */}
          <div className="orbital-sphere-plate" aria-hidden="true" />

          {/* SVG — orbit ring + spokes only (sphere is the image) */}
          <svg className="orbital-svg" viewBox="-300 -300 600 600">
            {/* Outer decorative rings */}
            <circle cx="0" cy="0" r="280" fill="none"
              stroke="rgba(139,92,246,0.04)" strokeWidth="1" />
            <circle cx="0" cy="0" r="258" fill="none"
              stroke="rgba(139,92,246,0.05)" strokeWidth="0.6" />

            {/* Main orbit ring — dashed */}
            <circle cx="0" cy="0" r={ORBIT_R} fill="none"
              stroke="rgba(139,92,246,0.22)" strokeWidth="1"
              strokeDasharray="4 10" />

            {/* Rotating arc on orbit */}
            <circle cx="0" cy="0" r={ORBIT_R} fill="none"
              stroke="rgba(139,92,246,0.45)" strokeWidth="1.5"
              strokeDasharray="32 900"
              style={{ animation: 'spin-slow 14s linear infinite', transformOrigin: 'center' }}
            />

            {/* Spokes from center to each node */}
            {NAV_NODES.map(node => {
              const rad = (node.angle - 90) * (Math.PI / 180);
              const x   = Math.cos(rad) * ORBIT_R;
              const y   = Math.sin(rad) * ORBIT_R;
              const sel = node.id === selected;
              return (
                <line key={node.id}
                  x1="0" y1="0" x2={x} y2={y}
                  stroke={sel ? 'rgba(139,92,246,0.50)' : 'rgba(255,255,255,0.025)'}
                  strokeWidth={sel ? '1.2' : '0.5'}
                  strokeDasharray={sel ? '4 6' : '2 12'}
                  style={{ transition: 'stroke 0.35s, stroke-width 0.35s' }}
                />
              );
            })}
          </svg>

          {/* Nav nodes */}
          {NAV_NODES.map(node => {
            const rad   = (node.angle - 90) * (Math.PI / 180);
            const x     = Math.cos(rad) * ORBIT_R;
            const y     = Math.sin(rad) * ORBIT_R;
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
                  <svg width="48" height="48" viewBox="-24 -24 48 48" className="orbital-node-shape">
                    <circle cx="0" cy="0" r="20"
                      fill={isSel ? 'rgba(139,92,246,0.22)' : 'rgba(14,13,26,0.90)'}
                      stroke="currentColor" strokeWidth="1.3"
                    />
                    <circle cx="0" cy="0" r="16"
                      fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.35"
                    />
                  </svg>
                  <span className="orbital-node-glyph">{node.glyph}</span>
                </div>
                <span className="orbital-node-label">{node.label.toUpperCase()}</span>
              </div>
            );
          })}

          {/* Info panel */}
          <div className="orbital-info" key={selected}>
            <div className="orbital-info-icon">
              <svg width="56" height="56" viewBox="-28 -28 56 56">
                <polygon points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11"
                  fill="rgba(139,92,246,0.14)"
                  stroke="rgba(139,92,246,0.65)" strokeWidth="1.4"
                />
                <text x="0" y="1" textAnchor="middle" dominantBaseline="central"
                  fill="rgba(200,175,255,0.92)" fontSize="18"
                  fontFamily="var(--font-sans)">
                  {selectedNode.glyph}
                </text>
              </svg>
            </div>
            <h2 className="orbital-info-title">{selectedNode.label.toUpperCase()}</h2>
            <div className="orbital-info-accent" />
            <p className="orbital-info-desc">{selectedNode.description}</p>
            <button className="orbital-open-btn" onClick={() => onNavigate(selected)}>
              <span>OPEN</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

        </div>

        {/* Bottom hints bar */}
        <div className="orbital-hints">
          <div className="orbital-hints-left">
            <div className="orbital-hints-orb" />
            <div className="orbital-hints-left-text">
              <span className="orbital-hints-tagline">Navigate your universe.</span>
              <span className="orbital-hints-sub">Everything is connected.</span>
            </div>
          </div>
          <div className="orbital-hints-center">
            <kbd className="orbital-key">↑ ↓ ← →</kbd>
            <span className="orbital-hint">Navigate</span>
            <span className="orbital-hint-sep" />
            <kbd className="orbital-key">Enter</kbd>
            <span className="orbital-hint">Select</span>
            <span className="orbital-hint-sep" />
            <kbd className="orbital-key">Esc</kbd>
            <span className="orbital-hint">Back</span>
          </div>
          <div className="orbital-hints-right">
            <span className="orbital-status-dot" />
            <span className="orbital-hint">Synced</span>
            <span className="orbital-hint-sep" />
            <span className="orbital-hint orbital-hint--status">All systems operational</span>
          </div>
        </div>

      </div>
    </div>
  );
}
