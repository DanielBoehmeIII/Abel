import { useState } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, SkillNode } from '../types/abel';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import './SkillwebPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const MILESTONES = [20, 40, 60, 80, 100] as const;
const CATEGORY_COLORS: Record<string, string> = {
  'Systems Thinking': '#00d4ff',
  'Emotional Clarity': '#e879a0',
  'Creativity': '#f5c518',
  'Technical Skill': '#34d399',
  'Discipline': '#7c4dff',
  'Learning': '#a78bfa',
};

function MasteryRing({ mastery, color }: { mastery: number; color: string }) {
  const R = 32; const circ = 2 * Math.PI * R;
  const dash = circ * (1 - mastery / 100);
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
      <circle
        cx="40" cy="40" r={R} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round" transform="rotate(-90 40 40)"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="40" y="40" textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="13" fontWeight="600" fontFamily="var(--font-sans)"
      >{mastery}%</text>
    </svg>
  );
}

export default function SkillwebPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { skills, eggs, quests } = state;

  const [selected, setSelected] = useState<SkillNode | null>(skills[0]);
  const [showBoost, setShowBoost] = useState(false);
  const selectedQuests = quests.filter(q => selected && q.linkedSkillIds.includes(selected.id));

  function boostSkill(skillId: string, amount: number) {
    dispatch({ type: 'INCREASE_SKILL', skillId, amount });
    setShowBoost(false);
  }

  return (
    <div className="skillweb-page">
      <div className="skillweb-bg" />

      {/* Header */}
      <div className="skillweb-header">
        <div>
          <p className="heading">EVERY INSIGHT CONNECTS. EVERY CONNECTION TRANSFORMS.</p>
          <h1 className="display-xl skillweb-title">KNOWLEDGE<br />GRAPH</h1>
        </div>
        <div className="skillweb-header-stats">
          <div className="skillweb-stat">
            <span className="skillweb-stat-val">{skills.length}</span>
            <span className="caption">ACTIVE SKILLS</span>
          </div>
          <div className="skillweb-stat">
            <span className="skillweb-stat-val">+{Math.round(Math.max(...skills.map(s => s.mastery)) - Math.min(...skills.map(s => s.mastery)))}%</span>
            <span className="caption">RANGE</span>
          </div>
        </div>
      </div>

      <div className="skillweb-body">
        {/* Web SVG */}
        <div className="skillweb-canvas-wrap">
          <svg className="skillweb-canvas" viewBox="0 80 800 460">
            <defs>
              <filter id="skill-glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Connections */}
            {skills.map(skill =>
              skill.unlockedBy.map(parentId => {
                const parent = skills.find(s => s.id === parentId);
                if (!parent) return null;
                return (
                  <line key={`${parentId}-${skill.id}`}
                    x1={parent.x} y1={parent.y} x2={skill.x} y2={skill.y}
                    stroke="rgba(124,77,255,0.2)" strokeWidth="1"
                    strokeDasharray={skill.mastery < 20 ? '4 4' : '0'}
                  />
                );
              })
            )}

            {/* Nodes */}
            {skills.map(skill => {
              const color = CATEGORY_COLORS[skill.category] ?? 'var(--purple)';
              const isSelected = selected?.id === skill.id;
              const r = 18 + (skill.mastery / 100) * 16;

              return (
                <g key={skill.id} onClick={() => setSelected(skill)} style={{ cursor: 'pointer' }}>
                  {/* Glow ring for selected */}
                  {isSelected && (
                    <circle cx={skill.x} cy={skill.y} r={r + 14}
                      fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"
                      strokeDasharray="3 3"
                      style={{ animation: 'spin-slow 8s linear infinite' }}
                    />
                  )}

                  {/* Milestone rings */}
                  {MILESTONES.map(m => {
                    const hasEgg = eggs.find(e => e.skillId === skill.id && e.milestone === m);
                    if (!hasEgg) return null;
                    const ringR = r + 6 + (MILESTONES.indexOf(m)) * 4;
                    return (
                      <circle key={m} cx={skill.x} cy={skill.y} r={ringR}
                        fill="none"
                        stroke={hasEgg.state === 'hatched' ? '#34d399' : color}
                        strokeWidth="0.8" opacity={hasEgg.state === 'hatched' ? 0.6 : 0.25}
                        strokeDasharray={`${(m / 100) * 2 * Math.PI * ringR} 999`}
                      />
                    );
                  })}

                  {/* Main node */}
                  <circle cx={skill.x} cy={skill.y} r={r}
                    fill={`${color}18`} stroke={color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter={isSelected ? 'url(#skill-glow)' : undefined}
                  />

                  {/* Mastery fill */}
                  <circle cx={skill.x} cy={skill.y} r={r - 4}
                    fill="none" stroke={color} strokeWidth="3"
                    strokeDasharray={`${(skill.mastery / 100) * 2 * Math.PI * (r - 4)} 999`}
                    strokeLinecap="round" opacity="0.5"
                    transform={`rotate(-90 ${skill.x} ${skill.y})`}
                  />

                  <text x={skill.x} y={skill.y} textAnchor="middle" dominantBaseline="central"
                    fill={isSelected ? color : 'rgba(220,220,240,0.85)'}
                    fontSize="9" fontFamily="var(--font-sans)" fontWeight="600"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {skill.mastery}%
                  </text>

                  <text x={skill.x} y={skill.y + r + 16}
                    textAnchor="middle"
                    fill={isSelected ? color : 'rgba(160,160,200,0.7)'}
                    fontSize="10" fontFamily="var(--font-sans)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {skill.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail sidebar */}
        {selected && (
          <div className="skillweb-detail animate-fade-in-scale">
            <div className="skillweb-detail-top">
              <MasteryRing
                mastery={selected.mastery}
                color={CATEGORY_COLORS[selected.category] ?? 'var(--purple)'}
              />
              <div>
                <p className="heading">{selected.category}</p>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: '4px 0 6px' }}>
                  {selected.name}
                </h3>
              </div>
            </div>

            <p className="body" style={{ marginBottom: '16px' }}>{selected.description}</p>

            {/* Milestones */}
            <GlassPanel style={{ padding: '14px', marginBottom: '12px' }}>
              <p className="heading" style={{ marginBottom: '10px' }}>MILESTONES</p>
              {MILESTONES.map(m => {
                const egg = eggs.find(e => e.skillId === selected.id && e.milestone === m);
                const reached = selected.mastery >= m;
                return (
                  <div key={m} className="skillweb-milestone">
                    <div className={`skillweb-milestone-dot ${reached ? 'skillweb-milestone-dot--reached' : ''}`} />
                    <span className="caption" style={{ flex: 1 }}>{m}% Mastery</span>
                    {egg ? (
                      <span
                        className={`pill ${egg.state === 'hatched' ? 'status-completed' : 'status-available'}`}
                        style={{ cursor: egg.state === 'earned' ? 'pointer' : 'default' }}
                        onClick={() => egg.state === 'earned' && onNavigate('egg-hatch')}
                      >
                        {egg.state === 'hatched' ? '✓ hatched' : egg.state === 'earned' ? '◌ hatch' : egg.state}
                      </span>
                    ) : reached ? (
                      <span className="caption">—</span>
                    ) : (
                      <span className="caption" style={{ color: 'var(--text-4)' }}>locked</span>
                    )}
                  </div>
                );
              })}
            </GlassPanel>

            {/* Linked quests */}
            {selectedQuests.length > 0 && (
              <GlassPanel style={{ padding: '14px', marginBottom: '12px' }}>
                <p className="heading" style={{ marginBottom: '8px' }}>LINKED QUESTS</p>
                {selectedQuests.map(q => (
                  <div key={q.id} className="skillweb-quest-item" onClick={() => onNavigate('quests')}>
                    <span className={`pill status-${q.status}`}>{q.status}</span>
                    <span className="caption" style={{ flex: 1, marginLeft: '8px' }}>{q.title}</span>
                  </div>
                ))}
              </GlassPanel>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <GlowButton
                variant="purple"
                size="sm"
                onClick={() => setShowBoost(true)}
              >
                + Boost Mastery
              </GlowButton>
              <GlowButton variant="ghost" size="sm" onClick={() => onNavigate('egg-hatch')}>
                View Eggs →
              </GlowButton>
            </div>

            {showBoost && (
              <GlassPanel style={{ padding: '14px', marginTop: '12px' }}>
                <p className="caption" style={{ marginBottom: '10px' }}>Boost by how much?</p>
                {[5, 10, 15, 20].map(amt => (
                  <GlowButton
                    key={amt}
                    variant="cyan"
                    size="sm"
                    style={{ marginRight: '6px', marginBottom: '6px' }}
                    onClick={() => boostSkill(selected.id, amt)}
                  >
                    +{amt}%
                  </GlowButton>
                ))}
                <GlowButton variant="ghost" size="sm" onClick={() => setShowBoost(false)}>Cancel</GlowButton>
              </GlassPanel>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="skillweb-bottom glass">
        <div className="skillweb-bottom-skills">
          {skills.map(s => (
            <div key={s.id} className="skillweb-bottom-skill" onClick={() => setSelected(s)}>
              <span className="skillweb-bottom-name">{s.name}</span>
              <div className="skillweb-bottom-bar">
                <div
                  className="skillweb-bottom-fill"
                  style={{
                    width: `${s.mastery}%`,
                    background: CATEGORY_COLORS[s.category] ?? 'var(--purple)',
                  }}
                />
              </div>
              <span className="caption">{s.mastery}%</span>
            </div>
          ))}
        </div>
        <p className="caption">Ask your graph anything.</p>
      </div>
    </div>
  );
}
