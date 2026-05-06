import { useState, useMemo } from 'react';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  function addMemory() {
    if (!newTitle.trim() || !newBody.trim()) return;
    const memory = makeMemory(newTitle.trim(), newBody.trim(), 'journal');
    dispatch({ type: 'ADD_MEMORY', memory });
    setSelected(memory);
    setShowAddModal(false);
    setNewTitle(''); setNewBody('');
  }

  // Orbit positions for memory constellation
  const orbitItems = useMemo(() => {
    return memories.map((m, i) => {
      const angle = (i / memories.length) * 360 - 90;
      const tier  = i < 4 ? 1 : i < 8 ? 2 : 3;
      const r     = [160, 230, 290][tier - 1];
      const rad   = angle * Math.PI / 180;
      return {
        memory: m,
        x: Math.cos(rad) * r,
        y: Math.sin(rad) * r,
        tier,
      };
    });
  }, [memories]);

  return (
    <div className="exhibition-page">

      {/* ── Left column: header + nav ─────────────────────── */}
      <div className="exhibition-left">
        <div className="exhibition-brand">
          <p className="eyebrow exhibition-eyebrow">EXHIBITION OF CONSCIOUSNESS</p>
          <h1 className="display-xl exhibition-title">Memory<br />Exhibition</h1>
          <p className="exhibition-subtitle">
            記憶は、わたしを持つくり、<br />未来を開こ示す。
          </p>
          <GlowButton variant="purple" size="sm" onClick={() => setShowAddModal(true)}>
            + ENTER THE EXHIBIT
          </GlowButton>
        </div>

        {/* Memory list */}
        <div className="exhibition-memory-list">
          {memories.slice().reverse().map((m) => {
            const color = m.subtypes[0] ? SUBTYPE_COLORS[m.subtypes[0]] : 'var(--purple)';
            const icon  = m.subtypes[0] ? SUBTYPE_ICONS[m.subtypes[0]] : '▣';
            return (
              <button
                key={m.id}
                className={`exhibition-mem-row ${selected?.id === m.id ? 'exhibition-mem-row--active' : ''}`}
                style={{ '--mc': color } as React.CSSProperties}
                onClick={() => setSelected(m)}
              >
                <span className="exhibition-mem-icon" style={{ color }}>{icon}</span>
                <div className="exhibition-mem-text">
                  <p className="exhibition-mem-title">{m.title}</p>
                  <p className="caption">{new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Profile at bottom */}
        <div className="exhibition-left-footer">
          <div className="exhibition-avatar" />
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>{state.user.name}</p>
            <p className="caption">{archetype.primary}</p>
          </div>
        </div>
      </div>

      {/* ── Center: constellation + crystal ──────────────── */}
      <div className="exhibition-center">
        {/* Atmosphere */}
        <div className="exhibition-nebula" />

        <svg className="exhibition-constellation-svg" viewBox="-320 -320 640 640">
          <defs>
            <filter id="mem-node-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="crystal-glow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Orbit rings */}
          <circle cx="0" cy="0" r="160" fill="none" stroke="rgba(139,92,246,0.08)" strokeWidth="0.8" strokeDasharray="4 12" />
          <circle cx="0" cy="0" r="230" fill="none" stroke="rgba(34,211,238,0.06)" strokeWidth="0.7" strokeDasharray="3 14" />
          <circle cx="0" cy="0" r="290" fill="none" stroke="rgba(139,92,246,0.05)" strokeWidth="0.6" strokeDasharray="3 16" />

          {/* Constellation lines to selected */}
          {orbitItems.map(item => {
            const isSelected = selected?.id === item.memory.id;
            if (!isSelected) return null;
            return (
              <line key={`sel-${item.memory.id}`}
                x1="0" y1="-20" x2={item.x} y2={item.y}
                stroke="rgba(139,92,246,0.4)" strokeWidth="0.8" strokeDasharray="4 6"
              />
            );
          })}

          {/* Connection lines between adjacent nodes */}
          {orbitItems.map((item, i) => {
            const next = orbitItems[i + 1];
            if (!next || item.tier !== next.tier) return null;
            return (
              <line key={`c${i}`}
                x1={item.x} y1={item.y} x2={next.x} y2={next.y}
                stroke="rgba(255,255,255,0.04)" strokeWidth="0.6"
              />
            );
          })}

          {/* Memory nodes */}
          {orbitItems.map(item => {
            const { memory, x, y } = item;
            const color = memory.subtypes[0] ? SUBTYPE_COLORS[memory.subtypes[0]] : '#8b5cf6';
            const isSel = selected?.id === memory.id;
            const r     = isSel ? 9 : 5.5;
            return (
              <g key={memory.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(memory)}>
                {isSel && (
                  <circle cx={x} cy={y} r={18}
                    fill={`${color}10`} stroke={color} strokeWidth="0.8" strokeDasharray="3 4" opacity="0.7"
                    style={{ animation: 'spin-slow 8s linear infinite', transformOrigin: `${x}px ${y}px` }}
                  />
                )}
                <circle cx={x} cy={y} r={r}
                  fill={`${color}${isSel ? '28' : '14'}`}
                  stroke={color} strokeWidth={isSel ? 1.5 : 0.9}
                  filter={isSel ? 'url(#mem-node-glow)' : undefined}
                />
                <circle cx={x} cy={y} r="2" fill={color} opacity={isSel ? 0.9 : 0.55} />
                <text x={x} y={y + r + 12} textAnchor="middle"
                  fill={isSel ? color : 'rgba(160,160,200,0.55)'}
                  fontSize="8.5" fontFamily="var(--font-sans)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {memory.title.slice(0, 16)}
                </text>
              </g>
            );
          })}

          {/* Center crystal object */}
          <g filter="url(#crystal-glow)">
            {/* Outer hexagon ring */}
            <polygon points="0,-58 50,-29 50,29 0,58 -50,29 -50,-29"
              fill="rgba(30,10,70,0.08)" stroke="rgba(139,92,246,0.45)" strokeWidth="1.2" />
            {/* Inner thin hexagon */}
            <polygon points="0,-42 36,-21 36,21 0,42 -36,21 -36,-21"
              fill="rgba(20,5,50,0.06)" stroke="rgba(139,92,246,0.28)" strokeWidth="0.8" />
            {/* Crystal vertical lines */}
            <line x1="0" y1="-58" x2="0" y2="-8" stroke="rgba(139,92,246,0.5)" strokeWidth="1" />
            <line x1="0" y1="8" x2="0" y2="58" stroke="rgba(139,92,246,0.5)" strokeWidth="1" />
            {/* Cross */}
            <line x1="-42" y1="0" x2="42" y2="0" stroke="rgba(139,92,246,0.25)" strokeWidth="0.7" />
            {/* Center core */}
            <circle cx="0" cy="0" r="10" fill="rgba(139,92,246,0.25)" stroke="rgba(180,140,255,0.7)" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="4" fill="rgba(200,180,255,0.85)" />
            <circle cx="0" cy="0" r="2" fill="white" opacity="0.9" />
          </g>
        </svg>

        {/* Bottom stats */}
        <div className="exhibition-stats">
          <div className="exhibition-stat">
            <span className="exhibition-stat-val">{memories.length}</span>
            <span className="caption">MEMORIES</span>
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
            <span className="caption">TROPHIES</span>
          </div>
        </div>
      </div>

      {/* ── Right: featured exhibit ─────────────────────── */}
      {selected && (
        <div className="exhibition-right animate-fade-in-scale" key={selected.id}>
          <div className="exhibition-featured-top">
            <span className="exhibition-featured-glyph">
              {selected.subtypes[0] ? SUBTYPE_ICONS[selected.subtypes[0]] : '▣'}
            </span>
            <p className="eyebrow" style={{ color: 'rgba(180,150,255,0.5)', marginBottom: '10px' }}>FEATURED EXHIBIT</p>
          </div>

          <h2 className="exhibition-featured-title">{selected.title}</h2>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {selected.subtypes.map(s => (
              <span key={s} className="pill" style={{
                background: `${SUBTYPE_COLORS[s]}16`,
                color: SUBTYPE_COLORS[s],
                border: `1px solid ${SUBTYPE_COLORS[s]}40`
              }}>
                {SUBTYPE_ICONS[s]} {s}
              </span>
            ))}
          </div>

          <p className="body exhibition-featured-body">{selected.body}</p>

          {selected.emotionalTone && (
            <p className="caption" style={{ marginBottom: '16px' }}>
              Tone: <span style={{ color: 'var(--text-2)' }}>{selected.emotionalTone}</span>
            </p>
          )}

          <GlassPanel style={{ padding: '14px', marginBottom: '14px' }}>
            <p className="eyebrow" style={{ marginBottom: '6px', color: 'var(--text-3)' }}>EFFECT ON ARCHETYPE</p>
            <p className="caption">
              Contributes evidence for{' '}
              <strong style={{ color: 'var(--purple)' }}>{archetype.primary}</strong>
            </p>
          </GlassPanel>

          <p className="caption" style={{ color: 'var(--text-4)', marginBottom: '14px' }}>
            {new Date(selected.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

          <p className="body exhibition-quote">
            "We do not remember to escape.<br />We remember to become."
          </p>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="exhibition-modal-overlay" onClick={() => setShowAddModal(false)}>
          <GlassPanel
            variant="raised"
            style={{ padding: '28px', width: '460px', borderRadius: 'var(--radius-xl)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="heading" style={{ marginBottom: '14px' }}>NEW MEMORY</p>
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
