import React, { useState } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, Egg, EggType } from '../types/abel';
import GlowButton from '../components/common/GlowButton';
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

const EGG_LABELS: Record<EggType, string> = {
  discipline: 'Discipline Egg', creative: 'Creative Egg',
  knowledge: 'Knowledge Egg', memory: 'Memory Egg',
  archive: 'Archive Egg', focus: 'Focus Egg', archetype: 'Archetype Egg',
};

function EggShape({ egg, onClick, state }: { egg: Egg; onClick: () => void; state: 'idle' | 'cracking' | 'hatched' }) {
  const [primary, secondary] = EGG_COLORS[egg.type];

  return (
    <div
      className={`egg-shape-wrap ${state === 'cracking' ? 'egg-cracking' : ''}`}
      onClick={onClick}
    >
      <div className="egg-glow-ring" style={{ background: `radial-gradient(circle, ${primary}33 0%, transparent 70%)` }} />
      <svg className="egg-svg" viewBox="-60 -80 120 160">
        <defs>
          <radialGradient id={`egg-grad-${egg.id}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.7" />
            <stop offset="60%" stopColor={secondary} stopOpacity="0.5" />
            <stop offset="100%" stopColor="#05050f" stopOpacity="0.9" />
          </radialGradient>
          <filter id="egg-glow-filter">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Egg body */}
        <ellipse cx="0" cy="8" rx="42" ry="58"
          fill={`url(#egg-grad-${egg.id})`}
          stroke={primary} strokeWidth="1.5"
          filter="url(#egg-glow-filter)"
        />
        {/* Shine */}
        <ellipse cx="-12" cy="-20" rx="10" ry="16" fill="white" opacity="0.07" />
        {/* Crack lines if cracking */}
        {state === 'cracking' && (
          <g stroke="white" strokeWidth="1" opacity="0.6">
            <path d="M -5,-10 L 0,-30 L 8,-15 L 3,5" fill="none" />
            <path d="M 10,-20 L 15,-35 L 20,-15" fill="none" />
            <path d="M -15,10 L -20,25 L -10,30" fill="none" />
          </g>
        )}
        {/* Inner glow dot */}
        <circle cx="0" cy="8" r="8" fill={primary} opacity="0.4" />
        <circle cx="0" cy="8" r="3" fill={primary} opacity="0.8" />
        {/* Milestone label */}
        <text x="0" y="8" textAnchor="middle" dominantBaseline="central"
          fill="white" fontSize="10" fontFamily="var(--font-sans)" fontWeight="700"
          opacity="0.7"
        >
          {egg.milestone}%
        </text>
      </svg>
      <p className="egg-label">{EGG_LABELS[egg.type]}</p>
      <p className="caption">Milestone {egg.milestone}%</p>
    </div>
  );
}

export default function EggHatchPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { eggs, trophies, skills } = state;

  const [hatchingId, setHatchingId] = useState<string | null>(null);
  const [justHatchedId, setJustHatchedId] = useState<string | null>(null);

  const earnedEggs   = eggs.filter(e => e.state === 'earned');
  const hatchedEggs  = eggs.filter(e => e.state === 'hatched');
  const justHatched  = hatchedEggs.find(e => e.id === justHatchedId);
  const newTrophy    = justHatched?.hatchResultTrophyId
    ? trophies.find(t => t.id === justHatched.hatchResultTrophyId)
    : trophies[trophies.length - 1];

  function startHatch(eggId: string) {
    setHatchingId(eggId);
    setTimeout(() => {
      dispatch({ type: 'HATCH_EGG', eggId });
      setJustHatchedId(eggId);
      setHatchingId(null);
    }, 1800);
  }

  if (justHatchedId && newTrophy) {
    return (
      <div className="egg-page">
        <div className="egg-bg egg-bg--hatch" />
        <div className="egg-reveal animate-hatch-reveal">
          <p className="heading" style={{ marginBottom: '8px', textAlign: 'center' }}>TROPHY REVEALED</p>
          <div className="egg-trophy-icon" style={{ '--tc': newTrophy.color, '--tg': newTrophy.glowColor } as React.CSSProperties}>
            <TrophyIcon modelType={newTrophy.modelType} color={newTrophy.color} />
          </div>
          <h2 className="display-md" style={{ textAlign: 'center', color: newTrophy.color, margin: '16px 0 8px' }}>
            {newTrophy.name}
          </h2>
          <span className={`pill rarity-${newTrophy.rarity}`} style={{ display: 'block', textAlign: 'center', marginBottom: '12px' }}>
            {newTrophy.rarity}
          </span>
          <p className="body" style={{ textAlign: 'center', maxWidth: '320px' }}>{newTrophy.originStory}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <GlowButton variant="gold" onClick={() => onNavigate('trophies')}>VIEW IN VAULT →</GlowButton>
            <GlowButton variant="ghost" onClick={() => setJustHatchedId(null)}>HATCH MORE</GlowButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="egg-page">
      <div className="egg-bg" />

      {/* Header */}
      <div className="egg-header">
        <p className="heading" style={{ marginBottom: '6px' }}>EGG HATCH</p>
        <h1 className="display-lg" style={{ color: 'var(--text)' }}>
          Experimental Systems.<br />
          <em style={{ color: 'var(--purple)' }}>Beyond Reality.</em>
        </h1>
        <p className="body" style={{ marginTop: '8px' }}>
          {earnedEggs.length} egg{earnedEggs.length !== 1 ? 's' : ''} ready · {hatchedEggs.length} hatched
        </p>
      </div>

      {/* Earned eggs — ready to hatch */}
      {earnedEggs.length > 0 ? (
        <div className="egg-stage">
          <p className="heading" style={{ marginBottom: '20px', textAlign: 'center' }}>
            CLICK AN EGG TO HATCH
          </p>
          <div className="egg-grid">
            {earnedEggs.map(egg => {
              const skill = skills.find(s => s.id === egg.skillId);
              return (
                <div key={egg.id} className="egg-grid-item">
                  <EggShape
                    egg={egg}
                    onClick={() => !hatchingId && startHatch(egg.id)}
                    state={hatchingId === egg.id ? 'cracking' : 'idle'}
                  />
                  {skill && <p className="caption" style={{ textAlign: 'center', marginTop: '6px' }}>{skill.name}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="egg-empty">
          <p className="display-md" style={{ color: 'var(--text-3)', marginBottom: '12px' }}>No eggs ready.</p>
          <p className="body">Reach mastery milestones (20%, 40%, 60%, 80%, 100%) in any skill to earn eggs.</p>
          <GlowButton variant="cyan" style={{ marginTop: '20px' }} onClick={() => onNavigate('skillweb')}>
            VIEW SKILLWEB →
          </GlowButton>
        </div>
      )}

      {/* Hatched collection */}
      {hatchedEggs.length > 0 && (
        <div className="egg-hatched-section">
          <p className="heading" style={{ marginBottom: '16px', textAlign: 'center' }}>HATCHED</p>
          <div className="egg-hatched-grid">
            {hatchedEggs.map(egg => {
              const skill = skills.find(s => s.id === egg.skillId);
              const [color] = EGG_COLORS[egg.type];
              return (
                <div key={egg.id} className="egg-hatched-item">
                  <div className="egg-hatched-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                  <div>
                    <p className="caption">{EGG_LABELS[egg.type]}</p>
                    {skill && <p className="caption" style={{ color: 'var(--text-4)' }}>{skill.name} {egg.milestone}%</p>}
                  </div>
                  <span className="caption" style={{ marginLeft: 'auto', color: 'var(--text-4)' }}>✓</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TrophyIcon({ modelType, color }: { modelType: string; color: string }) {
  const SIZE = 120;
  switch (modelType) {
    case 'orb':
      return (
        <svg width={SIZE} height={SIZE} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="40" fill={`${color}22`} stroke={color} strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 16px ${color})` }} />
          <circle cx="45" cy="45" r="8" fill="white" opacity="0.12" />
          <circle cx="60" cy="60" r="10" fill={color} opacity="0.6" />
        </svg>
      );
    case 'cube':
      return (
        <svg width={SIZE} height={SIZE} viewBox="0 0 120 120">
          <rect x="30" y="30" width="50" height="50" fill={`${color}22`} stroke={color} strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 12px ${color})` }} />
          <rect x="40" y="20" width="50" height="50" fill="none" stroke={color} strokeWidth="1.2" opacity="0.5" />
          <line x1="30" y1="30" x2="40" y2="20" stroke={color} strokeWidth="1.2" opacity="0.7" />
          <line x1="80" y1="30" x2="90" y2="20" stroke={color} strokeWidth="1.2" opacity="0.7" />
          <line x1="80" y1="80" x2="90" y2="70" stroke={color} strokeWidth="1.2" opacity="0.7" />
        </svg>
      );
    case 'creature':
      return (
        <svg width={SIZE} height={SIZE} viewBox="0 0 120 120">
          <ellipse cx="60" cy="75" rx="24" ry="12" fill={`${color}22`} stroke={color} strokeWidth="1.5" />
          <path d="M 36,60 Q 20,30 60,20 Q 100,30 84,60 Q 80,80 60,75 Q 40,80 36,60 Z"
            fill={`${color}22`} stroke={color} strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
          <ellipse cx="48" cy="48" rx="5" ry="7" fill={color} opacity="0.7" />
          <ellipse cx="72" cy="48" rx="5" ry="7" fill={color} opacity="0.7" />
        </svg>
      );
    default:
      return (
        <svg width={SIZE} height={SIZE} viewBox="0 0 120 120">
          <polygon points="60,15 90,50 80,90 40,90 30,50"
            fill={`${color}22`} stroke={color} strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 12px ${color})` }} />
          <circle cx="60" cy="55" r="8" fill={color} opacity="0.6" />
        </svg>
      );
  }
}
