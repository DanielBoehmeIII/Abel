import { useState } from 'react';
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

        {/* Orbital quest map */}
        <div className="quests-orbit-wrap">
          <svg className="quests-orbit-svg" viewBox="-130 -130 260 260">
            <defs>
              <radialGradient id="q-hub-grad" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="rgba(245,197,24,0.3)" />
                <stop offset="100%" stopColor="rgba(8,8,18,0.98)" />
              </radialGradient>
            </defs>

            {/* Decorative + orbit rings */}
            <circle cx="0" cy="0" r="122" fill="none"
              stroke="rgba(139,92,246,0.04)" strokeWidth="1" />
            <circle cx="0" cy="0" r="100" fill="none"
              stroke="rgba(139,92,246,0.15)" strokeWidth="0.7"
              strokeDasharray="4 10" />
            <circle cx="0" cy="0" r="50" fill="none"
              stroke="rgba(245,197,24,0.1)" strokeWidth="0.7" />

            {/* Spokes */}
            {quests.map((q, i) => {
              const angle = (i / quests.length) * 360 - 90;
              const rad   = angle * (Math.PI / 180);
              const x = Math.cos(rad) * 100;
              const y = Math.sin(rad) * 100;
              const isSel = selected?.id === q.id;
              return (
                <line key={`sp-${q.id}`}
                  x1="0" y1="0" x2={x} y2={y}
                  stroke={
                    isSel              ? 'rgba(139,92,246,0.55)' :
                    q.status === 'completed' ? 'rgba(52,211,153,0.22)' :
                    q.status === 'active'    ? 'rgba(139,92,246,0.28)' :
                    'rgba(255,255,255,0.04)'
                  }
                  strokeWidth={isSel ? '1.3' : '0.5'}
                  strokeDasharray={isSel ? '3 5' : '2 9'}
                  style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
                />
              );
            })}

            {/* Quest nodes */}
            {quests.map((q, i) => {
              const angle = (i / quests.length) * 360 - 90;
              const rad   = angle * (Math.PI / 180);
              const x = Math.cos(rad) * 100;
              const y = Math.sin(rad) * 100;
              const isSel   = selected?.id === q.id;
              const isLocked = q.status === 'locked';
              const nc =
                q.status === 'completed' ? '#34d399' :
                q.status === 'active'    ? '#a78bfa' :
                q.status === 'available' ? '#22d3ee' :
                'rgba(200,200,220,0.18)';
              return (
                <g key={`nd-${q.id}`} style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(q)}>
                  {isSel && (
                    <circle cx={x} cy={y} r="22" fill="none"
                      stroke="rgba(139,92,246,0.38)"
                      strokeWidth="0.8" strokeDasharray="3 4" />
                  )}
                  {q.status === 'active' && (
                    <circle cx={x} cy={y} r="18" fill="none"
                      stroke="rgba(167,139,250,0.3)"
                      strokeWidth="1"
                      className="quests-node-pulse" />
                  )}
                  <circle cx={x} cy={y} r="13"
                    fill="rgba(8,8,20,0.92)"
                    stroke={nc}
                    strokeWidth={isSel ? '1.6' : '0.8'}
                    opacity={isLocked ? 0.25 : 1}
                    style={{ transition: 'stroke-width 0.3s' }}
                  />
                  <text x={x} y={y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize="9" fill={nc}
                    fontFamily="var(--font-sans)"
                    opacity={isLocked ? 0.25 : 0.95}
                    style={{ pointerEvents: 'none' }}>
                    {TYPE_ICONS[q.type]}
                  </text>
                </g>
              );
            })}

            {/* Center hub */}
            <circle cx="0" cy="0" r="32"
              fill="url(#q-hub-grad)"
              stroke="rgba(245,197,24,0.45)" strokeWidth="1" />
            <text x="0" y="-6" textAnchor="middle"
              fontSize="6.5" fontWeight="700" letterSpacing="0.1em"
              fill="rgba(245,197,24,0.85)"
              fontFamily="var(--font-sans)">
              ATLAS
            </text>
            <text x="0" y="7" textAnchor="middle"
              fontSize="5.5" letterSpacing="0.05em"
              fill="rgba(200,175,255,0.5)"
              fontFamily="var(--font-sans)">
              {quests.filter(q => q.status === 'completed').length}/{quests.length}
            </text>
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
