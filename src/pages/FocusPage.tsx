import { useState, useEffect, useRef } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, FocusMode } from '../types/abel';
import { makeFocusSession } from '../state/abelStore';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import './FocusPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const MODES: { id: FocusMode; label: string; icon: string; desc: string }[] = [
  { id: 'deep-work',  label: 'Deep Work',      icon: '⊕', desc: 'Maximum focus. Single task. No distraction.' },
  { id: 'study',      label: 'Study',          icon: '⟁', desc: 'Active learning with reflection breaks.' },
  { id: 'reading',    label: 'Reading',        icon: '▣', desc: 'Deep reading. Slow comprehension.' },
  { id: 'writing',    label: 'Writing',        icon: '◇', desc: 'Draft mode. Quantity before quality.' },
  { id: 'recovery',   label: 'Recovery',       icon: '☽', desc: 'Rest, integration, and renewal.' },
  { id: 'creative',   label: 'Creative Flow',  icon: '◈', desc: 'Open exploration. Follow the thread.' },
];

const SOUNDS = ['None', 'Rain', 'White Noise', 'Forest', 'Waves', 'Brown Noise'];
const DURATIONS = [15, 25, 45, 60, 90, 120];

export default function FocusPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { quests, focusSessions, settings } = state;

  const [phase, setPhase] = useState<'config' | 'active' | 'complete'>('config');
  const [mode, setMode] = useState<FocusMode>(settings.focusDefaults.mode);
  const [duration, setDuration] = useState(settings.focusDefaults.duration);
  const [sound, setSound] = useState(settings.focusDefaults.ambientSound);
  const [intention, setIntention] = useState('');
  const [linkedQuestId, setLinkedQuestId] = useState(quests.find(q => q.status === 'active')?.id ?? '');

  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [reflection, setReflection] = useState('');
  const [score, setScore] = useState(80);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetSecs = duration * 60;
  const progress = Math.min(1, elapsed / targetSecs);
  const remaining = Math.max(0, targetSecs - elapsed);
  const remMin = String(Math.floor(remaining / 60)).padStart(2, '0');
  const remSec = String(remaining % 60).padStart(2, '0');

  const recentSessions = focusSessions.slice(-3).reverse();

  function startSession() {
    const session = makeFocusSession(mode, intention, targetSecs);
    setSessionId(session.id);
    dispatch({ type: 'START_FOCUS', session });
    setPhase('active');
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= targetSecs) {
          clearInterval(intervalRef.current!);
          return targetSecs;
        }
        return e + 1;
      });
    }, 1000);
  }

  function endSession() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('complete');
  }

  function saveSession() {
    if (!sessionId) return;
    dispatch({ type: 'COMPLETE_FOCUS', sessionId, notes, reflection, score });

    // increase skill mastery if linked quest has a skill
    const quest = quests.find(q => q.id === linkedQuestId);
    if (quest && quest.linkedSkillIds[0]) {
      dispatch({ type: 'INCREASE_SKILL', skillId: quest.linkedSkillIds[0], amount: 4 });
    }

    setPhase('config');
    setElapsed(0);
    setNotes('');
    setReflection('');
  }

  function saveMemory() {
    if (!sessionId) return;
    dispatch({ type: 'CREATE_MEMORY_FROM_FOCUS', sessionId });
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Circumference for SVG ring
  const R = 88;
  const circ = 2 * Math.PI * R;
  const dash = circ * (1 - progress);

  return (
    <div className="focus-page">
      <div className="focus-bg" />

      {phase === 'config' && (
        <div className="focus-config animate-fade-in">
          <div className="focus-config-left">
            <p className="heading">FOCUS SESSION</p>
            <h1 className="display-lg" style={{ margin: '8px 0 24px' }}>Your mind.<br /><em style={{ color: 'var(--purple)' }}>Augmented.</em></h1>

            {/* Mode selector */}
            <p className="heading" style={{ marginBottom: '10px' }}>SELECT MODE</p>
            <div className="focus-modes">
              {MODES.map(m => (
                <div
                  key={m.id}
                  className={`focus-mode-card glass ${mode === m.id ? 'focus-mode-card--active' : ''}`}
                  onClick={() => setMode(m.id)}
                >
                  <span className="focus-mode-icon">{m.icon}</span>
                  <span className="focus-mode-label">{m.label}</span>
                </div>
              ))}
            </div>

            <p className="body" style={{ marginTop: '12px', marginBottom: '20px' }}>
              {MODES.find(m => m.id === mode)?.desc}
            </p>

            {/* Duration */}
            <p className="heading" style={{ marginBottom: '10px' }}>DURATION</p>
            <div className="focus-durations">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  className={`focus-dur-btn ${duration === d ? 'focus-dur-btn--active' : ''}`}
                  onClick={() => setDuration(d)}
                >
                  {d}m
                </button>
              ))}
            </div>

            {/* Sound */}
            <p className="heading" style={{ margin: '20px 0 10px' }}>AMBIENT SOUND</p>
            <div className="focus-sounds">
              {SOUNDS.map(s => (
                <button
                  key={s}
                  className={`focus-sound-btn ${sound === s.toLowerCase() || (s === 'None' && sound === 'none') ? 'focus-sound-btn--active' : ''}`}
                  onClick={() => setSound(s.toLowerCase())}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="caption" style={{ marginTop: '6px' }}>Sensor: Not configured</p>
          </div>

          <div className="focus-config-right">
            <GlassPanel style={{ padding: '24px' }}>
              <p className="heading" style={{ marginBottom: '12px' }}>SESSION INTENTION</p>
              <textarea
                className="focus-intention-input"
                value={intention}
                onChange={e => setIntention(e.target.value)}
                placeholder="What will you work on? Be specific."
                rows={3}
              />

              {/* Link quest */}
              <p className="heading" style={{ margin: '16px 0 8px' }}>LINK QUEST</p>
              <select
                className="focus-select"
                value={linkedQuestId}
                onChange={e => setLinkedQuestId(e.target.value)}
              >
                <option value="">None</option>
                {quests.filter(q => q.status === 'active' || q.status === 'available').map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>

              <GlowButton
                variant="purple"
                size="lg"
                style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }}
                onClick={startSession}
                disabled={!intention.trim()}
              >
                BEGIN SESSION
              </GlowButton>
            </GlassPanel>

            {/* Recent */}
            {recentSessions.length > 0 && (
              <GlassPanel style={{ padding: '16px', marginTop: '12px' }}>
                <p className="heading" style={{ marginBottom: '10px' }}>RECENT SESSIONS</p>
                {recentSessions.map(s => (
                  <div key={s.id} className="focus-recent-item">
                    <span className="focus-recent-mode">{s.mode}</span>
                    <span className="caption">{Math.round(s.duration / 60)}min</span>
                    <span className="focus-score-chip">{s.score}</span>
                  </div>
                ))}
              </GlassPanel>
            )}
          </div>
        </div>
      )}

      {phase === 'active' && (
        <div className="focus-active animate-fade-in">
          {/* Animated ambient */}
          <div className="focus-ambient">
            <div className="focus-ambient-ring focus-ambient-ring--1 animate-spin-slow" />
            <div className="focus-ambient-ring focus-ambient-ring--2" style={{ animationDirection: 'reverse' }} />
            <div className="focus-ambient-glow animate-pulse-glow" />
          </div>

          {/* Timer */}
          <div className="focus-timer-wrap">
            <svg className="focus-timer-ring" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              <circle
                cx="100" cy="100" r={R} fill="none"
                stroke="var(--purple)" strokeWidth="2.5"
                strokeDasharray={circ}
                strokeDashoffset={dash}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 8px var(--purple))' }}
              />
            </svg>
            <div className="focus-timer-text">
              <span className="focus-timer-digits">{remMin}:{remSec}</span>
              <span className="heading">{mode.replace('-', ' ').toUpperCase()}</span>
            </div>
          </div>

          <p className="focus-active-intention">{intention}</p>

          <div className="focus-active-controls">
            <GlowButton variant="ghost" onClick={endSession}>END SESSION</GlowButton>
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <div className="focus-complete animate-fade-in">
          <div className="focus-complete-inner">
            <p className="heading" style={{ marginBottom: '8px' }}>SESSION COMPLETE</p>
            <h2 className="display-md" style={{ margin: '0 0 20px', color: 'var(--cyan)' }}>
              {Math.round(elapsed / 60)} minutes of {mode.replace('-', ' ')}
            </h2>

            <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
              <p className="heading" style={{ marginBottom: '8px' }}>FOCUS SCORE</p>
              <div className="focus-score-bar-wrap">
                <div className="focus-score-bar">
                  <div className="focus-score-fill" style={{ width: `${score}%` }} />
                </div>
                <input
                  type="range" min="0" max="100" value={score}
                  onChange={e => setScore(Number(e.target.value))}
                  className="focus-score-range"
                />
              </div>
              <p className="caption">{score}/100</p>
            </GlassPanel>

            <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
              <p className="heading" style={{ marginBottom: '8px' }}>SESSION NOTES</p>
              <textarea
                className="focus-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What happened during this session?"
                rows={3}
              />
            </GlassPanel>

            <GlassPanel style={{ padding: '20px', marginBottom: '20px' }}>
              <p className="heading" style={{ marginBottom: '8px' }}>REFLECTION</p>
              <textarea
                className="focus-textarea"
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                placeholder="What insight or shift emerged?"
                rows={3}
              />
            </GlassPanel>

            <div className="focus-complete-actions">
              <GlowButton variant="purple" onClick={saveSession}>SAVE SESSION</GlowButton>
              <GlowButton variant="cyan" onClick={saveMemory} disabled={!reflection.trim()}>
                CREATE MEMORY
              </GlowButton>
              <GlowButton variant="ghost" onClick={() => onNavigate('exhibition')}>
                VIEW EXHIBITION
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
