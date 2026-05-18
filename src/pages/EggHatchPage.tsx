import React, { useState, useMemo } from 'react';
import { useAbel } from '../state/useAbel';
import type { PageId, Egg, EggType } from '../types/abel';
import GlowButton from '../components/common/GlowButton';
import CinematicIdleBackplate from '../components/abel/CinematicIdleBackplate';
import './EggHatchPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const EGG_COLORS: Record<EggType, [string, string]> = {
  discipline: ['#7c4dff', '#4a1fbf'],
  creative:   ['#f5c518', '#b8940e'],
  knowledge:  ['#00d4ff', '#0088aa'],
  memory:     ['#e879a0', '#b04070'],
  archive:    ['#a78bfa', '#6040c0'],
  focus:      ['#34d399', '#1a8060'],
  archetype:  ['#fb923c', '#b05020'],
};

function EggSVG({ egg, size, crackling }: { egg: Egg; size: number; crackling?: boolean }) {
  const [primary, secondary] = EGG_COLORS[egg.type];
  const id = `egg-gr-${egg.id}`;

  return (
    <svg width={size} height={size * 1.25} viewBox="-60 -75 120 150">
      <defs>
        <radialGradient id={id} cx="35%" cy="28%" r="70%">
          <stop offset="0%"   stopColor={primary}   stopOpacity="0.8" />
          <stop offset="55%"  stopColor={secondary} stopOpacity="0.55" />
          <stop offset="100%" stopColor="#050510"   stopOpacity="0.95" />
        </radialGradient>
        <filter id={`egg-glow-${egg.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Egg body */}
      <ellipse cx="0" cy="6" rx="44" ry="60"
        fill={`url(#${id})`}
        stroke={primary} strokeWidth="1.8"
        filter={`url(#egg-glow-${egg.id})`}
      />

      {/* Specular highlight */}
      <ellipse cx="-14" cy="-22" rx="11" ry="17" fill="white" opacity="0.07" />

      {/* Inner glow */}
      <ellipse cx="0" cy="6" rx="24" ry="33"
        fill={`${primary}18`} stroke={primary} strokeWidth="0.8" opacity="0.6" />

      {/* Cracks if crackling */}
      {crackling && (
        <g stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none">
          <path d="M -4,-14 L 2,-36 L 9,-18 L 5,2" />
          <path d="M 12,-22 L 17,-40 L 22,-18" />
          <path d="M -16,8 L -22,26 L -10,32" />
          <path d="M 20,10 L 26,24 L 16,34" />
        </g>
      )}

      {/* Milestone badge */}
      <circle cx="0" cy="6" r="10" fill={primary} opacity="0.35" />
      <text x="0" y="6" textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="9" fontFamily="var(--font-mono)" fontWeight="700" opacity="0.85">
        {egg.milestone}%
      </text>
    </svg>
  );
}

function TrophyReveal({ trophy, onViewVault, onHatchMore }: {
  trophy: { name: string; color: string; glowColor: string; rarity: string; originStory: string; modelType: string };
  onViewVault: () => void;
  onHatchMore: () => void;
}) {
  return (
    <div className="egg-reveal animate-hatch-reveal">
      {/* Burst glow */}
      <div className="egg-reveal-glow"
        style={{ background: `radial-gradient(circle, ${trophy.glowColor} 0%, transparent 65%)` }} />

      <p className="eyebrow egg-eyebrow" style={{ textAlign: 'center', marginBottom: '24px' }}>
        TROPHY REVEALED
      </p>

      {/* Trophy icon */}
      <div className="egg-reveal-icon"
        style={{ filter: `drop-shadow(0 0 28px ${trophy.color}) drop-shadow(0 0 80px ${trophy.glowColor})` }}>
        <RevealTrophyModel modelType={trophy.modelType} color={trophy.color} />
      </div>

      <h2 className="egg-reveal-title" style={{ color: trophy.color }}>{trophy.name}</h2>
      <span className={`pill rarity-${trophy.rarity}`} style={{ marginBottom: '16px' }}>{trophy.rarity}</span>

      <p className="body" style={{ textAlign: 'center', maxWidth: '380px', lineHeight: 1.7, marginBottom: '28px', color: 'var(--text-2)' }}>
        {trophy.originStory}
      </p>

      <div className="egg-reveal-actions">
        <GlowButton variant="gold" onClick={onViewVault}>VIEW IN VAULT →</GlowButton>
        <GlowButton variant="ghost" onClick={onHatchMore}>HATCH MORE</GlowButton>
      </div>
    </div>
  );
}

function RevealTrophyModel({ modelType, color }: { modelType: string; color: string }) {
  const sz = 140;
  switch (modelType) {
    case 'orb':
      return (
        <svg width={sz} height={sz} viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="46" fill={`${color}18`} stroke={color} strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 18px ${color})` }} />
          <circle cx="70" cy="70" r="28" fill={`${color}10`} stroke={color} strokeWidth="1.2" opacity="0.5" />
          <ellipse cx="54" cy="52" rx="11" ry="10" fill="white" opacity="0.1" />
          <circle cx="70" cy="70" r="9" fill={color} opacity="0.75" />
        </svg>
      );
    case 'cube':
      return (
        <svg width={sz} height={sz} viewBox="0 0 140 140">
          <rect x="34" y="34" width="60" height="60"
            fill={`${color}18`} stroke={color} strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 14px ${color})` }} />
          <rect x="46" y="22" width="60" height="60" fill="none" stroke={color} strokeWidth="1.2" opacity="0.48" />
          <line x1="34" y1="34" x2="46" y2="22" stroke={color} strokeWidth="1.2" opacity="0.7" />
          <line x1="94" y1="34" x2="106" y2="22" stroke={color} strokeWidth="1.2" opacity="0.7" />
          <line x1="94" y1="94" x2="106" y2="82" stroke={color} strokeWidth="1.2" opacity="0.7" />
          <circle cx="70" cy="70" r="6" fill={color} opacity="0.8" />
        </svg>
      );
    default:
      return (
        <svg width={sz} height={sz} viewBox="0 0 140 140">
          <polygon points="70,16 104,58 94,108 46,108 36,58"
            fill={`${color}18`} stroke={color} strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 14px ${color})` }} />
          <circle cx="70" cy="68" r="12" fill={color} opacity="0.6" />
          <circle cx="70" cy="68" r="5" fill={color} opacity="0.9" />
        </svg>
      );
  }
}

export default function EggHatchPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { eggs, trophies, skills } = state;

  const [hatchingId,    setHatchingId]    = useState<string | null>(null);
  const [justHatchedId, setJustHatchedId] = useState<string | null>(null);
  const [focalIdx,      setFocalIdx]      = useState(0);

  const earnedEggs   = eggs.filter(e => e.state === 'earned');
  const hatchedEggs  = eggs.filter(e => e.state === 'hatched');
  const justHatched  = hatchedEggs.find(e => e.id === justHatchedId);
  const newTrophy    = justHatched?.hatchResultTrophyId
    ? trophies.find(t => t.id === justHatched.hatchResultTrophyId)
    : trophies[trophies.length - 1];

  const focalEgg  = earnedEggs[focalIdx] ?? earnedEggs[0];
  const satEggs   = earnedEggs.filter((_, i) => i !== focalIdx);

  const satelliteAngles = useMemo(() =>
    satEggs.map((_, i) => (i / Math.max(satEggs.length, 1)) * 360),
  [satEggs.length]);

  function startHatch(eggId: string) {
    if (hatchingId) return;
    setHatchingId(eggId);
    setTimeout(() => {
      dispatch({ type: 'HATCH_EGG', eggId });
      setJustHatchedId(eggId);
      setHatchingId(null);
      setFocalIdx(0);
    }, 2000);
  }

  if (justHatchedId && newTrophy) {
    return (
      <div className="egg-page">
        <CinematicIdleBackplate src="/scene/egg/egg-idle.mp4" pingPong={false} className="cib-egg" />
        <TrophyReveal
          trophy={newTrophy}
          onViewVault={() => onNavigate('trophies')}
          onHatchMore={() => setJustHatchedId(null)}
        />
      </div>
    );
  }

  if (earnedEggs.length === 0) {
    return (
      <div className="egg-page">
        <CinematicIdleBackplate src="/scene/egg/egg-idle.mp4" pingPong={false} className="cib-egg" />
        <div className="egg-empty-state">
          <div className="egg-empty-ring" />
          <p className="eyebrow egg-eyebrow" style={{ marginBottom: '20px' }}>EGG HATCH</p>
          <h1 className="egg-empty-title">No eggs ready.</h1>
          <p className="body" style={{ textAlign: 'center', maxWidth: '340px', marginBottom: '28px', color: 'var(--text-2)' }}>
            Reach mastery milestones — 20%, 40%, 60%, 80%, 100% — in any skill to earn eggs.
          </p>
          <p className="caption" style={{ marginBottom: '8px' }}>
            {hatchedEggs.length > 0 && `${hatchedEggs.length} already hatched`}
          </p>
          <GlowButton variant="cyan" onClick={() => onNavigate('skillweb')}>
            VIEW SKILLWEB →
          </GlowButton>
        </div>
      </div>
    );
  }

  return (
    <div className="egg-page">
      <CinematicIdleBackplate src="/scene/egg/egg-idle.mp4" pingPong={false} className="cib-egg" />
      {/* Header */}
      <div className="egg-header">
        <p className="eyebrow egg-eyebrow">EGG HATCH</p>
        <h1 className="egg-title">Hatch what you<br />have earned.</h1>
        <p className="egg-count-label">
          {earnedEggs.length} ready · {hatchedEggs.length} hatched
        </p>
      </div>

      {/* Stage */}
      <div className="egg-stage">
        {/* Ambient glow platform */}
        <div className="egg-platform-glow"
          style={{ background: `radial-gradient(ellipse, ${EGG_COLORS[focalEgg?.type ?? 'discipline'][0]}30 0%, transparent 65%)` }} />
        <div className="egg-platform-ring" />

        {/* Satellite eggs */}
        {satEggs.map((egg, i) => {
          const angle = satelliteAngles[i];
          const rad   = (angle - 90) * Math.PI / 180;
          const rx    = Math.cos(rad) * 155;
          const ry    = Math.sin(rad) * 80;
          const skill = skills.find(s => s.id === egg.skillId);
          return (
            <button
              key={egg.id}
              className="egg-satellite"
              style={{ '--ex': `${rx}px`, '--ey': `${ry}px` } as React.CSSProperties}
              onClick={() => setFocalIdx(earnedEggs.indexOf(egg))}
              title={skill?.name}
            >
              <EggSVG egg={egg} size={50} />
            </button>
          );
        })}

        {/* Focal egg */}
        {focalEgg && (
          <div className={`egg-focal ${hatchingId === focalEgg.id ? 'egg-focal--cracking' : ''}`}>
            <div className="egg-focal-glow"
              style={{ background: `radial-gradient(circle, ${EGG_COLORS[focalEgg.type][0]}55 0%, transparent 60%)` }} />
            <div className="egg-focal-ring egg-focal-ring--1"
              style={{ borderColor: `${EGG_COLORS[focalEgg.type][0]}35` }} />
            <div className="egg-focal-ring egg-focal-ring--2"
              style={{ borderColor: `${EGG_COLORS[focalEgg.type][0]}18` }} />

            <button
              className={`egg-focal-body animate-float ${hatchingId ? 'egg-focal-body--disabled' : ''}`}
              onClick={() => focalEgg && startHatch(focalEgg.id)}
              style={{ filter: `drop-shadow(0 0 28px ${EGG_COLORS[focalEgg.type][0]}) drop-shadow(0 0 60px ${EGG_COLORS[focalEgg.type][0]}60)` }}
            >
              <EggSVG egg={focalEgg} size={140} crackling={hatchingId === focalEgg.id} />
            </button>

            <div className="egg-focal-info">
              <p className="egg-focal-type">{focalEgg.type.charAt(0).toUpperCase() + focalEgg.type.slice(1)} Egg</p>
              <p className="caption" style={{ color: 'var(--text-3)' }}>
                {skills.find(s => s.id === focalEgg.skillId)?.name} · {focalEgg.milestone}% milestone
              </p>
            </div>

            {!hatchingId && (
              <p className="egg-tap-hint">TAP TO HATCH</p>
            )}
            {hatchingId === focalEgg.id && (
              <p className="egg-tap-hint" style={{ color: EGG_COLORS[focalEgg.type][0] }}>HATCHING…</p>
            )}
          </div>
        )}

        {/* Selector dots if multiple eggs */}
        {earnedEggs.length > 1 && (
          <div className="egg-dots">
            {earnedEggs.map((_, i) => (
              <button
                key={i}
                className={`egg-dot ${focalIdx === i ? 'egg-dot--active' : ''}`}
                onClick={() => setFocalIdx(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
