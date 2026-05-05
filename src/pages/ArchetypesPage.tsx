import './ArchetypesPage.css';

const ARCHETYPES = [
  { id: 'novice',     label: 'Novice',      xp: 0,      desc: 'Learning the system.',              icon: '◌' },
  { id: 'apprentice', label: 'Apprentice',   xp: 5000,   desc: 'Building consistency.',             icon: '◈' },
  { id: 'adept',      label: 'Adept',        xp: 15000,  desc: 'Refining skill loops.',             icon: '⬡' },
  { id: 'master',     label: 'Master',       xp: 35000,  desc: 'Compounding mastery.',              icon: '◉' },
  { id: 'legend',     label: 'Legend',       xp: 75000,  desc: 'Embodied discipline.',              icon: '★' },
];

const CURRENT_XP = 12450;
const CURRENT = 'apprentice';

export default function ArchetypesPage() {
  const next = ARCHETYPES.find(a => a.xp > CURRENT_XP);
  const progress = next ? ((CURRENT_XP - 5000) / (next.xp - 5000)) * 100 : 100;

  return (
    <div className="arch-page">
      <div className="arch-header">
        <div className="arch-title">
          <span className="logo-a">▲</span>
          <span className="arch-logo">ARCHETYPES</span>
        </div>
        <div className="arch-xp glass">
          <span className="arch-xp-label">XP</span>
          <span className="arch-xp-val neon-cyan">{CURRENT_XP.toLocaleString()}</span>
          {next && <span className="arch-xp-next">/ {next.xp.toLocaleString()}</span>}
        </div>
      </div>

      <div className="arch-cards">
        {ARCHETYPES.map((a, i) => {
          const isCurrent = a.id === CURRENT;
          const isUnlocked = a.xp <= CURRENT_XP;
          return (
            <div key={a.id} className={`arch-card glass ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}`}>
              <div className="arch-card-icon" style={{ opacity: isUnlocked ? 1 : 0.3 }}>{a.icon}</div>
              <div className="arch-card-num">0{i + 1}</div>
              <div className="arch-card-name">{a.label}</div>
              <div className="arch-card-xp">{a.xp === 0 ? '0 XP' : `${a.xp.toLocaleString()} XP`}</div>
              <div className="arch-card-desc">{a.desc}</div>
              {isCurrent && <div className="arch-current-badge">● CURRENT</div>}
              {!isUnlocked && <div className="arch-lock">🔒</div>}
            </div>
          );
        })}
      </div>

      {next && (
        <div className="arch-progress-area glass">
          <div className="arch-progress-label">
            <span className="neon-purple">APPRENTICE</span>
            <span className="arch-dim"> → </span>
            <span className="neon-cyan">ADEPT</span>
            <span className="arch-dim" style={{ marginLeft: 'auto' }}>{CURRENT_XP.toLocaleString()} / {next.xp.toLocaleString()} XP</span>
          </div>
          <div className="arch-progress-bar">
            <div className="arch-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
