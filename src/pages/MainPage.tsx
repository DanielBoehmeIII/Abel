import { useMemo } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId } from '../types/abel';
import GlowButton from '../components/common/GlowButton';
import './MainPage.css';

interface Props { onNavigate: (page: PageId) => void; onOpenNav: () => void; }

export default function MainPage({ onNavigate, onOpenNav }: Props) {
  const { state } = useAbel();
  const { user, quests, skills, memories, recentActivity, graph } = state;

  const activeQuest = quests.find(q => q.status === 'active') ?? quests.find(q => q.status === 'available');
  const recentMemory = memories[memories.length - 1];
  const totalMastery = useMemo(() => {
    const sum = skills.reduce((s, sk) => s + sk.mastery, 0);
    return skills.length ? Math.round(sum / skills.length) : 0;
  }, [skills]);
  const completedCount = quests.filter(q => q.status === 'completed').length;
  const graphSize = graph.nodes.length;

  return (
    <div className="main-page">
      {/* Atmospheric background layers */}
      <div className="main-bg-gradient" />
      <div className="main-bg-radial" />
      <div className="main-stars" aria-hidden>
        {Array.from({ length: 60 }, (_, i) => (
          <div key={i} className="main-star" style={{
            left: `${Math.random() * 100}%`,
            top:  `${Math.random() * 100}%`,
            width:  `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
          }} />
        ))}
      </div>

      {/* Top bar */}
      <header className="main-header">
        <span className="main-logo">ABEL</span>
        <nav className="main-nav-strip">
          {(['archive', 'quests', 'graph', 'exhibition'] as PageId[]).map(id => (
            <button key={id} className="main-nav-item" onClick={() => onNavigate(id)}>
              {id.toUpperCase()}
            </button>
          ))}
        </nav>
        <button className="main-nav-btn" onClick={onOpenNav} title="Open Nav (Esc)">
          ◈
        </button>
      </header>

      {/* Hero */}
      <main className="main-hero">
        <div className="main-hero-left animate-fade-in">
          <p className="heading" style={{ marginBottom: '10px' }}>ABEL OS</p>
          <h1 className="display-xl main-hero-title">
            A living system<br />
            that remembers,<br />
            <span className="main-hero-accent">dreams,</span><br />
            and becomes.
          </h1>
          <GlowButton
            variant="purple"
            size="lg"
            style={{ marginTop: '32px' }}
            onClick={() => onNavigate('archive')}
          >
            ENTER THE DREAM →
          </GlowButton>
        </div>

        {/* Central artifact */}
        <div className="main-artifact-wrap">
          <div className="main-artifact-glow" />
          <div className="main-artifact animate-float" onClick={() => onNavigate('trophies')}>
            <svg viewBox="-60 -60 120 120" className="main-cube-svg">
              {/* Wireframe cube */}
              <g stroke="rgba(124,77,255,0.7)" strokeWidth="0.8" fill="none">
                {/* Front face */}
                <rect x="-28" y="-28" width="56" height="56" stroke="rgba(0,212,255,0.6)" strokeWidth="0.6" />
                {/* Back face offset */}
                <rect x="-18" y="-18" width="56" height="56" stroke="rgba(124,77,255,0.4)" strokeWidth="0.5" />
                {/* Connecting edges */}
                <line x1="-28" y1="-28" x2="-18" y2="-18" />
                <line x1="28"  y1="-28" x2="38"  y2="-18" />
                <line x1="28"  y1="28"  x2="38"  y2="38"  />
                <line x1="-28" y1="28"  x2="-18" y2="38"  />
                {/* Inner glow lines */}
                <line x1="-28" y1="0"   x2="28"  y2="0"   stroke="rgba(0,212,255,0.3)" strokeWidth="0.4" />
                <line x1="0"   y1="-28" x2="0"   y2="28"  stroke="rgba(0,212,255,0.3)" strokeWidth="0.4" />
                <circle cx="0" cy="0" r="6" stroke="rgba(245,197,24,0.8)" strokeWidth="0.6" />
                <circle cx="0" cy="0" r="2" fill="rgba(245,197,24,0.9)" />
              </g>
              {/* Glow filter */}
              <defs>
                <filter id="cube-glow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
            </svg>
          </div>
        </div>

        {/* Right panels */}
        <div className="main-panels-right animate-fade-in" style={{ animationDelay: '0.15s' }}>
          {/* System status */}
          <div className="main-panel glass">
            <p className="heading">SYSTEM STATUS</p>
            <p className="main-panel-status">HARMONIC</p>
            <div className="main-panel-wave" aria-hidden>
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="main-wave-bar" style={{
                  height: `${8 + Math.sin(i * 0.7) * 12 + Math.random() * 8}px`,
                  animationDelay: `${i * 0.08}s`,
                }} />
              ))}
            </div>
          </div>

          {/* Active quest */}
          {activeQuest && (
            <div className="main-panel glass" style={{ cursor: 'pointer' }} onClick={() => onNavigate('quests')}>
              <p className="heading">ACTIVE QUEST</p>
              <p className="main-panel-title">{activeQuest.title}</p>
              <p className="main-panel-sub">{activeQuest.description.slice(0, 70)}...</p>
              <button className="main-panel-link">VIEW QUEST →</button>
            </div>
          )}

          {/* Recent memory */}
          {recentMemory && (
            <div className="main-panel glass" style={{ cursor: 'pointer' }} onClick={() => onNavigate('exhibition')}>
              <p className="heading">ACTIVE MEMORY</p>
              <p className="main-panel-title">{recentMemory.title}</p>
              <p className="main-panel-sub">{recentMemory.body.slice(0, 80)}...</p>
              <button className="main-panel-link">VIEW MEMORY →</button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom bar */}
      <footer className="main-footer">
        {/* Profile */}
        <div className="main-profile">
          <div className="main-profile-avatar">
            <span>A</span>
          </div>
          <div>
            <p className="main-profile-name">{user.name}</p>
            <p className="caption">{user.title}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="main-stats">
          <div className="main-stat" onClick={() => onNavigate('skillweb')}>
            <span className="main-stat-value">{totalMastery}%</span>
            <span className="main-stat-label">MASTERY</span>
          </div>
          <div className="main-stat-divider" />
          <div className="main-stat" onClick={() => onNavigate('quests')}>
            <span className="main-stat-value">{completedCount}</span>
            <span className="main-stat-label">QUESTS</span>
          </div>
          <div className="main-stat-divider" />
          <div className="main-stat" onClick={() => onNavigate('graph')}>
            <span className="main-stat-value">{graphSize}</span>
            <span className="main-stat-label">GRAPH NODES</span>
          </div>
          <div className="main-stat-divider" />
          <div className="main-stat" onClick={() => onNavigate('exhibition')}>
            <span className="main-stat-value">{memories.length}</span>
            <span className="main-stat-label">MEMORIES</span>
          </div>
        </div>

        {/* Recent activity */}
        {recentActivity[0] && (
          <div className="main-activity-peek glass">
            <p className="heading" style={{ marginBottom: '4px' }}>LATEST</p>
            <p className="caption">{recentActivity[0].title}</p>
          </div>
        )}
      </footer>
    </div>
  );
}
