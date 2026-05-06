import React, { useState } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, Quest, QuestType } from '../types/abel';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import AtmosphereBackground from '../components/ui/AtmosphereBackground';
import './QuestsPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const TYPE_ICONS: Record<QuestType, string> = {
  focus: '⊕', knowledge: '◇', reflection: '▣',
  skill: '⬡', memory: '◌', archetype: '◉',
};

const DIFF_LABELS = ['', '■', '■■', '■■■', '■■■■', '■■■■■'];

export default function QuestsPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { quests, journeys, skills } = state;
  const [filter, setFilter] = useState<Quest['status'] | 'all'>('all');
  const [selected, setSelected] = useState<Quest | null>(quests.find(q => q.status === 'active') ?? null);

  const activeJourney = journeys.find(j => j.active) ?? journeys[0];
  const filtered = filter === 'all' ? quests : quests.filter(q => q.status === filter);

  function completeQuest(q: Quest) {
    if (q.status !== 'active' && q.status !== 'available') return;
    dispatch({ type: 'COMPLETE_QUEST', questId: q.id });
    setSelected({ ...q, status: 'completed' });
  }

  function activateQuest(q: Quest) {
    if (q.status !== 'available') return;
    dispatch({ type: 'SET_QUEST_ACTIVE', questId: q.id });
    setSelected({ ...q, status: 'active' });
  }

  return (
    <div className="quests-page">
      <AtmosphereBackground variant="violet" stars={50} />

      {/* Left column — journey + filter */}
      <div className="quests-left">
        <div>
          <p className="eyebrow quests-journey-eyebrow">EVERY INSIGHT CONNECTS</p>
          <h1 className="quests-journey-title">Atlas<br />of Being</h1>
          <p className="quests-journey-desc" style={{ marginTop: '8px' }}>
            A living map of what you know, feel, and are becoming.
          </p>
          <p className="caption" style={{ color: 'var(--text-4)', marginTop: '4px' }}>
            {activeJourney?.title}
          </p>
        </div>

        {/* Radial mindmap style — progress visualization */}
        <div className="quests-orbit-map">
          <div className="quests-orbit-center">
            <span className="quests-orbit-center-label">Purpose</span>
          </div>
          {quests.slice(0, 6).map((q, i) => {
            const angle = (i / 6) * 360 - 90;
            const rad = angle * (Math.PI / 180);
            const r = 90;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            return (
              <div
                key={q.id}
                className={`quests-orbit-node quests-orbit-node--${q.status}`}
                style={{ '--ox': `${x}px`, '--oy': `${y}px` } as React.CSSProperties}
                onClick={() => setSelected(q)}
                title={q.title}
              >
                <span>{TYPE_ICONS[q.type]}</span>
              </div>
            );
          })}
          {/* Lines */}
          <svg className="quests-orbit-lines" viewBox="-150 -150 300 300">
            {quests.slice(0, 6).map((q, i) => {
              const angle = (i / 6) * 360 - 90;
              const rad = angle * (Math.PI / 180);
              const x = Math.cos(rad) * 90;
              const y = Math.sin(rad) * 90;
              return (
                <line key={q.id} x1="0" y1="0" x2={x} y2={y}
                  stroke={q.status === 'completed' ? '#34d399' : q.status === 'active' ? 'var(--purple)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth="0.8"
                />
              );
            })}
          </svg>
        </div>

        {/* Filter tabs */}
        <div className="quests-filters">
          {(['all', 'active', 'available', 'completed', 'locked'] as const).map(f => (
            <button
              key={f}
              className={`quests-filter-tab ${filter === f ? 'quests-filter-tab--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Center — quest list */}
      <div className="quests-list-col">
        {filtered.map((q, i) => (
          <div
            key={q.id}
            className={`quests-card glass ${selected?.id === q.id ? 'quests-card--selected' : ''} animate-fade-in`}
            style={{ animationDelay: `${i * 0.05}s` }}
            onClick={() => setSelected(q)}
          >
            <div className="quests-card-top">
              <span className={`pill status-${q.status}`}>{q.status}</span>
              <span className="quests-card-type">{TYPE_ICONS[q.type]} {q.type}</span>
              <span className="quests-diff" title={`Difficulty ${q.difficulty}`}>{DIFF_LABELS[q.difficulty]}</span>
            </div>
            <h3 className="quests-card-title">{q.title}</h3>
            <p className="quests-card-desc">{q.description}</p>
            {q.status === 'completed' && q.completedAt && (
              <p className="caption" style={{ marginTop: '6px' }}>
                Completed {new Date(q.completedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Right — detail panel */}
      {selected && (
        <div className="quests-detail animate-fade-in-scale">
          <div className="quests-detail-top">
            <span className={`pill status-${selected.status}`}>{selected.status}</span>
            <span className="caption">{TYPE_ICONS[selected.type]} {selected.type} quest</span>
          </div>

          <h2 className="display-md" style={{ margin: '12px 0 8px', color: 'var(--text)' }}>{selected.title}</h2>
          <p className="body">{selected.description}</p>

          <GlassPanel style={{ padding: '16px', marginTop: '16px' }}>
            <p className="heading" style={{ marginBottom: '6px' }}>WHY IT MATTERS</p>
            <p className="body">{selected.whyItMatters}</p>
          </GlassPanel>

          {/* Rewards */}
          <GlassPanel style={{ padding: '16px', marginTop: '12px' }}>
            <p className="heading" style={{ marginBottom: '10px' }}>REWARDS</p>
            <div className="quests-rewards">
              <div className="quests-reward">
                <span className="quests-reward-val">{selected.rewards.xp}</span>
                <span className="caption">XP</span>
              </div>
              <div className="quests-reward">
                <span className="quests-reward-val">+{selected.rewards.skillMastery}%</span>
                <span className="caption">MASTERY</span>
              </div>
            </div>
            {selected.rewards.skillIds.map(sid => {
              const sk = skills.find(s => s.id === sid);
              return sk ? (
                <div key={sid} className="quests-skill-pill" onClick={() => onNavigate('skillweb')}>
                  <span>⬡</span> {sk.name}
                </div>
              ) : null;
            })}
          </GlassPanel>

          {/* Actions */}
          <div className="quests-actions">
            {selected.status === 'available' && (
              <GlowButton variant="cyan" onClick={() => activateQuest(selected)}>
                ACTIVATE QUEST
              </GlowButton>
            )}
            {(selected.status === 'active' || selected.status === 'available') && (
              <GlowButton variant="purple" onClick={() => completeQuest(selected)}>
                COMPLETE QUEST ✓
              </GlowButton>
            )}
            {selected.status === 'completed' && (
              <GlowButton variant="ghost" onClick={() => onNavigate('graph')}>
                VIEW IN GRAPH →
              </GlowButton>
            )}
            {selected.status === 'locked' && (
              <p className="caption">Complete earlier quests to unlock.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
