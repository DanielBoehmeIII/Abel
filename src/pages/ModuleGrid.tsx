import { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { computeStreak } from '../AppContext';
import type { Habit, PlannerTask } from '../types';
import './ModuleGrid.css';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function ModuleShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="module-shell grid-bg fade-in">
      <div className="module-header">
        <div className="module-title">
          <span className="logo-a">▲</span>
          <span className="module-name">{title}</span>
          <span className="module-sub">{subtitle}</span>
        </div>
      </div>
      <div className="module-content">{children}</div>
    </div>
  );
}

function TileGrid({ tiles, selected, onSelect }: {
  tiles: { id: string; label: string; icon: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="tile-grid">
      {tiles.map(t => (
        <button key={t.id} className={`module-tile glass ${t.id === selected ? 'sel' : ''}`} onClick={() => onSelect(t.id)}>
          <span className="tile-icon">{t.icon}</span>
          <span className="tile-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── FOCUS ────────────────────────────────────────────────────────────────────

const FOCUS_TILES = [
  { id: '25min',   label: '25 Min Session', icon: '⊕', desc: 'A focused Pomodoro block. No phone, single task.',     duration: 1500, xp: 60  },
  { id: '50min',   label: '50 Min Session', icon: '⊕', desc: 'Extended deep work. Enter flow.',                      duration: 3000, xp: 100 },
  { id: 'nophone', label: 'No Phone Block', icon: '✕', desc: 'Remove phone from reach for the full block.',           duration: 3600, xp: 80  },
  { id: 'flow',    label: 'Flow State',     icon: '∿', desc: 'Challenge-skill balance. Lose track of time.',          duration: 5400, xp: 150 },
  { id: 'review',  label: 'Review Session', icon: '◈', desc: 'Review notes and integrate learning.',                  duration: 900,  xp: 40  },
];

export function FocusPage() {
  const { state, dispatch, todayStr } = useApp();
  const [selected, setSelected] = useState('25min');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [xpFlash, setXpFlash] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const tile = FOCUS_TILES.find(t => t.id === selected)!;

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed(p => {
          if (p >= tile.duration) { setRunning(false); return p; }
          return p + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tile.duration]);

  function handleSelect(id: string) {
    setSelected(id);
    setRunning(false);
    setElapsed(0);
  }

  function completeSession() {
    setRunning(false);
    const completed = elapsed >= tile.duration * 0.5;
    dispatch({
      type: 'ADD_FOCUS_SESSION',
      session: {
        id: uid(),
        type: selected,
        label: tile.label,
        duration: elapsed,
        completedAt: new Date().toISOString(),
        xp: completed ? tile.xp : Math.floor(tile.xp * (elapsed / tile.duration)),
        completed,
      },
    });
    if (completed) {
      setXpFlash(tile.xp);
      setTimeout(() => setXpFlash(null), 2000);
    }
    setElapsed(0);
  }

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');
  const pct = Math.min((elapsed / tile.duration) * 100, 100);
  const todaySessions = state.focusSessions.filter(s => s.completedAt.startsWith(todayStr));

  return (
    <ModuleShell title="FOCUS" subtitle="Deep Work Sessions">
      <TileGrid tiles={FOCUS_TILES} selected={selected} onSelect={handleSelect} />
      <div className="focus-bottom">
        <div className="focus-desc glass">{tile.desc}</div>
        <div className="focus-timer glass">
          <div className="timer-display">{mins}:{secs}</div>
          <div className="timer-bar"><div className="timer-fill" style={{ width: `${pct}%` }} /></div>
          <div className="timer-btns">
            <button className="btn" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Start'}</button>
            <button className="btn" onClick={() => { setRunning(false); setElapsed(0); }}>Reset</button>
            <button className="btn" onClick={completeSession} disabled={elapsed === 0}>Complete</button>
          </div>
          {xpFlash && <div className="xp-flash neon-green">+{xpFlash} XP</div>}
        </div>
        <div className="focus-sessions glass">
          <div className="sessions-label">Today ({todaySessions.length})</div>
          {todaySessions.length === 0 && (
            <div className="sessions-empty">No sessions yet</div>
          )}
          {todaySessions.slice(-5).reverse().map(s => (
            <div key={s.id} className={`session-row ${s.completed ? 'completed' : 'interrupted'}`}>
              <span className="session-dot">{s.completed ? '✓' : '✕'}</span>
              <span>{s.label}</span>
              <span className="session-xp neon-cyan">+{s.xp}</span>
              <span className="session-status">{s.completed ? 'done' : 'partial'}</span>
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}

// ─── HABIT ────────────────────────────────────────────────────────────────────

const HABIT_ICONS = ['◌', '☀', '▣', '☽', '⊛', '◈', '⬡', '∿', '△', '★'];

export function HabitPage() {
  const { state, dispatch, todayStr } = useApp();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('◌');

  function toggle(h: Habit) {
    dispatch({ type: 'TOGGLE_HABIT', habitId: h.id, date: todayStr });
  }

  function addHabit() {
    if (!newLabel.trim()) return;
    const habit: Habit = {
      id: uid(),
      label: newLabel.trim(),
      icon: newIcon,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_HABIT', habit });
    setNewLabel('');
    setAdding(false);
  }

  const maxStreak = state.habits.length
    ? Math.max(...state.habits.map(h => computeStreak(h.completedDates)))
    : 0;

  const doneToday = state.habits.filter(h => h.completedDates.includes(todayStr)).length;

  return (
    <ModuleShell title="HABIT" subtitle="Daily Rituals">
      <div className="habit-top-row">
        <div className="habit-streak glass">
          <span className="streak-icon">◈</span>
          <span className="streak-val neon-purple">{maxStreak}</span>
          <span className="streak-label">Best Streak</span>
        </div>
        <div className="habit-streak glass">
          <span className="streak-icon">✓</span>
          <span className="streak-val neon-cyan">{doneToday}</span>
          <span className="streak-label">Done Today</span>
        </div>
        <button className="btn" onClick={() => setAdding(a => !a)}>+ Add Habit</button>
      </div>

      {adding && (
        <div className="habit-add-form glass fade-in">
          <input
            className="planner-input"
            placeholder="Habit name..."
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
            autoFocus
          />
          <div className="icon-picker">
            {HABIT_ICONS.map(ic => (
              <button
                key={ic}
                className={`icon-opt ${ic === newIcon ? 'sel' : ''}`}
                onClick={() => setNewIcon(ic)}
              >{ic}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={addHabit}>Add</button>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="habit-grid">
        {state.habits.map(h => {
          const done = h.completedDates.includes(todayStr);
          const streak = computeStreak(h.completedDates);
          return (
            <div key={h.id} className={`habit-tile glass ${done ? 'done' : ''}`}>
              <button className="habit-toggle" onClick={() => toggle(h)}>
                <span className="habit-icon">{h.icon}</span>
                <span className="habit-label">{h.label}</span>
                <span className="habit-check">{done ? '✓' : '○'}</span>
              </button>
              <div className="habit-meta">
                <span className="habit-streak-badge">{streak}d</span>
                <button
                  className="habit-del"
                  onClick={() => dispatch({ type: 'DELETE_HABIT', id: h.id })}
                  title="Delete habit"
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </ModuleShell>
  );
}

// ─── PLANNER ──────────────────────────────────────────────────────────────────

export function PlannerPage() {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  function addTask() {
    if (!input.trim()) return;
    const task: PlannerTask = {
      id: uid(),
      text: input.trim(),
      done: false,
      createdAt: new Date().toISOString(),
      xp: 25,
    };
    dispatch({ type: 'ADD_PLANNER_TASK', task });
    setInput('');
  }

  function startEdit(t: PlannerTask) {
    setEditingId(t.id);
    setEditText(t.text);
  }

  function saveEdit(id: string) {
    if (editText.trim()) dispatch({ type: 'EDIT_PLANNER_TASK', id, text: editText.trim() });
    setEditingId(null);
  }

  const done = state.plannerTasks.filter(t => t.done).length;
  const total = state.plannerTasks.length;

  return (
    <ModuleShell title="PLANNER" subtitle="Today's Quests">
      <div className="planner-progress glass">
        <span className="neon-cyan">{done}</span>
        <span className="planner-prog-dim"> / {total} complete</span>
        <div className="planner-bar">
          <div className="planner-fill" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
        </div>
      </div>

      <div className="planner-list">
        {state.plannerTasks.map(task => (
          <div key={task.id} className={`planner-row glass ${task.done ? 'done' : ''}`}>
            <button className="planner-check-btn" onClick={() => dispatch({ type: 'TOGGLE_PLANNER_TASK', id: task.id })}>
              <span className="planner-check">{task.done ? '✓' : '○'}</span>
            </button>
            {editingId === task.id ? (
              <input
                className="planner-edit-input"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(task.id); if (e.key === 'Escape') setEditingId(null); }}
                onBlur={() => saveEdit(task.id)}
                autoFocus
              />
            ) : (
              <span className="planner-text" onDoubleClick={() => startEdit(task)}>{task.text}</span>
            )}
            <span className="planner-xp neon-cyan">+{task.xp}</span>
            <button
              className="planner-del"
              onClick={() => dispatch({ type: 'DELETE_PLANNER_TASK', id: task.id })}
            >✕</button>
          </div>
        ))}
      </div>

      <div className="planner-add glass">
        <input
          className="planner-input"
          placeholder="Add quest..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
        />
        <button className="btn" onClick={addTask}>Add</button>
      </div>
    </ModuleShell>
  );
}

// ─── SLEEP ────────────────────────────────────────────────────────────────────

function calcHours(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 1440;
  return Math.round(mins / 60 * 10) / 10;
}

export function SleepPage() {
  const { state, dispatch, todayStr } = useApp();
  const [bed, setBed] = useState('00:00');
  const [wake, setWake] = useState('08:00');
  const [quality, setQuality] = useState(7);

  function save() {
    const hours = calcHours(bed, wake);
    dispatch({
      type: 'ADD_SLEEP_LOG',
      log: { id: uid(), date: todayStr, bed, wake, quality, hours },
    });
  }

  const recent = state.sleepLogs.slice(0, 7);
  const avgHours = recent.length ? (recent.reduce((s, l) => s + l.hours, 0) / recent.length).toFixed(1) : '—';
  const avgQuality = recent.length ? Math.round(recent.reduce((s, l) => s + l.quality, 0) / recent.length) : '—';

  return (
    <ModuleShell title="SLEEP" subtitle="Recovery Log">
      <div className="sleep-layout">
        <div className="sleep-form-panel glass">
          <div className="sleep-form-title">Log Tonight</div>
          <div className="sleep-form">
            <label className="sleep-field">
              <span>Bedtime</span>
              <input type="time" value={bed} onChange={e => setBed(e.target.value)} />
            </label>
            <label className="sleep-field">
              <span>Wake Time</span>
              <input type="time" value={wake} onChange={e => setWake(e.target.value)} />
            </label>
            <label className="sleep-field">
              <span>Quality (1–10)</span>
              <input type="range" min={1} max={10} value={quality} onChange={e => setQuality(+e.target.value)} />
              <span className="quality-val neon-purple">{quality}</span>
            </label>
            <div className="sleep-preview">
              <span className="sleep-label">Duration</span>
              <span className="sleep-val neon-cyan">{calcHours(bed, wake)}h</span>
            </div>
            <button className="btn" onClick={save}>Save Log +10 XP</button>
          </div>
        </div>

        <div className="sleep-history-panel">
          <div className="sleep-stats-row">
            <div className="sleep-stat glass">
              <div className="sleep-stat-val neon-cyan">{avgHours}h</div>
              <div className="sleep-stat-label">Avg Sleep</div>
            </div>
            <div className="sleep-stat glass">
              <div className="sleep-stat-val neon-purple">{avgQuality}/10</div>
              <div className="sleep-stat-label">Avg Quality</div>
            </div>
            <div className="sleep-stat glass">
              <div className="sleep-stat-val neon-green">{state.sleepLogs.length}</div>
              <div className="sleep-stat-label">Total Logs</div>
            </div>
          </div>

          <div className="sleep-log-list">
            {recent.map(l => (
              <div key={l.id} className="sleep-log-row glass">
                <span className="sleep-log-date">{l.date}</span>
                <span className="sleep-log-time">{l.bed} → {l.wake}</span>
                <span className="sleep-log-hours neon-cyan">{l.hours}h</span>
                <span className="sleep-log-qual neon-purple">{l.quality}/10</span>
              </div>
            ))}
            {recent.length === 0 && <div className="sessions-empty">No logs yet</div>}
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}

// ─── FITNESS ──────────────────────────────────────────────────────────────────

const FITNESS_ITEMS = [
  { id: 'mobility', label: 'Mobility',  icon: '⊛', skillId: 'mobility' },
  { id: 'strength', label: 'Strength',  icon: '⊕', skillId: 'strength' },
  { id: 'walk',     label: 'Walk',      icon: '◌', skillId: 'fitness'  },
  { id: 'stretch',  label: 'Stretch',   icon: '∿', skillId: 'mobility' },
];

export function FitnessPage() {
  const { state, dispatch, todayStr } = useApp();
  const today = state.fitnessHistory.find(d => d.date === todayStr);
  const checked = today?.items ?? {};

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    dispatch({ type: 'SET_FITNESS_DAY', day: { date: todayStr, items: next } });
  }

  const doneCount = Object.values(checked).filter(Boolean).length;
  const totalDays = state.fitnessHistory.filter(d => Object.values(d.items).some(Boolean)).length;

  return (
    <ModuleShell title="FITNESS" subtitle="Movement Routines">
      <div className="fitness-stats-row">
        <div className="habit-streak glass">
          <span className="streak-icon">✓</span>
          <span className="streak-val neon-cyan">{doneCount}</span>
          <span className="streak-label">Done Today</span>
        </div>
        <div className="habit-streak glass">
          <span className="streak-icon">⊛</span>
          <span className="streak-val neon-purple">{totalDays}</span>
          <span className="streak-label">Active Days</span>
        </div>
      </div>
      <div className="checklist-grid">
        {FITNESS_ITEMS.map(item => (
          <button
            key={item.id}
            className={`checklist-tile glass ${checked[item.id] ? 'done' : ''}`}
            onClick={() => toggle(item.id)}
          >
            <span className="cl-icon">{item.icon}</span>
            <span className="cl-label">{item.label}</span>
            <span className="cl-skill-tag">{item.skillId}</span>
            <span className="cl-check">{checked[item.id] ? '✓' : '○'}</span>
          </button>
        ))}
      </div>
    </ModuleShell>
  );
}

// ─── LEARNING ─────────────────────────────────────────────────────────────────

const LEARNING_ITEMS = [
  { id: 'lesson',   label: 'Watch Lesson',     icon: '▷', skillId: 'learning'          },
  { id: 'notes',    label: 'Take Notes',        icon: '▣', skillId: 'learning'          },
  { id: 'recall',   label: 'Active Recall',     icon: '⟁', skillId: 'active-recall'     },
  { id: 'practice', label: 'Practice Problems', icon: '△', skillId: 'practice-problems' },
  { id: 'project',  label: 'Build Mini Project',icon: '⬡', skillId: 'project-building'  },
];

export function LearningPage() {
  const { state, dispatch, todayStr } = useApp();
  const today = state.learningHistory.find(d => d.date === todayStr);
  const checked = today?.checked ?? {};

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    dispatch({ type: 'SET_LEARNING_DAY', day: { date: todayStr, checked: next } });
  }

  const doneCount = Object.values(checked).filter(Boolean).length;
  const totalDays = state.learningHistory.filter(d => Object.values(d.checked).some(Boolean)).length;

  return (
    <ModuleShell title="LEARNING" subtitle="Knowledge Quests">
      <div className="fitness-stats-row">
        <div className="habit-streak glass">
          <span className="streak-icon">✓</span>
          <span className="streak-val neon-cyan">{doneCount}</span>
          <span className="streak-label">Done Today</span>
        </div>
        <div className="habit-streak glass">
          <span className="streak-icon">⟁</span>
          <span className="streak-val neon-purple">{totalDays}</span>
          <span className="streak-label">Active Days</span>
        </div>
      </div>
      <div className="checklist-grid">
        {LEARNING_ITEMS.map(item => (
          <button
            key={item.id}
            className={`checklist-tile glass ${checked[item.id] ? 'done' : ''}`}
            onClick={() => toggle(item.id)}
          >
            <span className="cl-icon">{item.icon}</span>
            <span className="cl-label">{item.label}</span>
            <span className="cl-skill-tag">{item.skillId}</span>
            <span className="cl-check">{checked[item.id] ? '✓' : '○'}</span>
          </button>
        ))}
      </div>
    </ModuleShell>
  );
}
