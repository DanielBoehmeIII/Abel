import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { SKILL_NODES } from '../data';
import type { MemoryItem } from '../types';
import './MemoryPage.css';

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Skill keyword mapping ─────────────────────────────────────────────────────

const SKILL_KEYWORDS: Record<string, string[]> = {
  'focus':               ['focus', 'concentration', 'attention', 'work session'],
  'deep-work':           ['deep work', 'flow', 'distraction-free', 'single task'],
  'distraction-control': ['distraction', 'phone', 'notification', 'interrupt'],
  'flow-state':          ['flow state', 'zone', 'peak performance', 'immersion'],
  'habit':               ['habit', 'routine', 'ritual', 'daily practice'],
  'morning-routine':     ['morning', 'wake up', 'wakeup', 'sunrise routine'],
  'consistency':         ['consistent', 'streak', 'every day', 'daily', 'discipline'],
  'streak-recovery':     ['recovery', 'setback', 'bounce back', 'restart'],
  'learning':            ['learn', 'study', 'knowledge', 'understand', 'read'],
  'active-recall':       ['recall', 'flashcard', 'quiz', 'test', 'spaced repetition'],
  'practice-problems':   ['practice', 'problem solving', 'exercise', 'drill'],
  'project-building':    ['project', 'build', 'create', 'ship', 'portfolio'],
  'fitness':             ['fitness', 'exercise', 'workout', 'gym', 'physical'],
  'mobility':            ['stretch', 'flexibility', 'mobility', 'yoga', 'joint'],
  'strength':            ['strength', 'weight', 'lift', 'muscle', 'training'],
  'sleep-discipline':    ['sleep', 'bedtime', 'rest', 'recovery', 'circadian'],
};

function detectSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(SKILL_KEYWORDS)
    .filter(([, kws]) => kws.some(kw => lower.includes(kw)))
    .map(([id]) => id);
}

