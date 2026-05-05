import { useState, useEffect, useRef } from 'react';
import { TROPHIES } from '../data';
import './TrophyPage.css';

const SYMBOLS = ['★', '◇', '○', '⬙', '✦'];

export default function TrophyPage() {
  const [selectedId, setSelectedId] = useState('focus-champion');
  const trophy = TROPHIES.find(t => t.id === selectedId)!;

  return (
    <div className="trophy-page">
      {/* Title */}
      <div className="trophy-title-area">
        <div className="trophy-name neon-purple">{trophy.locked ? '???' : trophy.name}</div>
        <div className="trophy-subtitle">Interactive Trophy</div>
      </div>

      {/* Cube */}
      <div className="cube-area">
        <TrophyCube color={trophy.color} locked={trophy.locked} />
      </div>

      {/* Prompt */}
      <div className="trophy-prompt">
        <span className="prompt-dot">●</span>
        <span>{trophy.locked ? 'Locked Trophy' : 'Inspect Trophy'}</span>
      </div>

      {/* Description */}
      {!trophy.locked && (
        <div className="trophy-desc">{trophy.description}</div>
      )}

      {/* Selector */}
      <div className="trophy-selector">
        {TROPHIES.map(t => (
          <button
            key={t.id}
            className={`trophy-sel-btn ${t.id === selectedId ? 'active' : ''} ${t.locked ? 'locked' : ''}`}
            onClick={() => setSelectedId(t.id)}
          >
            {t.locked ? '🔒' : '⬙'} {t.locked ? t.name : t.name}
          </button>
        ))}
      </div>

      {/* Logo */}
      <div className="trophy-logo">
        <span className="logo-a">▲</span>
        <span>ABEL</span>
      </div>
    </div>
  );
}

function TrophyCube({ color, locked }: { color: string; locked: boolean }) {
  const symbolsRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let raf: number;
    let start: number;
    function tick(ts: number) {
      if (!start) start = ts;
      setTime((ts - start) / 1000);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const baseColor = locked ? '#374151' : color;
  const glowColor = locked ? 'rgba(55,65,81,0.5)' : `${color}88`;
  const glowStrong = locked ? 'rgba(55,65,81,0.8)' : `${color}cc`;

  return (
    <div
      className="cube-wrapper"
      style={{ '--cube-color': baseColor, '--cube-glow': glowColor, '--cube-glow-strong': glowStrong } as React.CSSProperties}
    >
      <div className="cube-outer">
        <div className="cube-face cube-front">
          <div ref={symbolsRef} className="cube-symbols">
            {SYMBOLS.map((sym, i) => {
              const angle = (time * 0.4 + i * (Math.PI * 2 / SYMBOLS.length));
              const x = 50 + Math.cos(angle) * 28;
              const y = 50 + Math.sin(angle) * 18;
              const scale = 0.7 + Math.sin(time * 0.8 + i) * 0.3;
              return (
                <span
                  key={i}
                  className="cube-sym"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%,-50%) scale(${scale})`,
                    opacity: locked ? 0.2 : 0.6 + Math.sin(time + i) * 0.4,
                    color: locked ? '#6b7280' : i % 2 === 0 ? '#a78bfa' : '#67e8f9',
                    textShadow: locked ? 'none' : `0 0 8px currentColor`,
                  }}
                >
                  {sym}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
