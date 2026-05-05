import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import type { JournalEntry } from '../types';
import './JournalPage.css';

function uid() { return Math.random().toString(36).slice(2, 10); }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type View = 'list' | 'edit' | 'new';

export default function JournalPage({ onBack }: { onBack?: () => void }) {
  const { state, dispatch } = useApp();
  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Editor state
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  function startNew() {
    setTitle('');
    setText('');
    setTags([]);
    setTagInput('');
    setEditingId(null);
    setView('new');
  }

  function startEdit(e: JournalEntry) {
    setTitle(e.title);
    setText(e.text);
    setTags([...e.tags]);
    setTagInput('');
    setEditingId(e.id);
    setView('edit');
  }

  function cancelEdit() {
    setView('list');
    setEditingId(null);
  }

  function saveEntry() {
    if (!title.trim() && !text.trim()) return;
    const finalTitle = title.trim() || text.trim().split('\n')[0].slice(0, 60);
    if (view === 'new') {
      const entry: JournalEntry = {
        id: uid(),
        title: finalTitle,
        text: text.trim(),
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_JOURNAL_ENTRY', entry });
    } else if (editingId) {
      dispatch({
        type: 'EDIT_JOURNAL_ENTRY',
        id: editingId,
        updates: { title: finalTitle, text: text.trim(), tags },
      });
    }
    setView('list');
    setEditingId(null);
  }

  function deleteEntry(id: string) {
    dispatch({ type: 'DELETE_JOURNAL_ENTRY', id });
    if (editingId === id) setView('list');
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }

  const allTags = useMemo(() => {
    const set = new Set<string>();
    state.journalEntries.forEach(e => e.tags.forEach(t => set.add(t)));
    return [...set];
  }, [state.journalEntries]);

  const filtered = useMemo(() => {
    let list = state.journalEntries;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.text.toLowerCase().includes(q) ||
        e.tags.some(t => t.includes(q))
      );
    }
    if (activeTag) list = list.filter(e => e.tags.includes(activeTag));
    return list;
  }, [state.journalEntries, search, activeTag]);

  const totalEntries = state.journalEntries.length;

  return (
    <div className="journal-page">
      {/* Header */}
      <div className="jrn-header glass">
        <div className="jrn-header-left">
          <span className="jrn-logo">JOURNAL</span>
          <span className="jrn-commit">{totalEntries} entries · abel v2</span>
        </div>
        <div className="jrn-header-right">
          <input
            className="jrn-search"
            placeholder="Search entries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn" onClick={startNew}>+ New Entry</button>
        </div>
      </div>

      {/* Body */}
      <div className="jrn-body">
        {/* Sidebar */}
        <div className="jrn-sidebar glass">
          <div className="jrn-sidebar-title">Tags</div>
          <button
            className={`jrn-tag-filter ${!activeTag ? 'active' : ''}`}
            onClick={() => setActiveTag(null)}
          >All ({totalEntries})</button>
          {allTags.map(t => (
            <button
              key={t}
              className={`jrn-tag-filter ${activeTag === t ? 'active' : ''}`}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            >#{t}</button>
          ))}

          <div className="jrn-sidebar-divider" />
          <div className="jrn-sidebar-title">Stats</div>
          <div className="jrn-stat-row"><span>Entries</span><span className="neon-cyan">{totalEntries}</span></div>
          <div className="jrn-stat-row"><span>Tags</span><span className="neon-purple">{allTags.length}</span></div>
        </div>

        {/* Main panel */}
        {(view === 'new' || view === 'edit') ? (
          <div className="jrn-editor glass2 fade-in">
            <div className="jrn-editor-header">
              <input
                className="jrn-title-input"
                placeholder="Title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <div className="jrn-editor-actions">
                <button className="btn" onClick={saveEntry}>Save +20 XP</button>
                <button className="btn" onClick={cancelEdit}>Cancel</button>
                {editingId && (
                  <button className="btn" style={{ color: '#f87171' }} onClick={() => deleteEntry(editingId)}>Delete</button>
                )}
              </div>
            </div>
            <textarea
              className="jrn-text-area"
              placeholder="Write your entry..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="jrn-tag-input-row">
              <div className="jrn-preview-tags">
                {tags.map(t => (
                  <span key={t} className="jrn-tag">
                    #{t}
                    <button className="jrn-tag-del" onClick={() => setTags(prev => prev.filter(x => x !== t))}>✕</button>
                  </span>
                ))}
              </div>
              <input
                className="jrn-tag-input"
                placeholder="Add tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
              />
            </div>
          </div>
        ) : (
          <div className="jrn-list">
            {filtered.length === 0 && (
              <div className="jrn-empty">
                {search || activeTag ? 'No matching entries.' : 'No entries yet. Start writing.'}
              </div>
            )}
            {filtered.map(entry => (
              <div key={entry.id} className="jrn-entry-card glass" onClick={() => startEdit(entry)}>
                <div className="jrn-entry-header">
                  <span className="jrn-entry-title">{entry.title || '(Untitled)'}</span>
                  <span className="jrn-entry-date">{fmtDate(entry.createdAt)}</span>
                </div>
                <p className="jrn-entry-preview">{entry.text.slice(0, 160)}{entry.text.length > 160 ? '…' : ''}</p>
                <div className="jrn-preview-tags">
                  {entry.tags.map(t => <span key={t} className="jrn-tag">#{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="jrn-footer glass">
        <button className="jrn-footer-btn" onClick={onBack}>
          <span className="jrn-footer-icon">⌂</span>
          <span className="jrn-footer-label">Home</span>
        </button>
        <button className="jrn-footer-btn" onClick={startNew}>
          <span className="jrn-footer-icon">+</span>
          <span className="jrn-footer-label">New</span>
        </button>
        <button className="jrn-footer-btn" onClick={() => setSearch('')}>
          <span className="jrn-footer-icon">↻</span>
          <span className="jrn-footer-label">Clear</span>
        </button>
        <button className="jrn-footer-btn" onClick={onBack}>
          <span className="jrn-footer-icon">✕</span>
          <span className="jrn-footer-label">Exit</span>
        </button>
      </div>
    </div>
  );
}
