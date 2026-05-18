import { useMemo } from 'react';
import './AtmosphereBackground.css';

function createRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

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
  const starData = useMemo(() => {
    const rng = createRng(137);
    return Array.from({ length: stars }, (_, i) => ({
      id: i,
      x: rng() * 100,
      y: rng() * 100,
      size: 0.8 + rng() * 1.8,
      delay: rng() * 6,
      duration: 2.5 + rng() * 4,
      opacity: 0.15 + rng() * 0.6,
    }));
  }, [stars]);

  const particleData = useMemo(() => {
    if (!particles) return [];
    const rng = createRng(271);
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 10 + rng() * 80,
      y: 20 + rng() * 70,
      dx: (rng() - 0.5) * 40,
      delay: rng() * 8,
      duration: 6 + rng() * 8,
      size: 1 + rng() * 2,
    }));
  }, [particles]);

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
