import { useCallback, useMemo, useRef } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId } from '../types/abel';
import ArtifactScene from '../components/3d/ArtifactScene';
import MainToTrophyCinematic from '../components/abel/MainToTrophyCinematic';
import './MainPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const PORTAL_NODES: Array<{ id: PageId; label: string; glyph: string; angle: number }> = [
  { id: 'archive',    label: 'Archive',    glyph: '◈', angle: 30  },
  { id: 'quests',     label: 'Quests',     glyph: '⊕', angle: 90  },
  { id: 'graph',      label: 'Graph',      glyph: '◇', angle: 150 },
  { id: 'exhibition', label: 'Exhibition', glyph: '▣', angle: 210 },
  { id: 'focus',      label: 'Focus',      glyph: '⬡', angle: 270 },
  { id: 'skillweb',   label: 'Skills',     glyph: '⟁', angle: 330 },
];


function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * (Math.PI / 180);
    return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');
}

export default function MainPage({ onNavigate }: Props) {
  const { state } = useAbel();
  const { user, quests, skills, memories, recentActivity, graph, archetype, trophies } = state;

  const pageRef = useRef<HTMLDivElement>(null);

  const handleTransitionProgress = useCallback((p: number) => {
    if (!pageRef.current) return;
    pageRef.current.style.setProperty('--transition-progress', String(p));
    pageRef.current.classList.toggle('main-page--in-transition', p > 0.18);
  }, []);

  const activeQuest    = quests.find(q => q.status === 'active') ?? quests.find(q => q.status === 'available');
  const recentMemory   = memories[memories.length - 1];
  const totalMastery   = useMemo(() => {
    const sum = skills.reduce((s, sk) => s + sk.mastery, 0);
    return skills.length ? Math.round(sum / skills.length) : 0;
  }, [skills]);
  const completedCount = quests.filter(q => q.status === 'completed').length;

  return (
    <div ref={pageRef} className="main-page">
      <MainToTrophyCinematic
        onProgress={handleTransitionProgress}
        onNavigate={onNavigate}
        trophyCount={trophies.length}
      >

      {/* Three.js scene — right-side backdrop (transparent canvas, floats over video) */}
      <ArtifactScene className="main-scene" />

      {/* Gradient veil: blends scene into bg */}
      <div className="main-veil" />

      {/* ── Portal orbital ring — always-visible scene layer ── */}
      <div className="main-portal" aria-hidden="true">
        <svg className="main-portal-svg" viewBox="-230 -230 460 460">
          <defs>
            <radialGradient id="main-hub-glow" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="rgba(180,140,255,0.22)" />
              <stop offset="100%" stopColor="rgba(8,8,22,0.55)" />
            </radialGradient>
          </defs>

          {/* Atmosphere ring */}
          <circle cx="0" cy="0" r="215" fill="none"
            stroke="rgba(139,92,246,0.05)" strokeWidth="1" />

          {/* Main orbit — dashed, slow rotation */}
          <circle cx="0" cy="0" r="175" fill="none"
            stroke="rgba(139,92,246,0.14)" strokeWidth="0.8"
            strokeDasharray="5 14"
            style={{ animation: 'spin-slow 110s linear infinite', transformOrigin: 'center' }} />

          {/* Inner accent ring */}
          <circle cx="0" cy="0" r="108" fill="none"
            stroke="rgba(34,211,238,0.05)" strokeWidth="0.6" />

          {/* Hub boundary */}
          <circle cx="0" cy="0" r="60" fill="none"
            stroke="rgba(139,92,246,0.1)" strokeWidth="0.8" />

          {/* Sweeping arc highlight */}
          <circle cx="0" cy="0" r="175" fill="none"
            stroke="rgba(34,211,238,0.22)" strokeWidth="1.5"
            strokeDasharray="28 1100"
            style={{ animation: 'spin-slow 20s linear infinite', transformOrigin: 'center' }} />

          {/* Spokes */}
          {PORTAL_NODES.map(node => {
            const rad = (node.angle - 90) * (Math.PI / 180);
            return (
              <line key={`sp-${node.id}`}
                x1="0" y1="0"
                x2={(Math.cos(rad) * 175).toFixed(2)}
                y2={(Math.sin(rad) * 175).toFixed(2)}
                stroke="rgba(139,92,246,0.07)"
                strokeWidth="0.5" strokeDasharray="2 10" />
            );
          })}

          {/* Nav nodes */}
          {PORTAL_NODES.map(node => {
            const rad = (node.angle - 90) * (Math.PI / 180);
            const x = +(Math.cos(rad) * 175).toFixed(2);
            const y = +(Math.sin(rad) * 175).toFixed(2);
            return (
              <g key={node.id}
                className="portal-node-g"
                onClick={() => onNavigate(node.id)}>
                <circle cx={x} cy={y} r="24" fill="rgba(8,8,22,0.0)" />
                <polygon
                  className="portal-node-hex"
                  points={hexPoints(x, y, 13)}
                  fill="rgba(8,8,22,0.88)"
                  stroke="rgba(139,92,246,0.32)"
                  strokeWidth="0.8"
                />
                <text x={x} y={y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="9.5" fill="rgba(180,155,255,0.72)"
                  fontFamily="var(--font-sans)"
                  style={{ pointerEvents: 'none' }}>
                  {node.glyph}
                </text>
                <text x={x} y={y + 26}
                  textAnchor="middle"
                  fontSize="5.5" fill="rgba(150,125,200,0.42)"
                  fontFamily="var(--font-sans)"
                  letterSpacing="0.12em"
                  style={{ pointerEvents: 'none' }}>
                  {node.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Hub */}
          <circle cx="0" cy="0" r="52"
            fill="url(#main-hub-glow)"
            stroke="rgba(139,92,246,0.28)" strokeWidth="1" />
          <circle cx="0" cy="0" r="52" fill="none"
            stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
          <text x="0" y="-5"
            textAnchor="middle" dominantBaseline="central"
            fontSize="8" fontWeight="700" letterSpacing="0.22em"
            fill="rgba(200,175,255,0.62)"
            fontFamily="var(--font-sans)">
            ABEL
          </text>
          <text x="0" y="8"
            textAnchor="middle"
            fontSize="5.5" letterSpacing="0.28em"
            fill="rgba(150,125,200,0.32)"
            fontFamily="var(--font-sans)">
            OS
          </text>
        </svg>
      </div>

      {/* ── Header ── */}
      <header className="main-header">
        <div className="main-logo-wrap">
          <div className="main-logo-mark" />
          <span className="main-logo">ABEL</span>
        </div>

        <nav className="main-nav-strip">
          {(['archive', 'memory', 'graph', 'settings'] as PageId[]).map(id => (
            <button key={id} className="main-nav-item" onClick={() => onNavigate(id)}>
              {id === 'archive' ? 'CHAT' : id.toUpperCase()}
            </button>
          ))}
        </nav>

      </header>

      {/* ── Hero text — left ── */}
      <main className="main-hero">
        <p className="eyebrow main-eyebrow animate-fade-in">ABEL OS</p>
        <h1 className="main-hero-title animate-fade-in" style={{ animationDelay: '0.06s' }}>
          A living system<br />
          that remembers,<br />
          <em className="main-hero-em">dreams,</em><br />
          and becomes.
        </h1>
        <button
          className="main-cta animate-fade-in"
          style={{ animationDelay: '0.15s' }}
          onClick={() => onNavigate('archive')}
        >
          <span>START A CHAT</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="main-quick-path animate-fade-in" style={{ animationDelay: '0.21s' }}>
          <button onClick={() => onNavigate('memory')}>Import memory</button>
          <span />
          <button onClick={() => onNavigate('graph')}>View atlas</button>
          <span />
          <button onClick={() => onNavigate('settings')}>Tune Abel</button>
        </div>
      </main>

      {/* ── Right instrument panels ── */}
      <aside className="main-info-right">
        <div
          className="main-widget main-widget--link animate-fade-in"
          style={{ animationDelay: '0.22s' }}
          onClick={() => onNavigate('skillweb')}
        >
          <div className="main-widget-header">
            <p className="main-widget-eye">SYSTEM STATUS</p>
            <span className="main-widget-dot" />
          </div>
          <p className="main-widget-value">HARMONIC</p>
          <div className="main-widget-wave">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="main-wave-bar" style={{
                height: `${8 + Math.sin(i * 0.9) * 7 + Math.abs(Math.sin(i * 1.5)) * 5}px`,
                animationDelay: `${i * 0.09}s`,
              }} />
            ))}
          </div>
          {archetype.primary && (
            <p className="main-widget-archetype">{archetype.primary}</p>
          )}
          <span className="main-widget-nav">VIEW →</span>
        </div>

        {recentMemory && (
          <div
            className="main-widget main-widget--link animate-fade-in"
            style={{ animationDelay: '0.32s' }}
            onClick={() => onNavigate('exhibition')}
          >
            <div className="main-widget-header">
              <p className="main-widget-eye">RECENT MEMORY</p>
              <span className="main-widget-glyph">▣</span>
            </div>
            <p className="main-widget-title">{recentMemory.title}</p>
            <p className="main-widget-sub">{recentMemory.body.slice(0, 68)}…</p>
            <span className="main-widget-nav">VIEW →</span>
          </div>
        )}

        {activeQuest && (
          <div
            className="main-widget main-widget--link animate-fade-in"
            style={{ animationDelay: '0.42s' }}
            onClick={() => onNavigate('quests')}
          >
            <div className="main-widget-header">
              <p className="main-widget-eye">ACTIVE QUEST</p>
              <span className="main-widget-glyph">⊕</span>
            </div>
            <p className="main-widget-title">{activeQuest.title}</p>
            <p className="main-widget-sub">{activeQuest.description.slice(0, 62)}…</p>
            <span className="main-widget-nav">VIEW →</span>
          </div>
        )}
      </aside>

      {/* ── Footer — instrument row ── */}
      <footer className="main-footer">
        <div className="main-profile">
          <div className="main-avatar">
            <span>{user.name.charAt(0)}</span>
          </div>
          <div>
            <p className="main-profile-name">{user.name}</p>
            <p className="caption">{user.title}</p>
          </div>
        </div>

        <div className="main-stats">
          {[
            { val: `${totalMastery}%`, label: 'MASTERY',     page: 'skillweb'  as PageId },
            { val: completedCount,      label: 'QUESTS',      page: 'quests'    as PageId },
            { val: graph.nodes.length,  label: 'GRAPH NODES', page: 'graph'     as PageId },
            { val: memories.length,     label: 'MEMORIES',    page: 'memory'    as PageId },
          ].map((s, i) => (
            <button key={i} className="main-stat" onClick={() => onNavigate(s.page)}>
              <span className="main-stat-value">{s.val}</span>
              <span className="main-stat-label">{s.label}</span>
            </button>
          ))}
        </div>

        {recentActivity[0] && (
          <button className="main-latest" onClick={() => onNavigate('archive')}>
            <p className="eyebrow" style={{ marginBottom: '2px' }}>LATEST</p>
            <p className="caption">{recentActivity[0].title}</p>
          </button>
        )}
      </footer>

      </MainToTrophyCinematic>
    </div>
  );
}
