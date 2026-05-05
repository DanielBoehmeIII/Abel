import { useApp, ARCHETYPES } from '../AppContext';
import './ArchetypesPage.css';

export default function ArchetypesPage() {
  const { state, archetype } = useApp();
  const xp = state.xp;

  const nextArchetype = ARCHETYPES.find(a => a.xp > xp);
  const currentArchetype = archetype;

  let progress = 100;
  if (nextArchetype) {
    const base = currentArchetype.xp;
    progress = Math.min(100, ((xp - base) / (nextArchetype.xp - base)) * 100);
  }

  return (
    <div className="arch-page">
      <div className="arch-header">
        <div className="arch-title">
          <span className="logo-a">▲</span>
          <span className="arch-logo">ARCHETYPES</span>
        </div>
        <div className="arch-xp glass">
          <span className="arch-xp-label">TOTAL XP</span>
          <span className="arch-xp-val neon-cyan">{xp.toLocaleString()}</span>
          {nextArchetype && (
            <span className="arch-xp-next">/ {nextArchetype.xp.toLocaleString()}</span>
          )}
        </div>
      </div>

      <div className="arch-cards">
        {ARCHETYPES.map((a, i) => {
          const isCurrent = a.id === currentArchetype.id;
          const isUnlocked = xp >= a.xp;
          return (
            <div
              key={a.id}
              className={`arch-card glass ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}`}
            >
              <div className="arch-card-icon" style={{ opacity: isUnlocked ? 1 : 0.25 }}>{a.icon}</div>
              <div className="arch-card-num">0{i + 1}</div>
              <div className="arch-card-name">{a.label}</div>
              <div className="arch-card-xp">{a.xp === 0 ? 'Start' : `${a.xp.toLocaleString()} XP`}</div>
              <div className="arch-card-desc">{a.desc}</div>
              {isCurrent && <div className="arch-current-badge">● CURRENT</div>}
              {!isUnlocked && <div className="arch-lock">🔒</div>}
            </div>
          );
        })}
      </div>

      {nextArchetype && (
        <div className="arch-progress-area glass">
          <div className="arch-progress-label">
            <span className="neon-purple">{currentArchetype.label.toUpperCase()}</span>
            <span className="arch-dim"> → </span>
            <span className="neon-cyan">{nextArchetype.label.toUpperCase()}</span>
            <span className="arch-dim" style={{ marginLeft: 'auto' }}>
              {xp.toLocaleString()} / {nextArchetype.xp.toLocaleString()} XP
            </span>
          </div>
          <div className="arch-progress-bar">
            <div className="arch-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
