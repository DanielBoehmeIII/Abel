import { useMemo } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId } from '../types/abel';
import ArtifactScene from '../components/3d/ArtifactScene';
import './MainPage.css';

interface Props { onNavigate: (page: PageId) => void; onOpenNav: () => void; }

export default function MainPage({ onNavigate, onOpenNav }: Props) {
  const { state } = useAbel();
  const { user, quests, skills, memories, recentActivity, graph } = state;

  const activeQuest    = quests.find(q => q.status === 'active') ?? quests.find(q => q.status === 'available');
  const recentMemory   = memories[memories.length - 1];
  const totalMastery   = useMemo(() => {
    const sum = skills.reduce((s, sk) => s + sk.mastery, 0);
    return skills.length ? Math.round(sum / skills.length) : 0;
  }, [skills]);
  const completedCount = quests.filter(q => q.status === 'completed').length;

  return (
    <div className="main-page">
      {/* Three.js scene — right-side backdrop */}
      <ArtifactScene className="main-scene" />

      {/* Gradient veil: blends scene into bg */}
      <div className="main-veil" />

      {/* ── Header ── */}
      <header className="main-header">
        <div className="main-logo-wrap">
          <div className="main-logo-mark" />
          <span className="main-logo">ABEL</span>
        </div>

        <nav className="main-nav-strip">
          {(['archive', 'quests', 'graph', 'exhibition'] as PageId[]).map(id => (
            <button key={id} className="main-nav-item" onClick={() => onNavigate(id)}>
              {id.toUpperCase()}
            </button>
          ))}
        </nav>

        <button className="main-nav-btn" onClick={onOpenNav} title="Navigator (Esc)">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
            <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1" />
            <circle cx="9" cy="9" r="1" fill="currentColor" />
            <line x1="9" y1="2" x2="9" y2="0" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="9" y1="16" x2="9" y2="18" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="2" y1="9" x2="0" y2="9" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="16" y1="9" x2="18" y2="9" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
          </svg>
        </button>
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
          <span>ENTER THE DREAM</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </main>

      {/* ── Right floating instruments ── */}
      <aside className="main-info-right">
        <div className="main-widget animate-fade-in" style={{ animationDelay: '0.22s' }}>
          <p className="main-widget-eye">SYSTEM STATUS</p>
          <p className="main-widget-value">HARMONIC</p>
          <div className="main-widget-wave">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="main-wave-bar" style={{
                height: `${8 + Math.sin(i * 0.9) * 7 + Math.abs(Math.sin(i * 1.5)) * 5}px`,
                animationDelay: `${i * 0.09}s`,
              }} />
            ))}
          </div>
        </div>

        {recentMemory && (
          <div
            className="main-widget main-widget--link animate-fade-in"
            style={{ animationDelay: '0.32s' }}
            onClick={() => onNavigate('exhibition')}
          >
            <p className="main-widget-eye">RECENT MEMORY</p>
            <p className="main-widget-title">{recentMemory.title}</p>
            <p className="main-widget-sub">{recentMemory.body.slice(0, 70)}…</p>
            <span className="main-widget-nav">VIEW MEMORY →</span>
          </div>
        )}

        {activeQuest && (
          <div
            className="main-widget main-widget--link animate-fade-in"
            style={{ animationDelay: '0.42s' }}
            onClick={() => onNavigate('quests')}
          >
            <p className="main-widget-eye">ACTIVE QUEST</p>
            <p className="main-widget-title">{activeQuest.title}</p>
            <p className="main-widget-sub">{activeQuest.description.slice(0, 62)}…</p>
            <span className="main-widget-nav">VIEW QUEST →</span>
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
            { val: memories.length,     label: 'MEMORIES',    page: 'exhibition' as PageId },
          ].map((s, i) => (
            <button key={i} className="main-stat" onClick={() => onNavigate(s.page)}>
              <span className="main-stat-value">{s.val}</span>
              <span className="main-stat-label">{s.label}</span>
            </button>
          ))}
        </div>

        {recentActivity[0] && (
          <div className="main-latest">
            <p className="eyebrow" style={{ marginBottom: '2px' }}>LATEST</p>
            <p className="caption">{recentActivity[0].title}</p>
          </div>
        )}
      </footer>
    </div>
  );
}
