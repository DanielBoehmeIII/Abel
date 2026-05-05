import { useState, useEffect, useRef } from 'react';
import { get, set } from '../storage';
import './ModuleGrid.css';

// ─── FOCUS ────────────────────────────────────────────────────────────────────

const FOCUS_TILES = [
  { id: '25min',   label: '25 Min Session',  icon: '⊕', desc: 'A focused Pomodoro block. No phone, single task.' },
  { id: '50min',   label: '50 Min Session',  icon: '⊕', desc: 'Extended deep work. Enter flow.' },
  { id: 'nophone', label: 'No Phone Block',  icon: '✕', desc: 'Remove phone from reach for the full block.' },
  { id: 'flow',    label: 'Flow State',      icon: '∿', desc: 'Challenge-skill balance. Lose track of time.' },
  { id: 'review',  label: 'Review Session',  icon: '◈', desc: 'Review notes and integrate learning.' },
];

const TODAY_SESSIONS = [
  { label: '25 min', status: 'completed' },
  { label: '50 min', status: 'completed' },
  { label: '15 min', status: 'interrupted' },
];

export function FocusPage() {
  const [selected, setSelected] = useState('25min');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const tile = FOCUS_TILES.find(t => t.id === selected)!;
  const duration = selected === '50min' ? 3000 : 1500;

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed(p => {
          if (p >= duration) { setRunning(false); return p; }
          return p + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, duration]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');
  const pct = (elapsed / duration) * 100;

  return (
    <ModuleShell title="FOCUS" subtitle="Deep Work Sessions">
      <TileGrid tiles={FOCUS_TILES} selected={selected} onSelect={setSelected} />
      <div className="focus-bottom">
        <div className="focus-desc glass">{tile.desc}</div>
        <div className="focus-timer glass">
          <div className="timer-display">{mins}:{secs}</div>
          <div className="timer-bar"><div className="timer-fill" style={{ width: `${pct}%` }} /></div>
          <div className="timer-btns">
            <button className="btn" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Start'}</button>
            <button className="btn" onClick={() => { setRunning(false); setElapsed(0); }}>Reset</button>
          </div>
        </div>
        <div className="focus-sessions glass">
          <div className="sessions-label">Today</div>
          {TODAY_SESSIONS.map(s => (
            <div key={s.label + s.status} className={`session-row ${s.status}`}>
              <span className="session-dot">{s.status === 'completed' ? '✓' : '✕'}</span>
              <span>{s.label}</span>
              <span className="session-status">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}

// ─── HABIT ────────────────────────────────────────────────────────────────────

const HABITS = [
  { id: 'water',    label: 'Drink Water',         icon: '◌' },
  { id: 'morning',  label: 'Morning Routine',      icon: '☀' },
  { id: 'notes',    label: 'Review Notes',         icon: '▣' },
  { id: 'sleep',    label: 'Sleep Before Midnight',icon: '☽' },
  { id: 'cleanup',  label: '10 Min Cleanup',       icon: '⊛' },
];

export function HabitPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    get('abel_habits', {})
  );

  function toggle(id: string) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      set('abel_habits', next);
      return next;
    });
  }

  return (
    <ModuleShell title="HABIT" subtitle="Daily Rituals">
      <div className="habit-streak glass">
        <span className="streak-icon">◈</span>
        <span className="streak-val neon-purple">12</span>
        <span className="streak-label">Day Streak</span>
      </div>
      <div className="habit-grid">
        {HABITS.map(h => (
          <button
            key={h.id}
            className={`habit-tile glass ${checked[h.id] ? 'done' : ''}`}
            onClick={() => toggle(h.id)}
          >
            <span className="habit-icon">{h.icon}</span>
            <span className="habit-label">{h.label}</span>
            <span className="habit-check">{checked[h.id] ? '✓' : '○'}</span>
          </button>
        ))}
      </div>
    </ModuleShell>
  );
}

// ─── PLANNER ──────────────────────────────────────────────────────────────────

const DEFAULT_TASKS = [
  'Deep work block',
  'Calculus review',
  'Chinese journal',
  'Gym session',
  'Plan tomorrow',
];

