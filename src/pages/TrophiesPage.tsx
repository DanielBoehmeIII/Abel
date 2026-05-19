import React, { useState } from 'react';
import { useAbel } from '../state/useAbel';
import type { PageId, Trophy, TrophyRarity } from '../types/abel';
import GlowButton from '../components/common/GlowButton';
import CinematicIdleBackplate from '../components/abel/CinematicIdleBackplate';
import './TrophiesPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const RARITY_ORDER: TrophyRarity[] = ['legendary', 'mythic', 'rare', 'common'];

function ShapeContent({ modelType, color, sz, large }: {
  modelType: string; color: string; sz: number; large?: boolean;
}) {
  switch (modelType) {
    case 'orb':
      return (
        <>
          <circle cx={sz/2} cy={sz/2} r={sz * 0.36} fill={`${color}14`} stroke={color} strokeWidth={large?2:1.2}
            style={{ filter: `drop-shadow(0 0 ${large?18:8}px ${color})` }} />
          <circle cx={sz/2} cy={sz/2} r={sz * 0.22} fill={`${color}10`} stroke={color} strokeWidth={large?1.2:0.8} opacity="0.5" />
          <ellipse cx={sz*0.4} cy={sz*0.38} rx={sz*0.1} ry={sz*0.12} fill="white" opacity="0.08" />
          <circle cx={sz/2} cy={sz/2} r={sz*0.08} fill={color} opacity="0.75" />
        </>
      );
    case 'cube':
      return (
        <>
          <rect x={sz*0.25} y={sz*0.25} width={sz*0.44} height={sz*0.44}
            fill={`${color}14`} stroke={color} strokeWidth={large?2:1.2}
            style={{ filter: `drop-shadow(0 0 ${large?14:7}px ${color})` }} />
          <rect x={sz*0.35} y={sz*0.17} width={sz*0.44} height={sz*0.44}
            fill="none" stroke={color} strokeWidth={large?1:0.7} opacity="0.45" />
          <line x1={sz*0.25} y1={sz*0.25} x2={sz*0.35} y2={sz*0.17} stroke={color} strokeWidth={large?1:0.7} opacity="0.7" />
          <line x1={sz*0.69} y1={sz*0.25} x2={sz*0.79} y2={sz*0.17} stroke={color} strokeWidth={large?1:0.7} opacity="0.7" />
          <line x1={sz*0.69} y1={sz*0.69} x2={sz*0.79} y2={sz*0.61} stroke={color} strokeWidth={large?1:0.7} opacity="0.7" />
          <circle cx={sz/2} cy={sz/2} r={sz*0.05} fill={color} opacity="0.8" />
        </>
      );
    case 'creature':
      return (
        <>
          <path d={`M ${sz*0.3},${sz*0.62} Q ${sz*0.18},${sz*0.35} ${sz/2},${sz*0.22} Q ${sz*0.82},${sz*0.35} ${sz*0.7},${sz*0.62} Q ${sz*0.66},${sz*0.8} ${sz/2},${sz*0.78} Q ${sz*0.34},${sz*0.8} ${sz*0.3},${sz*0.62} Z`}
            fill={`${color}14`} stroke={color} strokeWidth={large?2:1.2}
            style={{ filter: `drop-shadow(0 0 ${large?12:6}px ${color})` }} />
          <ellipse cx={sz*0.42} cy={sz*0.46} rx={sz*0.06} ry={sz*0.08} fill={color} opacity="0.65" />
          <ellipse cx={sz*0.58} cy={sz*0.46} rx={sz*0.06} ry={sz*0.08} fill={color} opacity="0.65" />
        </>
      );
    case 'artifact':
      return (
        <>
          <polygon points={`${sz/2},${sz*0.14} ${sz*0.76},${sz*0.4} ${sz*0.68},${sz*0.78} ${sz*0.32},${sz*0.78} ${sz*0.24},${sz*0.4}`}
            fill={`${color}14`} stroke={color} strokeWidth={large?2:1.2}
            style={{ filter: `drop-shadow(0 0 ${large?14:7}px ${color})` }} />
          <circle cx={sz/2} cy={sz/2} r={sz*0.1} fill={color} opacity="0.55" />
          <circle cx={sz/2} cy={sz/2} r={sz*0.04} fill={color} opacity="0.9" />
        </>
      );
    case 'mask':
      return (
        <>
          <path d={`M ${sz*0.28},${sz*0.22} Q ${sz*0.28},${sz*0.75} ${sz/2},${sz*0.83} Q ${sz*0.72},${sz*0.75} ${sz*0.72},${sz*0.22} Q ${sz*0.62},${sz*0.12} ${sz/2},${sz*0.12} Q ${sz*0.38},${sz*0.12} ${sz*0.28},${sz*0.22} Z`}
            fill={`${color}14`} stroke={color} strokeWidth={large?2:1.2}
            style={{ filter: `drop-shadow(0 0 ${large?12:6}px ${color})` }} />
          <ellipse cx={sz*0.4} cy={sz*0.44} rx={sz*0.09} ry={sz*0.06} fill={color} opacity="0.45" />
          <ellipse cx={sz*0.6} cy={sz*0.44} rx={sz*0.09} ry={sz*0.06} fill={color} opacity="0.45" />
        </>
      );
    default: // totem
      return (
        <>
          <rect x={sz*0.44} y={sz*0.14} width={sz*0.18} height={sz*0.74} rx={sz*0.04}
            fill={`${color}14`} stroke={color} strokeWidth={large?2:1.2} />
          <rect x={sz*0.26} y={sz*0.32} width={sz*0.52} height={sz*0.16} rx={sz*0.03}
            fill={`${color}12`} stroke={color} strokeWidth={large?1:0.7} opacity="0.65" />
          <circle cx={sz/2} cy={sz*0.26} r={sz*0.09} fill={color} opacity="0.65" />
        </>
      );
  }
}

