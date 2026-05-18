import { useState, useEffect } from 'react';
import type { PageId } from '../types/abel';
import { memoryService } from '../db/services/memoryService';
import { DEMO_USER_ID } from '../db/services/userService';
import type { MemoryRecord, MemoryType } from '../db/schema';
import './MemoryPage.css';

interface Props { onNavigate: (page: PageId) => void; }

const ALL_TYPES: { id: MemoryType | 'all'; label: string }[] = [
  { id: 'all',        label: 'All'     },
  { id: 'fact',       label: 'Fact'    },
  { id: 'goal',       label: 'Goal'    },
  { id: 'preference', label: 'Pref'   },
  { id: 'project',    label: 'Project' },
  { id: 'skill',      label: 'Skill'   },
  { id: 'document',   label: 'Doc'     },
  { id: 'system',     label: 'System'  },
];

const TYPE_COLOR: Record<MemoryType, string> = {
  fact:       '#22d3ee',
  goal:       '#f0c040',
  preference: '#a78bfa',
  project:    '#818cf8',
  skill:      '#34d399',
  document:   '#94a3b8',
  system:     '#64748b',
};

const BLANK_DRAFT = {
  title:      '',
  content:    '',
  type:       'fact' as MemoryType,
  tags:       [] as string[],
  source:     'import',
  confidence: 0.8,
};