function generateQuests(title: string, linkedSkills: string[]): string[] {
  const quests: string[] = [];
  if (linkedSkills.includes('focus') || linkedSkills.includes('deep-work')) {
    quests.push(`Focus session: ${title.slice(0, 40)}`);
  }
  if (linkedSkills.includes('learning') || linkedSkills.includes('active-recall')) {
    quests.push(`Review notes on: ${title.slice(0, 40)}`);
  }
  if (linkedSkills.includes('habit')) {
    quests.push(`Build habit from: ${title.slice(0, 35)}`);
  }
  if (quests.length === 0) {
    quests.push(`Revisit: ${title.slice(0, 50)}`);
  }
  return quests.slice(0, 3);
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

interface ParsedItem {
  title: string;
  text: string;
  tags: string[];
  type: MemoryItem['type'];
}

function parseInput(raw: string): ParsedItem[] {
  const trimmed = raw.trim();

  // Try JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed);
      const items = Array.isArray(obj) ? obj : [obj];
      return items.map((item: Record<string, unknown>) => ({
        title: String(item.title ?? item.name ?? item.heading ?? '').slice(0, 80) || 'Imported Memory',
        text: String(item.text ?? item.content ?? item.body ?? item.note ?? JSON.stringify(item)),
        tags: Array.isArray(item.tags) ? (item.tags as string[]).map(String) : [],
        type: 'json' as const,
      }));
    } catch {
      // not valid JSON, fall through
    }
  }

  // Try Markdown (multiple entries separated by ---)
  if (trimmed.includes('---') || trimmed.match(/^#{1,3}\s/m)) {
    const sections = trimmed.split(/\n---\n/).filter(s => s.trim());
    return sections.map(section => {
      const lines = section.trim().split('\n');
      const headingLine = lines.find(l => l.match(/^#{1,3}\s/));
      const title = headingLine
        ? headingLine.replace(/^#{1,3}\s*/, '').trim()
        : lines[0].slice(0, 80);
      const body = lines.filter(l => !l.match(/^#{1,3}\s/)).join('\n').trim();
      const hashTags = [...(body + title).matchAll(/#([a-zA-Z]\w*)/g)].map(m => m[1].toLowerCase());
      return {
        title,
        text: body,
        tags: [...new Set(hashTags)],
        type: 'markdown' as const,
      };
    });
  }

  // Plain text — split on double newlines as paragraphs
  const paras = trimmed.split(/\n{2,}/).filter(p => p.trim());
  if (paras.length > 1) {
    return paras.map(para => {
      const lines = para.trim().split('\n');
      const title = lines[0].slice(0, 80);
      const body = lines.slice(1).join('\n').trim();
      const hashTags = [...para.matchAll(/#([a-zA-Z]\w*)/g)].map(m => m[1].toLowerCase());
      return { title, text: body || para, tags: [...new Set(hashTags)], type: 'text' as const };
    });
  }

  // Single block of text
  const firstLine = trimmed.split('\n')[0].slice(0, 80);
  const hashTags = [...trimmed.matchAll(/#([a-zA-Z]\w*)/g)].map(m => m[1].toLowerCase());
  return [{
    title: firstLine,
    text: trimmed,
    tags: [...new Set(hashTags)],
    type: 'text',
  }];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<ParsedItem[] | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!input.trim()) return [];
    return parseInput(input);
  }, [input]);

  function handlePreview() {
    if (!input.trim()) return;
    setPreview(parseInput(input));
  }

  function handleImport() {
    if (!preview || preview.length === 0) return;
    const items: MemoryItem[] = preview.map(p => {
      const linkedSkills = detectSkills(p.title + ' ' + p.text + ' ' + p.tags.join(' '));
      const suggestedQuests = generateQuests(p.title, linkedSkills);
      return {
        id: uid(),
        title: p.title,
        source: p.text,
        tags: p.tags,
        linkedSkills,
        suggestedQuests,
        importedAt: new Date().toISOString(),
        type: p.type,
      };
    });
    dispatch({ type: 'IMPORT_MEMORIES', items });
    setInput('');
    setPreview(null);
  }

  return (
    <div className="memory-page">
      <div className="mem-header">
        <div className="mem-title-row">
          <span className="logo-a">▲</span>
          <span className="mem-title">MEMORY IMPORT</span>
          <span className="mem-sub">Text · Markdown · JSON</span>
        </div>
        <div className="mem-count glass">
          <span className="mem-count-val neon-cyan">{state.memories.length}</span>
          <span className="mem-count-label">Memories</span>
        </div>
      </div>

      <div className="mem-body">
        {/* Left: input + import */}
        <div className="mem-left">
          <div className="mem-input-panel glass">
            <div className="mem-panel-label">Paste Text, Markdown, or JSON</div>
            <textarea
              className="mem-textarea"
              value={input}
              onChange={e => { setInput(e.target.value); setPreview(null); }}
              placeholder={`Paste anything here — notes, journal text, structured data.\n\nMarkdown:\n# My Insight\nContent goes here. #focus #learning\n\n---\n\n# Another Memory\n...\n\nJSON:\n[{"title":"...","text":"...","tags":["focus"]}]`}
            />
            <div className="mem-input-actions">
              <button className="btn" onClick={handlePreview} disabled={!input.trim()}>
                Preview ({parsed.length})
              </button>
              <button className="btn" onClick={handleImport} disabled={!preview || preview.length === 0}>
                Import All
              </button>
              <button className="btn" onClick={() => { setInput(''); setPreview(null); }}>Clear</button>
            </div>
          </div>

          {preview && preview.length > 0 && (
            <div className="mem-preview-panel glass fade-in">
              <div className="mem-panel-label">Preview — {preview.length} item{preview.length !== 1 ? 's' : ''}</div>
              {preview.map((p, i) => {
                const skills = detectSkills(p.title + ' ' + p.text);
                const quests = generateQuests(p.title, skills);
                return (
                  <div key={i} className="mem-preview-item">
                    <div className="mem-preview-title">{p.title}</div>
                    <div className="mem-preview-text">{p.text.slice(0, 120)}{p.text.length > 120 ? '…' : ''}</div>
                    <div className="mem-preview-meta">
                      <span className="mem-type-badge">{p.type}</span>
                      {p.tags.map(t => <span key={t} className="jrn-tag">#{t}</span>)}
                    </div>
                    {skills.length > 0 && (
                      <div className="mem-links-row">
                        <span className="mem-links-label">Skills:</span>
                        {skills.slice(0, 4).map(s => (
                          <span key={s} className="mem-skill-badge">{s}</span>
                        ))}
                      </div>
                    )}
                    {quests.length > 0 && (
                      <div className="mem-links-row">
                        <span className="mem-links-label">Quests:</span>
                        <span className="mem-quest-text">{quests[0]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: imported memories list */}
        <div className="mem-right">
          <div className="mem-memories-panel">
            <div className="mem-panel-label" style={{ padding: '0 0 8px 0' }}>
              Imported Memories
            </div>
            {state.memories.length === 0 && (
              <div className="mem-empty">No memories imported yet.</div>
            )}
            {state.memories.map(m => (
              <div
                key={m.id}
                className={`mem-item glass ${selectedMemoryId === m.id ? 'sel' : ''}`}
                onClick={() => setSelectedMemoryId(selectedMemoryId === m.id ? null : m.id)}
              >
                <div className="mem-item-header">
                  <span className="mem-item-title">{m.title}</span>
                  <span className="mem-item-date">{fmtDate(m.importedAt)}</span>
                </div>
                <div className="mem-preview-meta">
                  <span className="mem-type-badge">{m.type}</span>
                  {m.tags.slice(0, 3).map(t => <span key={t} className="jrn-tag">#{t}</span>)}
                </div>
                {selectedMemoryId === m.id && (
                  <div className="mem-item-detail fade-in">
                    <p className="mem-item-source">{m.source.slice(0, 300)}{m.source.length > 300 ? '…' : ''}</p>
                    {m.linkedSkills.length > 0 && (
                      <div className="mem-links-row">
                        <span className="mem-links-label">Skills:</span>
                        {m.linkedSkills.map(s => {
                          const node = SKILL_NODES.find(n => n.id === s);
                          return <span key={s} className="mem-skill-badge">{node?.label ?? s}</span>;
                        })}
                      </div>
                    )}
                    {m.suggestedQuests.length > 0 && (
                      <div className="mem-quests-list">
                        <span className="mem-links-label">Suggested quests:</span>
                        {m.suggestedQuests.map((q, i) => (
                          <div key={i} className="mem-quest-item">○ {q}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
