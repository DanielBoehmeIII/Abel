import { useState } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, MemoryItem, MemorySubtype } from '../types/abel';
import { makeMemory } from '../state/abelStore';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import './ExhibitionPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const SUBTYPE_COLORS: Record<MemorySubtype, string> = {
  clarity: '#00d4ff', discipline: '#7c4dff', curiosity: '#f5c518',
  avoidance: '#6b6b8a', breakthrough: '#e879a0', connection: '#34d399',
  grief: '#8b8bab', confidence: '#fb923c', creativity: '#a78bfa',
  flow: '#00d4ff', fear: '#ef4444', resilience: '#34d399',
};

const SUBTYPE_ICONS: Record<MemorySubtype, string> = {
  clarity: '◇', discipline: '⊕', curiosity: '◌', avoidance: '✕',
  breakthrough: '★', connection: '◈', grief: '☽', confidence: '◉',
  creativity: '⬡', flow: '∿', fear: '△', resilience: '↺',
};

export default function ExhibitionPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { memories, trophies, archetype } = state;

  const [selected, setSelected] = useState<MemoryItem | null>(memories[memories.length - 1] ?? null);
  const [filterSubtype, setFilterSubtype] = useState<MemorySubtype | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  const filtered = filterSubtype === 'all'
    ? memories
    : memories.filter(m => m.subtypes.includes(filterSubtype));

  const allSubtypes = Array.from(new Set(memories.flatMap(m => m.subtypes)));

  function addMemory() {
    if (!newTitle.trim() || !newBody.trim()) return;
    const memory = makeMemory(newTitle.trim(), newBody.trim(), 'journal');
    dispatch({ type: 'ADD_MEMORY', memory });
    setSelected(memory);
    setShowAddModal(false);
    setNewTitle(''); setNewBody('');
  }

  return (
    <div className="exhibition-page">
      <div className="exhibition-bg" />

      {/* Header */}
      <div className="exhibition-header">
        <div>
          <p className="heading" style={{ marginBottom: '6px' }}>EXHIBITION OF CONSCIOUSNESS</p>
          <h1 className="display-xl exhibition-title">Memory<br />Exhibition</h1>
          <p className="exhibition-subtitle">
            記憶は、わたしを持つくり、未来を開こ示す。
          </p>
          <GlowButton variant="purple" style={{ marginTop: '16px' }} onClick={() => setShowAddModal(true)}>
            + ENTER THE EXHIBIT
          </GlowButton>
        </div>

        {/* Constellation */}
        <div className="exhibition-constellation">
          <svg className="exhibition-star-svg" viewBox="0 0 400 300">
            <defs>
              <filter id="mem-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Connection lines between nearby memories */}
            {filtered.map((m, i) => {
              const next = filtered[i + 1];
              if (!next) return null;
              const x1 = 40 + (i % 5) * 72;
              const y1 = 40 + Math.floor(i / 5) * 90 + (i % 2) * 30;
              const x2 = 40 + ((i+1) % 5) * 72;
              const y2 = 40 + Math.floor((i+1) / 5) * 90 + ((i+1) % 2) * 30;
              return (
                <line key={`l${m.id}`} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
              );
            })}

            {filtered.map((m, i) => {
              const x = 40 + (i % 5) * 72;
              const y = 40 + Math.floor(i / 5) * 90 + (i % 2) * 30;
              const color = m.subtypes[0] ? SUBTYPE_COLORS[m.subtypes[0]] : 'var(--purple)';
              const isSelected = selected?.id === m.id;
              return (
                <g key={m.id} onClick={() => setSelected(m)} style={{ cursor: 'pointer' }}>
                  <circle cx={x} cy={y} r={isSelected ? 10 : 6}
                    fill={`${color}22`} stroke={color}
                    strokeWidth={isSelected ? 2 : 1}
                    filter={isSelected ? 'url(#mem-glow)' : undefined}
                  />
                  <circle cx={x} cy={y} r={2} fill={color} />
                  <text x={x} y={y + 18} textAnchor="middle"
                    fill="rgba(160,160,200,0.6)" fontSize="9"
                    fontFamily="var(--font-sans)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {m.title.slice(0, 14)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Body */}
      <div className="exhibition-body">
        {/* Left — filter + list */}
        <div className="exhibition-list-col">
          <div className="exhibition-subtypes">
            <button
              className={`exhibition-subtype-btn ${filterSubtype === 'all' ? 'exhibition-subtype-btn--active' : ''}`}
              onClick={() => setFilterSubtype('all')}
            >All</button>
            {allSubtypes.map(s => (
              <button
                key={s}
                className={`exhibition-subtype-btn ${filterSubtype === s ? 'exhibition-subtype-btn--active' : ''}`}
                style={{ color: SUBTYPE_COLORS[s] }}
                onClick={() => setFilterSubtype(s === filterSubtype ? 'all' : s)}
              >
                {SUBTYPE_ICONS[s]} {s}
              </button>
            ))}
          </div>

          <div className="exhibition-memory-list">
            {filtered.map((m, i) => (
              <div
                key={m.id}
                className={`exhibition-memory-item glass ${selected?.id === m.id ? 'exhibition-memory-item--active' : ''} animate-fade-in`}
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => setSelected(m)}
              >
                <div className="exhibition-memory-top">
                  <h4 className="exhibition-memory-title">{m.title}</h4>
                  <span className="caption">{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="exhibition-memory-body">{m.body.slice(0, 100)}…</p>
                <div className="exhibition-memory-tags">
                  {m.subtypes.map(s => (
                    <span key={s} className="pill" style={{ background: `${SUBTYPE_COLORS[s]}18`, color: SUBTYPE_COLORS[s], border: `1px solid ${SUBTYPE_COLORS[s]}44` }}>
                      {SUBTYPE_ICONS[s]} {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — featured exhibit */}
        {selected && (
          <div className="exhibition-featured animate-fade-in-scale">
            <GlassPanel variant="raised" style={{ padding: '28px', height: '100%' }}>
              <p className="heading" style={{ marginBottom: '12px' }}>FEATURED EXHIBIT</p>
              <h2 className="display-md" style={{ color: 'var(--text)', marginBottom: '6px' }}>
                {selected.title}
              </h2>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {selected.subtypes.map(s => (
                  <span key={s} className="pill" style={{
                    background: `${SUBTYPE_COLORS[s]}18`,
                    color: SUBTYPE_COLORS[s],
                    border: `1px solid ${SUBTYPE_COLORS[s]}44`
                  }}>
                    {SUBTYPE_ICONS[s]} {s}
                  </span>
                ))}
                <span className="pill rarity-common">{selected.source}</span>
              </div>

              {selected.emotionalTone && (
                <p className="caption" style={{ marginBottom: '12px' }}>
                  Tone: <span style={{ color: 'var(--text-2)' }}>{selected.emotionalTone}</span>
                </p>
              )}

              <p className="body" style={{ lineHeight: 1.8, marginBottom: '20px' }}>
                {selected.body}
              </p>

              <div className="exhibition-featured-footer">
                <p className="caption">
                  {new Date(selected.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                {selected.relatedTrophyIds.length > 0 && (
                  <GlowButton variant="gold" size="sm" onClick={() => onNavigate('trophies')}>
                    View Trophy
                  </GlowButton>
                )}
                {selected.relatedGraphNodeIds.length > 0 && (
                  <GlowButton variant="cyan" size="sm" onClick={() => onNavigate('graph')}>
                    View in Graph
                  </GlowButton>
                )}
              </div>

              {/* Archetype effect */}
              <GlassPanel style={{ padding: '14px', marginTop: '16px' }}>
                <p className="heading" style={{ marginBottom: '6px' }}>EFFECT ON ARCHETYPE</p>
                <p className="caption">
                  Contributes evidence for <strong style={{ color: 'var(--purple)' }}>{archetype.primary}</strong>
                </p>
              </GlassPanel>
            </GlassPanel>
          </div>
        )}
      </div>

      {/* Bottom stats */}
      <div className="exhibition-stats glass">
        <div className="exhibition-stat">
          <span className="exhibition-stat-val">{memories.length}</span>
          <span className="caption">MEMORIES CAPTURED</span>
        </div>
        <div className="exhibition-stat">
          <span className="exhibition-stat-val">{memories.filter(m => m.subtypes.includes('breakthrough')).length}</span>
          <span className="caption">BREAKTHROUGHS</span>
        </div>
        <div className="exhibition-stat">
          <span className="exhibition-stat-val">{memories.filter(m => m.subtypes.includes('flow')).length}</span>
          <span className="caption">FLOW MOMENTS</span>
        </div>
        <div className="exhibition-stat">
          <span className="exhibition-stat-val">{trophies.length}</span>
          <span className="caption">TROPHIES LINKED</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <p className="body" style={{ fontStyle: 'italic', color: 'var(--text-3)' }}>
            "We do not remember to escape. We remember to become."
          </p>
        </div>
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div className="exhibition-modal-overlay" onClick={() => setShowAddModal(false)}>
          <GlassPanel
            variant="raised"
            style={{ padding: '28px', width: '480px', borderRadius: 'var(--radius-xl)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="heading" style={{ marginBottom: '12px' }}>NEW MEMORY</p>
            <input
              className="exhibition-input"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Title"
            />
            <textarea
              className="exhibition-input"
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              placeholder="Write your memory…"
              rows={5}
              style={{ marginTop: '10px', resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <GlowButton variant="purple" onClick={addMemory}>SAVE MEMORY</GlowButton>
              <GlowButton variant="ghost" onClick={() => setShowAddModal(false)}>CANCEL</GlowButton>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
