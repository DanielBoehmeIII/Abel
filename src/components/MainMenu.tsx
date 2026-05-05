import { useEffect, useRef, useCallback } from 'react';
import { NAV_TABS } from '../data';
import type { PageId, NavTab } from '../types';
import './MainMenu.css';

interface Props {
  selected: PageId;
  onSelect: (id: PageId) => void;
  onOpen: (id: PageId) => void;
}

export default function MainMenu({ selected, onSelect, onOpen }: Props) {
  const lastClickRef = useRef<{ id: PageId; time: number } | null>(null);

  const handleTabClick = useCallback(
    (id: PageId) => {
      const now = Date.now();
      if (lastClickRef.current && lastClickRef.current.id === id && now - lastClickRef.current.time < 400) {
        onOpen(id);
      } else {
        onSelect(id);
      }
      lastClickRef.current = { id, time: now };
    },
    [onSelect, onOpen]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = NAV_TABS.findIndex(t => t.id === selected);
      if (e.key === 'ArrowRight') onSelect(NAV_TABS[(idx + 1) % NAV_TABS.length].id);
      if (e.key === 'ArrowLeft')  onSelect(NAV_TABS[(idx - 1 + NAV_TABS.length) % NAV_TABS.length].id);
      if (e.key === 'Enter') onOpen(selected);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, onSelect, onOpen]);

  const selectedTab = NAV_TABS.find(t => t.id === selected)!;
  const cx = 50;
  const cy = 50;
  const rx = 36;
  const ry = 14;

  return (
    <div className="main-menu">
      {/* Globe + orbit */}
      <div className="globe-area">
        <GlobeSVG cx={cx} cy={cy} rx={rx} ry={ry} />
        <div className="orbit-nodes">
          {NAV_TABS.map((tab) => {
            const angle = (tab.angle - 90) * (Math.PI / 180);
            const orbitRx = 220;
            const orbitRy = 100;
            const x = Math.cos(angle) * orbitRx;
            const y = Math.sin(angle) * orbitRy;
            const isSel = tab.id === selected;
            return (
              <button
                key={tab.id}
                className={`orbit-node ${isSel ? 'selected' : ''}`}
                style={{ '--ox': `${x}px`, '--oy': `${y}px` } as React.CSSProperties}
                onClick={() => handleTabClick(tab.id)}
                aria-label={tab.label}
              >
                <span className="orbit-icon">{tab.icon}</span>
                <span className="orbit-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info panel */}
      <InfoPanel tab={selectedTab} onOpen={onOpen} />

      {/* Header */}
      <div className="menu-logo">
        <span className="logo-a">▲</span>
        <span className="logo-name">ABEL</span>
      </div>

      {/* Controller hints */}
      <div className="menu-hints ctrl-hints">
        <span className="ctrl-hint"><span className="ctrl-key">←/→</span> Select</span>
        <span className="ctrl-hint"><span className="ctrl-key">↵</span> Confirm</span>
        <span className="ctrl-hint"><span className="ctrl-key">Esc</span> Back</span>
      </div>
    </div>
  );
}

function GlobeSVG({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  const latLines = [-60, -40, -20, 0, 20, 40, 60];
  const lngLines = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <svg className="globe-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <filter id="blur-filter">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>

      {/* Glow */}
      <ellipse cx={cx} cy={cy} rx={rx + 8} ry={ry + 8} fill="url(#glow-grad)" />

      {/* Latitude lines */}
      {latLines.map(lat => {
        const latRad = (lat * Math.PI) / 180;
        const ry2 = Math.cos(latRad) * ry;
        const y = cy + Math.sin(latRad) * rx * 0.55;
        return (
          <ellipse
            key={lat}
            cx={cx} cy={y}
            rx={ry + (rx - ry) * Math.cos(latRad) * 0.8}
            ry={ry2 * 0.35}
            fill="none"
            stroke="rgba(100,80,220,0.22)"
            strokeWidth="0.3"
          />
        );
      })}

      {/* Longitude arcs */}
      {lngLines.map(lng => {
        const lngRad = (lng * Math.PI) / 180;
        const cosL = Math.cos(lngRad);
        return (
          <ellipse
            key={lng}
            cx={cx} cy={cy}
            rx={Math.abs(cosL) * (rx * 0.55) + 0.1}
            ry={rx * 0.55}
            fill="none"
            stroke={Math.abs(cosL) > 0.85 ? 'rgba(120,100,255,0.35)' : 'rgba(100,80,220,0.18)'}
            strokeWidth={Math.abs(cosL) > 0.85 ? '0.4' : '0.25'}
          />
        );
      })}

      {/* Outer ring */}
      <ellipse cx={cx} cy={cy} rx={rx + 2} ry={ry * 1.15}
        fill="none" stroke="rgba(139,92,246,0.35)" strokeWidth="0.4" />

      {/* Center glow dot */}
      <circle cx={cx} cy={cy} r={1.2} fill="rgba(139,92,246,0.6)" filter="url(#blur-filter)" />
    </svg>
  );
}

function InfoPanel({ tab, onOpen }: { tab: NavTab; onOpen: (id: PageId) => void }) {
  return (
    <div className="info-panel glass fade-in" key={tab.id}>
      <div className="info-icon">{tab.icon}</div>
      <div className="info-name neon-purple">{tab.label}</div>
      <p className="info-desc">{tab.description}</p>
      <button className="btn info-open" onClick={() => onOpen(tab.id)}>
        Open
      </button>
    </div>
  );
}
