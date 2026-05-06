import React, { useState } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, Trophy, TrophyRarity } from '../types/abel';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import './TrophiesPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const RARITY_ORDER: TrophyRarity[] = ['legendary', 'mythic', 'rare', 'common'];

function Trophy3D({ trophy, isSelected, onClick }: { trophy: Trophy; isSelected: boolean; onClick: () => void }) {
  const [bouncing, setBouncing] = useState(false);

  function handleClick() {
    setBouncing(true);
    setTimeout(() => setBouncing(false), 400);
    onClick();
  }

  return (
    <div
      className={`trophy-3d ${isSelected ? 'trophy-3d--selected' : ''} ${bouncing ? 'trophy-3d--bounce' : ''}`}
      onClick={handleClick}
      style={{ '--tc': trophy.color, '--tg': trophy.glowColor } as React.CSSProperties}
    >
      <div className="trophy-glow-halo" />
      <div className="trophy-model">
        <TrophyModel modelType={trophy.modelType} color={trophy.color} />
      </div>
      <p className="trophy-name">{trophy.name}</p>
      <span className={`pill rarity-${trophy.rarity}`}>{trophy.rarity}</span>
    </div>
  );
}

function TrophyModel({ modelType, color }: { color: string; modelType: string }) {
  switch (modelType) {
    case 'orb':
      return (
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="32" fill={`${color}18`} stroke={color} strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 12px ${color})` }} />
          <circle cx="45" cy="45" r="20" fill={`${color}12`} stroke={color} strokeWidth="1" opacity="0.5" />
          <circle cx="35" cy="33" rx="8" r="7" fill="white" opacity="0.08" />
          <circle cx="45" cy="45" r="6" fill={color} opacity="0.7" />
        </svg>
      );
    case 'cube':
      return (
        <svg width="90" height="90" viewBox="0 0 90 90">
          <rect x="22" y="22" width="40" height="40" fill={`${color}18`} stroke={color} strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
          <rect x="30" y="14" width="40" height="40" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
          <line x1="22" y1="22" x2="30" y2="14" stroke={color} strokeWidth="1" opacity="0.6" />
          <line x1="62" y1="22" x2="70" y2="14" stroke={color} strokeWidth="1" opacity="0.6" />
          <line x1="62" y1="62" x2="70" y2="54" stroke={color} strokeWidth="1" opacity="0.6" />
          <circle cx="45" cy="45" r="4" fill={color} opacity="0.7" />
        </svg>
      );
    case 'creature':
      return (
        <svg width="90" height="90" viewBox="0 0 90 90">
          <path d="M 25,55 Q 15,30 45,18 Q 75,30 65,55 Q 60,72 45,68 Q 30,72 25,55 Z"
            fill={`${color}18`} stroke={color} strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
          <ellipse cx="35" cy="40" rx="4" ry="6" fill={color} opacity="0.6" />
          <ellipse cx="55" cy="40" rx="4" ry="6" fill={color} opacity="0.6" />
          <path d="M 37,56 Q 45,62 53,56" stroke={color} strokeWidth="1.2" fill="none" opacity="0.7" />
        </svg>
      );
    case 'artifact':
      return (
        <svg width="90" height="90" viewBox="0 0 90 90">
          <polygon points="45,12 68,35 60,68 30,68 22,35"
            fill={`${color}18`} stroke={color} strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
          <circle cx="45" cy="45" r="8" fill={color} opacity="0.5" />
          <circle cx="45" cy="45" r="3" fill={color} opacity="0.9" />
        </svg>
      );
    case 'mask':
      return (
        <svg width="90" height="90" viewBox="0 0 90 90">
          <path d="M 25,20 Q 25,65 45,72 Q 65,65 65,20 Q 55,10 45,10 Q 35,10 25,20 Z"
            fill={`${color}18`} stroke={color} strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
          <ellipse cx="34" cy="38" rx="7" ry="5" fill={color} opacity="0.4" />
          <ellipse cx="56" cy="38" rx="7" ry="5" fill={color} opacity="0.4" />
        </svg>
      );
    default: // totem
      return (
        <svg width="90" height="90" viewBox="0 0 90 90">
          <rect x="37" y="12" width="16" height="66" rx="4" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
          <rect x="22" y="28" width="46" height="14" rx="3" fill={`${color}18`} stroke={color} strokeWidth="1" opacity="0.6" />
          <circle cx="45" cy="22" r="7" fill={color} opacity="0.6" />
          <circle cx="45" cy="45" r="5" fill={color} opacity="0.4" />
        </svg>
      );
  }
}

export default function TrophiesPage({ onNavigate }: Props) {
  const { state } = useAbel();
  const { trophies, skills, quests } = state;

  const [selected, setSelected] = useState<Trophy | null>(trophies.find(t => t.favorite) ?? trophies[0]);
  const [filterRarity, setFilterRarity] = useState<TrophyRarity | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'rarity'>('newest');

  const sorted = [...trophies]
    .filter(t => filterRarity === 'all' || t.rarity === filterRarity)
    .sort((a, b) => {
      if (sortBy === 'rarity') return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
    });

  const sourceSkill = selected?.sourceSkillId ? skills.find(s => s.id === selected.sourceSkillId) : null;
  const sourceQuest = selected?.sourceQuestId ? quests.find(q => q.id === selected.sourceQuestId) : null;

  return (
    <div className="trophies-page">
      <div className="trophies-bg" />

      {/* Header */}
      <div className="trophies-header">
        <div>
          <p className="heading" style={{ marginBottom: '6px' }}>ABEL</p>
          <h1 className="display-xl trophies-title">ART OBJECT OS</h1>
          <p className="body" style={{ marginTop: '8px', fontStyle: 'italic' }}>
            A living system that remembers,<br />dreams, and becomes.
          </p>
        </div>

        <div className="trophies-controls">
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`trophies-sort-btn ${sortBy === 'newest' ? 'trophies-sort-btn--active' : ''}`}
              onClick={() => setSortBy('newest')}
            >Newest</button>
            <button
              className={`trophies-sort-btn ${sortBy === 'rarity' ? 'trophies-sort-btn--active' : ''}`}
              onClick={() => setSortBy('rarity')}
            >Rarity</button>
          </div>
        </div>
      </div>

      {/* Vault grid */}
      <div className="trophies-body">
        <div className="trophies-vault">
          {sorted.map(t => (
            <Trophy3D
              key={t.id}
              trophy={t}
              isSelected={selected?.id === t.id}
              onClick={() => setSelected(t)}
            />
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="trophies-detail animate-fade-in-scale">
            <div className="trophies-detail-artifact">
              <div className="trophies-detail-glow" style={{ background: `radial-gradient(circle, ${selected.glowColor} 0%, transparent 70%)` }} />
              <TrophyModel modelType={selected.modelType} color={selected.color} />
            </div>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text)', marginBottom: '6px' }}>
              {selected.name}
            </h2>
            <span className={`pill rarity-${selected.rarity}`}>{selected.rarity}</span>
            <p className="body" style={{ margin: '12px 0' }}>{selected.description}</p>

            <GlassPanel style={{ padding: '16px', marginBottom: '12px' }}>
              <p className="heading" style={{ marginBottom: '6px' }}>ORIGIN STORY</p>
              <p className="body" style={{ fontStyle: 'italic' }}>{selected.originStory}</p>
            </GlassPanel>

            {sourceSkill && (
              <div className="trophies-source-chip" onClick={() => onNavigate('skillweb')}>
                <span className="caption">FROM SKILL</span>
                <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{sourceSkill.name}</span>
              </div>
            )}
            {sourceQuest && (
              <div className="trophies-source-chip" onClick={() => onNavigate('quests')}>
                <span className="caption">FROM QUEST</span>
                <span style={{ color: 'var(--purple)', fontWeight: 600 }}>{sourceQuest.title}</span>
              </div>
            )}

            <p className="caption" style={{ marginTop: '12px' }}>
              Earned {new Date(selected.earnedAt).toLocaleDateString()}
            </p>

            <GlowButton variant="ghost" size="sm" style={{ marginTop: '12px' }} onClick={() => onNavigate('egg-hatch')}>
              HATCH MORE EGGS →
            </GlowButton>
          </div>
        )}
      </div>
    </div>
  );
}