export default function MemoryPage({ onNavigate }: Props) {
  const [memories,     setMemories]     = useState<MemoryRecord[]>([]);
  const [query,        setQuery]        = useState('');
  const [typeFilter,   setTypeFilter]   = useState<MemoryType | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [selected,     setSelected]     = useState<MemoryRecord | null>(null);
  const [editing,      setEditing]      = useState(false);
  const [isNew,        setIsNew]        = useState(false);
  const [draft,        setDraft]        = useState({ ...BLANK_DRAFT });
  const [visibility,   setVisibility]   = useState<'private' | 'project-only' | 'system'>('private');
  const [tagInput,     setTagInput]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [savedNotice,  setSavedNotice]  = useState<string | null>(null);
  const [rev,          setRev]          = useState(0);

  const refresh = () => setRev(r => r + 1);

  useEffect(() => {
    let alive = true;
    memoryService.list(DEMO_USER_ID, {
      query:    query || undefined,
      type:     typeFilter === 'all' ? undefined : typeFilter,
      archived: showArchived,
    })
      .then(r => { if (alive) setMemories(r); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [query, typeFilter, showArchived, rev]);

  function openNew() {
    setSelected(null);
    setDraft({ ...BLANK_DRAFT });
    setVisibility('private');
    setTagInput('');
    setEditing(true);
    setIsNew(true);
  }

  function openDetail(m: MemoryRecord) {
    setSelected(m);
    setEditing(false);
    setIsNew(false);
  }

  function openEdit(m: MemoryRecord) {
    setDraft({
      title:      m.title,
      content:    m.content,
      type:       m.type,
      tags:       m.tags,
      source:     m.source,
      confidence: m.confidence,
    });
    setVisibility(m.visibility ?? 'private');
    setTagInput(m.tags.join(', '));
    setEditing(true);
    setIsNew(false);
  }

  async function save() {
    if (!draft.title.trim()) return;
    setSaving(true);
    setError(null);
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    const data = { ...draft, tags, visibility };
    try {
      if (isNew) {
        const created = await memoryService.create(DEMO_USER_ID, data);
        setSelected(created);
        setSavedNotice('Memory created.');
      } else if (selected) {
        await memoryService.update(DEMO_USER_ID, selected.id, data);
        setSelected({ ...selected, ...data, updatedAt: new Date().toISOString() });
        setSavedNotice('Memory updated.');
      }
      setEditing(false);
      setIsNew(false);
      refresh();
      setTimeout(() => setSavedNotice(null), 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(m: MemoryRecord) {
    await memoryService.archive(DEMO_USER_ID, m.id);
    setSelected(null);
    refresh();
  }

  async function handleDelete(m: MemoryRecord) {
    await memoryService.delete(DEMO_USER_ID, m.id);
    setSelected(null);
    refresh();
  }

  function cancelEdit() {
    setEditing(false);
    setIsNew(false);
    if (isNew) setSelected(null);
  }

  return (
    <div className="memory-page">
      {/* ── Left sidebar: list ─────────────────────────────────── */}
      <aside className="mem-sidebar">
        <div className="mem-sidebar-header">
          <div className="mem-sidebar-title-row">
            <span className="mem-sidebar-glyph">◐</span>
            <h1 className="mem-sidebar-title">MEMORY</h1>
          </div>
          <button className="mem-new-btn" onClick={openNew}>+ New</button>
        </div>

        <input
          className="mem-search"
          placeholder="Search memories…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <div className="mem-type-tabs">
          {ALL_TYPES.map(t => (
            <button
              key={t.id}
              className={`mem-type-tab ${typeFilter === t.id ? 'mem-type-tab--on' : ''}`}
              onClick={() => setTypeFilter(t.id as MemoryType | 'all')}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mem-toolbar">
          <button
            className={`mem-archive-toggle ${showArchived ? 'mem-archive-toggle--on' : ''}`}
            onClick={() => setShowArchived(v => !v)}
          >
            {showArchived ? 'Archived' : 'Active'}
          </button>
          <span className="mem-count">{memories.length}</span>
        </div>

        <div className="mem-list">
          {loading && (
            <div className="mem-state">
              <span className="mem-spinner" />
              Loading memory archive…
            </div>
          )}
          {error && (
            <div className="mem-state mem-state--error">
              <strong>Memory could not load.</strong>
              <span>{error}</span>
              <button onClick={refresh}>Retry</button>
            </div>
          )}
          {!loading && !error && memories.length === 0 && (
            <div className="mem-empty">
              <div className="mem-empty-glyph">◐</div>
              <strong>{query ? 'No matching memories.' : showArchived ? 'No archived memories.' : 'No memories yet.'}</strong>
              <span>{query ? 'Try a wider search or clear the filters.' : 'Import one fact, preference, goal, or project note to give Abel something to work with.'}</span>
              {!query && !showArchived && <button onClick={openNew}>Create first memory</button>}
            </div>
          )}
          {!loading && !error && memories.map(m => (
            <button
              key={m.id}
              className={`mem-item ${selected?.id === m.id ? 'mem-item--sel' : ''}`}
              onClick={() => openDetail(m)}
            >
              <div className="mem-item-top">
                <span className="mem-item-title">{m.title || 'Untitled'}</span>
                <span className="mem-item-type" style={{ color: TYPE_COLOR[m.type] }}>
                  {m.type}
                </span>
              </div>
              <div className="mem-item-preview">
                {m.content.slice(0, 72)}{m.content.length > 72 ? '…' : ''}
              </div>
              <div className="mem-item-footer">
                <span className="mem-item-date">
                  {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {m.tags[0] && <span className="mem-item-tag">{m.tags[0]}</span>}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Right panel: detail / edit ─────────────────────────── */}
      <main className="mem-main">
        {/* Empty state */}
        {!editing && !selected && (
          <div className="mem-placeholder">
            <div className="mem-placeholder-glyph">◐</div>
            <p className="mem-placeholder-text">Select a memory, create one, or start from a chat.</p>
            <div className="mem-placeholder-actions">
              <button onClick={openNew}>New memory</button>
              <button onClick={() => onNavigate('archive')}>Open chat</button>
              <button onClick={() => onNavigate('graph')}>View atlas</button>
            </div>
          </div>
        )}

        {/* Detail view */}
        {selected && !editing && (
          <div className="mem-detail">
            <div className="mem-detail-header">
              <div className="mem-detail-header-left">
                <span className="mem-detail-type" style={{ color: TYPE_COLOR[selected.type] }}>
                  {selected.type.toUpperCase()}
                </span>
                <h2 className="mem-detail-title">{selected.title}</h2>
              </div>
              <div className="mem-detail-actions">
                <button className="mem-btn" onClick={() => openEdit(selected)}>Edit</button>
                {!selected.archived && (
                  <button className="mem-btn mem-btn--warn" onClick={() => handleArchive(selected)}>Archive</button>
                )}
                <button className="mem-btn mem-btn--danger" onClick={() => handleDelete(selected)}>Delete</button>
              </div>
            </div>

            <div className="mem-detail-meta">
              <span>Confidence <strong>{Math.round(selected.confidence * 100)}%</strong></span>
              <span className="mem-meta-sep">·</span>
              <span>Source <strong>{selected.source}</strong></span>
              <span className="mem-meta-sep">·</span>
              <span>{new Date(selected.createdAt).toLocaleDateString()}</span>
            </div>

            {selected.tags.length > 0 && (
              <div className="mem-tags">
                {selected.tags.map(t => <span key={t} className="mem-tag">{t}</span>)}
              </div>
            )}

            <div className="mem-detail-accent" />
            <div className="mem-detail-body">{selected.content}</div>
          </div>
        )}

        {/* Create / Edit form */}
        {editing && (
          <div className="mem-form">
            <h2 className="mem-form-title">{isNew ? 'NEW MEMORY' : 'EDIT MEMORY'}</h2>
            {error && <div className="mem-form-error">{error}</div>}
            {savedNotice && <div className="mem-form-success">{savedNotice}</div>}

            <label className="mem-label">Title</label>
            <input
              className="mem-input"
              placeholder="Memory title…"
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            />

            <label className="mem-label">Type</label>
            <div className="mem-type-pills">
              {(['fact', 'goal', 'preference', 'project', 'skill', 'document', 'system'] as MemoryType[]).map(t => (
                <button
                  key={t}
                  className={`mem-type-pill ${draft.type === t ? 'mem-type-pill--on' : ''}`}
                  style={draft.type === t ? { borderColor: TYPE_COLOR[t], color: TYPE_COLOR[t] } : {}}
                  onClick={() => setDraft(d => ({ ...d, type: t }))}
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="mem-label">Content</label>
            <textarea
              className="mem-textarea"
              placeholder="What should Abel remember…"
              value={draft.content}
              rows={9}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
            />

            <label className="mem-label">Visibility</label>
            <div className="mem-type-pills">
              {(['private', 'project-only', 'system'] as const).map(v => (
                <button
                  key={v}
                  className={`mem-type-pill ${visibility === v ? 'mem-type-pill--on' : ''}`}
                  onClick={() => setVisibility(v)}
                >
                  {v}
                </button>
              ))}
            </div>

            <label className="mem-label">Tags <span className="mem-label-hint">(comma-separated)</span></label>
            <input
              className="mem-input"
              placeholder="productivity, focus, work…"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
            />

            <label className="mem-label">
              Confidence <span className="mem-label-hint">{Math.round(draft.confidence * 100)}%</span>
            </label>
            <input
              type="range"
              min={0} max={100} step={5}
              className="mem-slider"
              value={Math.round(draft.confidence * 100)}
              onChange={e => setDraft(d => ({ ...d, confidence: Number(e.target.value) / 100 }))}
            />

            <div className="mem-form-actions">
              <button
                className="mem-save-btn"
                onClick={save}
                disabled={saving || !draft.title.trim()}
              >
                {saving ? 'Saving…' : 'Save Memory'}
              </button>
              <button className="mem-cancel-btn" onClick={cancelEdit}>Cancel</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
