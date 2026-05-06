import { useMemo } from 'react';
import './AtmosphereBackground.css';

interface Props {
  variant?: 'default' | 'violet' | 'navy' | 'deep' | 'archive' | 'focus' | 'exhibition';
  stars?: number;
  particles?: boolean;
}

export default function AtmosphereBackground({
  variant = 'default',
  stars = 70,
  particles = false,
}: Props) {
  const starData = useMemo(() =>
    Array.from({ length: stars }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.8 + Math.random() * 1.8,
      delay: Math.random() * 6,
      duration: 2.5 + Math.random() * 4,
      opacity: 0.15 + Math.random() * 0.6,
    })),
  [stars]);

  const particleData = useMemo(() =>
    !particles ? [] : Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 20 + Math.random() * 70,
      dx: (Math.random() - 0.5) * 40,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 1 + Math.random() * 2,
    })),
  [particles]);

  return (
    <div className={`atmo atmo--${variant}`} aria-hidden>
      {/* Nebula cloud layers */}
      <div className="atmo-nebula atmo-nebula-1" />
      <div className="atmo-nebula atmo-nebula-2" />
      <div className="atmo-nebula atmo-nebula-3" />
      <div className="atmo-nebula atmo-nebula-4" />

      {/* Noise texture overlay */}
      <div className="atmo-noise" />

      {/* Vignette */}
      <div className="atmo-vignette" />

      {/* Stars */}
      <div className="atmo-stars">
        {starData.map(s => (
          <div
            key={s.id}
            className="atmo-star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Rising particles */}
      {particles && (
        <div className="atmo-particles">
          {particleData.map(p => (
            <div
              key={p.id}
              className="atmo-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                '--dx': `${p.dx}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