export function PlannerPage() {
  const [tasks, setTasks] = useState<{ text: string; done: boolean }[]>(() =>
    get('abel_planner', DEFAULT_TASKS.map(t => ({ text: t, done: false })))
  );
  const [input, setInput] = useState('');

  function toggleTask(i: number) {
    const next = tasks.map((t, idx) => idx === i ? { ...t, done: !t.done } : t);
    setTasks(next);
    set('abel_planner', next);
  }

  function addTask() {
    if (!input.trim()) return;
    const next = [...tasks, { text: input.trim(), done: false }];
    setTasks(next);
    set('abel_planner', next);
    setInput('');
  }

  return (
    <ModuleShell title="PLANNER" subtitle="Today's Quests">
      <div className="planner-list">
        {tasks.map((task, i) => (
          <div key={i} className={`planner-row glass ${task.done ? 'done' : ''}`} onClick={() => toggleTask(i)}>
            <span className="planner-check">{task.done ? '✓' : '○'}</span>
            <span className="planner-text">{task.text}</span>
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

export function SleepPage() {
  const [log, setLog] = useState(() => get('abel_sleep', { bed: '00:30', wake: '08:10', quality: 7 }));

  function save() { set('abel_sleep', log); }

  return (
    <ModuleShell title="SLEEP" subtitle="Recovery Log">
      <div className="sleep-panel glass">
        <div className="sleep-latest">
          <div className="sleep-row">
            <span className="sleep-label">Bedtime</span>
            <span className="sleep-val neon-cyan">{log.bed}</span>
          </div>
          <div className="sleep-row">
            <span className="sleep-label">Wake</span>
            <span className="sleep-val neon-cyan">{log.wake}</span>
          </div>
          <div className="sleep-row">
            <span className="sleep-label">Quality</span>
            <span className="sleep-val neon-purple">{log.quality} / 10</span>
          </div>
        </div>
        <div className="sleep-form">
          <label className="sleep-field">
            <span>Bedtime</span>
            <input type="time" value={log.bed} onChange={e => setLog({ ...log, bed: e.target.value })} />
          </label>
          <label className="sleep-field">
            <span>Wake Time</span>
            <input type="time" value={log.wake} onChange={e => setLog({ ...log, wake: e.target.value })} />
          </label>
          <label className="sleep-field">
            <span>Quality (1–10)</span>
            <input type="range" min={1} max={10} value={log.quality} onChange={e => setLog({ ...log, quality: +e.target.value })} />
            <span className="quality-val">{log.quality}</span>
          </label>
          <button className="btn" onClick={save}>Save Log</button>
        </div>
      </div>
    </ModuleShell>
  );
}

// ─── FITNESS ─────────────────────────────────────────────────────────────────

const FITNESS_ITEMS = [
  { id: 'mobility',  label: 'Mobility',  icon: '⊛' },
  { id: 'strength',  label: 'Strength',  icon: '⊕' },
  { id: 'walk',      label: 'Walk',      icon: '◌' },
  { id: 'stretch',   label: 'Stretch',   icon: '∿' },
];

export function FitnessPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => get('abel_fitness', {}));

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    set('abel_fitness', next);
  }

  return (
    <ModuleShell title="FITNESS" subtitle="Movement Routines">
      <div className="checklist-grid">
        {FITNESS_ITEMS.map(item => (
          <button key={item.id} className={`checklist-tile glass ${checked[item.id] ? 'done' : ''}`} onClick={() => toggle(item.id)}>
            <span className="cl-icon">{item.icon}</span>
            <span className="cl-label">{item.label}</span>
            <span className="cl-check">{checked[item.id] ? '✓' : '○'}</span>
          </button>
        ))}
      </div>
    </ModuleShell>
  );
}

// ─── LEARNING ─────────────────────────────────────────────────────────────────

const LEARNING_ITEMS = [
  { id: 'lesson',    label: 'Watch Lesson',      icon: '▷' },
  { id: 'notes',     label: 'Take Notes',         icon: '▣' },
  { id: 'recall',    label: 'Active Recall',       icon: '⟁' },
  { id: 'practice',  label: 'Practice Problems',   icon: '△' },
  { id: 'project',   label: 'Build Mini Project',  icon: '⬡' },
];

export function LearningPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => get('abel_learning', {}));

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    set('abel_learning', next);
  }

  return (
    <ModuleShell title="LEARNING" subtitle="Knowledge Quests">
      <div className="checklist-grid">
        {LEARNING_ITEMS.map(item => (
          <button key={item.id} className={`checklist-tile glass ${checked[item.id] ? 'done' : ''}`} onClick={() => toggle(item.id)}>
            <span className="cl-icon">{item.icon}</span>
            <span className="cl-label">{item.label}</span>
            <span className="cl-check">{checked[item.id] ? '✓' : '○'}</span>
          </button>
        ))}
      </div>
    </ModuleShell>
  );
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

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
