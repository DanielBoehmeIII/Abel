import { useState, useEffect, useRef } from 'react';
import { TROPHIES } from '../data';
import { useApp } from '../AppContext';
import type { Trophy } from '../types';
import './TrophyPage.css';

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export default function TrophyPage() {
  const { unlockedTrophyIds } = useApp();
  const [selectedId, setSelectedId] = useState('focus-champion');

  const trophy = TROPHIES.find(t => t.id === selectedId)!;
  const isLocked = !unlockedTrophyIds.has(trophy.id);

  return (
    <div className="trophy-page">
      <div className="trophy-bg-glow" style={{ background: isLocked ? undefined : `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(${hexToRgb(trophy.color)}, 0.12) 0%, transparent 70%)` }} />

      <div className="trophy-title-area">
        <div className="trophy-name" style={{ color: isLocked ? 'var(--locked-gray)' : trophy.color, textShadow: isLocked ? 'none' : `0 0 20px rgba(${hexToRgb(trophy.color)}, 0.5)` }}>
          {isLocked ? '???' : trophy.name}
        </div>
        <div className="trophy-subtitle">{isLocked ? 'Locked Achievement' : 'Artifact Trophy'}</div>
      </div>

      <div className="trophy-cube-area">
        <GlassCube trophy={trophy} locked={isLocked} />
      </div>

      {!isLocked && <div className="trophy-desc">{trophy.description}</div>}
      {isLocked && <div className="trophy-unlock-hint">{trophy.unlockCondition}</div>}

      <div className="trophy-selector">
        {TROPHIES.map(t => {
          const locked = !unlockedTrophyIds.has(t.id);
          return (
            <button
              key={t.id}
              className={`trophy-sel-btn ${t.id === selectedId ? 'active' : ''} ${locked ? 'locked' : ''}`}
              style={!locked && t.id === selectedId ? { borderColor: t.color, color: t.color } : undefined}
              onClick={() => setSelectedId(t.id)}
            >
              <span>{locked ? '🔒' : '⬙'}</span>
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      <div className="trophy-logo">
        <span className="logo-a">▲</span>
        <span>ABEL</span>
      </div>
    </div>
  );
}

// ─── Glass Cube ────────────────────────────────────────────────────────────────

function GlassCube({ trophy, locked }: { trophy: Trophy; locked: boolean }) {
  const [bouncing, setBouncing] = useState(false);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts;
      setTime((ts - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function handleClick() {
    if (locked || bouncing) return;
    setBouncing(true);
    setTimeout(() => setBouncing(false), 600);
  }

  const rgb = locked ? '55, 65, 81' : hexToRgb(trophy.color);
  const faceStyle: React.CSSProperties = {
    background: `rgba(${rgb}, 0.07)`,
    borderColor: `rgba(${rgb}, 0.28)`,
    boxShadow: `inset 0 0 30px rgba(${rgb}, 0.1)`,
  };
  const glowStyle: React.CSSProperties = {
    boxShadow: locked
      ? 'none'
      : `0 0 60px rgba(${rgb}, 0.25), 0 0 120px rgba(${rgb}, 0.1)`,
  };

  const symbols = locked ? ['?', '?', '?', '?', '?'] : trophy.symbols;

  return (
    <div className="cube-perspective" style={glowStyle}>
      <div className={`cube-float-bounce ${bouncing ? 'bouncing' : ''}`} onClick={handleClick}>
        <div className="cube-shell">
          <div className="face face-front" style={faceStyle}>
            <FaceSymbols symbols={symbols} time={time} locked={locked} rgb={rgb} />
          </div>
          <div className="face face-back" style={faceStyle} />
          <div className="face face-right" style={faceStyle} />
          <div className="face face-left" style={faceStyle} />
          <div className="face face-top" style={{ ...faceStyle, background: `rgba(${rgb}, 0.12)` }} />
          <div className="face face-bottom" style={faceStyle} />

          {/* inner cube for tesseract effect */}
          <div className="cube-inner">
            <div className="iface iface-front" style={{ borderColor: `rgba(${rgb}, 0.15)` }} />
            <div className="iface iface-back"  style={{ borderColor: `rgba(${rgb}, 0.15)` }} />
            <div className="iface iface-right" style={{ borderColor: `rgba(${rgb}, 0.15)` }} />
            <div className="iface iface-left"  style={{ borderColor: `rgba(${rgb}, 0.15)` }} />
            <div className="iface iface-top"   style={{ borderColor: `rgba(${rgb}, 0.15)` }} />
            <div className="iface iface-bottom"style={{ borderColor: `rgba(${rgb}, 0.15)` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FaceSymbols({ symbols, time, locked, rgb }: { symbols: string[]; time: number; locked: boolean; rgb: string }) {
  return (
    <div className="face-symbols">
      {symbols.map((sym, i) => {
        const angle = time * 0.35 + (i / symbols.length) * Math.PI * 2;
        const x = 50 + Math.cos(angle) * 28;
        const y = 50 + Math.sin(angle) * 20;
        const scale = 0.7 + Math.sin(time * 0.7 + i * 1.3) * 0.3;
        const opacity = locked ? 0.15 : 0.5 + Math.sin(time * 0.9 + i) * 0.4;
        return (
          <span
            key={i}
            className="face-sym"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              color: locked ? '#6b7280' : `rgba(${rgb}, 0.9)`,
              textShadow: locked ? 'none' : `0 0 10px rgba(${rgb}, 0.8)`,
            }}
          >
            {sym}
          </span>
        );
      })}
    </div>
  );
}