function TrophyDisplay({ trophy, large }: { trophy: Trophy; large?: boolean }) {
  const sz = large ? 160 : 80;
  const { modelType, color } = trophy;

  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      <ShapeContent modelType={modelType} color={color} sz={sz} large={large} />
    </svg>
  );
}

export default function TrophiesPage({ onNavigate }: Props) {
  const { state } = useAbel();
  const { trophies, skills, quests } = state;

  const [selected,     setSelected]     = useState<Trophy | null>(trophies.find(t => t.favorite) ?? trophies[0]);
  const [filterRarity, setFilterRarity] = useState<TrophyRarity | 'all'>('all');

  const sorted = [...trophies]
    .filter(t => filterRarity === 'all' || t.rarity === filterRarity)
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));

  const sourceSkill = selected?.sourceSkillId ? skills.find(s => s.id === selected.sourceSkillId) : null;
  const sourceQuest = selected?.sourceQuestId ? quests.find(q => q.id === selected.sourceQuestId) : null;

  return (
    <div className="trophies-page">

      <CinematicIdleBackplate src="/scene/trophy/trophy.mp4" pingPong />

      {/* ── Left: object viewer ─────────────────────────────── */}
      <div className="trophies-stage">
        <div className="trophies-stage-bg" />

        <p className="eyebrow trophies-stage-eyebrow animate-fade-in">TROPHY VAULT</p>

        {selected ? (
          <div className="trophies-object animate-fade-in" key={selected.id}>
            {/* Halo layers */}
            <div className="trophies-halo trophies-halo--outer"
              style={{ background: `radial-gradient(circle, ${selected.glowColor} 0%, transparent 65%)` }} />
            <div className="trophies-halo trophies-halo--inner"
              style={{ background: `radial-gradient(circle, ${selected.glowColor} 0%, transparent 55%)` }} />

            {/* Orbit ring */}
            <div className="trophies-orbit-ring" style={{ borderColor: `${selected.color}30` }}>
              <div className="trophies-orbit-dot" style={{ background: selected.color }} />
            </div>

            {/* Trophy model */}
            <div className="trophies-model animate-float">
              <TrophyDisplay trophy={selected} large />
            </div>

            {/* Info below */}
            <div className="trophies-object-info">
              <h2 className="trophies-object-name">{selected.name}</h2>
              <span className={`pill rarity-${selected.rarity}`} style={{ marginBottom: '14px', display: 'inline-block' }}>
                {selected.rarity}
              </span>
              <p className="body trophies-object-desc">{selected.description}</p>

              <div className="trophies-object-origin">
                <p className="eyebrow" style={{ marginBottom: '6px', color: 'var(--text-3)' }}>ORIGIN STORY</p>
                <p className="body" style={{ fontStyle: 'italic', color: 'var(--text-2)' }}>{selected.originStory}</p>
              </div>

              <div className="trophies-source-row">
                {sourceSkill && (
                  <button className="trophies-source-chip" onClick={() => onNavigate('skillweb')}>
                    <span className="caption">SKILL</span>
                    <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{sourceSkill.name}</span>
                  </button>
                )}
                {sourceQuest && (
                  <button className="trophies-source-chip" onClick={() => onNavigate('quests')}>
                    <span className="caption">QUEST</span>
                    <span style={{ color: 'var(--purple)', fontWeight: 600 }}>{sourceQuest.title}</span>
                  </button>
                )}
              </div>

              <p className="caption trophies-earned-date">
                Earned {new Date(selected.earnedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        ) : (
          <div className="trophies-empty">
            <p className="display-md" style={{ color: 'var(--text-3)' }}>No artifacts yet.</p>
          </div>
        )}
      </div>

      {/* ── Right: vault grid ───────────────────────────────── */}
      <div className="trophies-vault">
        <div className="trophies-vault-header">
          <div>
            <h1 className="trophies-vault-title">Artifacts<br />of Your Journey</h1>
            <p className="caption" style={{ marginTop: '6px', color: 'var(--text-3)' }}>
              {trophies.length} collected
            </p>
          </div>
          <GlowButton variant="ghost" size="sm" onClick={() => onNavigate('egg-hatch')}>
            HATCH MORE →
          </GlowButton>
        </div>

        {/* Rarity filter */}
        <div className="trophies-filter-row">
          {(['all', ...RARITY_ORDER] as const).map(r => (
            <button
              key={r}
              className={`trophies-filter-btn ${filterRarity === r ? 'trophies-filter-btn--active' : ''}`}
              onClick={() => setFilterRarity(r)}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="trophies-grid">
          {sorted.map(t => (
            <button
              key={t.id}
              className={`trophies-cell ${selected?.id === t.id ? 'trophies-cell--active' : ''}`}
              style={{ '--tc': t.color, '--tg': t.glowColor } as React.CSSProperties}
              onClick={() => setSelected(t)}
              title={t.name}
            >
              <div className="trophies-cell-glow" />
              <TrophyDisplay trophy={t} />
              <p className="trophies-cell-name">{t.name}</p>
              <span className={`pill rarity-${t.rarity} trophies-cell-rarity`}>{t.rarity}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
