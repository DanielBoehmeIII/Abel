import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId } from '../types/abel';
import { LLM_PROVIDERS, mockGenerateQuests } from '../config/llmProviders';
import { chatService, memoryService, aiConfigService, DEMO_USER_ID } from '../db';
import type { ChatThreadRecord, ChatMessageRecord, AIConfigRecord } from '../db';
import { generateResponse } from '../lib/aiPipeline';
import { retrieveContext } from '../lib/contextEngine';
import type { RetrievedContext } from '../lib/contextEngine';
import GlowButton from '../components/common/GlowButton';
import CinematicIdleBackplate from '../components/abel/CinematicIdleBackplate';
import './ArchivePage.css';

interface Props { onNavigate: (page: PageId) => void; }

function parseAbelText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ color: 'rgba(210,185,255,0.95)', fontWeight: 500 }}>{part.slice(2, -2)}</strong>
      : part
  );
}

function buildSummary(thread: ChatThreadRecord, messages: ChatMessageRecord[]): string {
  const abelMsgs = messages.filter(m => m.role === 'abel').slice(0, 10);
  const userMsgs = messages.filter(m => m.role === 'user').slice(0, 5);
  const intro = `Conversation: "${thread.title}" (${messages.length} messages).\n\n`;
  const context = userMsgs.length ? `User topics:\n${userMsgs.map(m => '– ' + m.content.slice(0, 120)).join('\n')}\n\n` : '';
  const responses = abelMsgs.length ? `Abel responses:\n${abelMsgs.map(m => m.content.slice(0, 280)).join('\n\n')}` : '';
  return (intro + context + responses).slice(0, 3000);
}

export default function ArchivePage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { settings, journeys, quests } = state;

  // ── DB-backed state ────────────────────────────────────────────────────────
  const [threads,        setThreads]        = useState<ChatThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages,       setMessages]       = useState<ChatMessageRecord[]>([]);
  const [search,         setSearch]         = useState('');
  const [renamingId,     setRenamingId]     = useState<string | null>(null);
  const [renameVal,      setRenameVal]      = useState('');
  const [summarized,     setSummarized]     = useState<string | null>(null);
  const [debugMode,      setDebugMode]      = useState(() => localStorage.getItem('abel_debug') === '1');
  const [debugCtx,       setDebugCtx]       = useState<RetrievedContext | null>(null);
  const aiCfgRef = useRef<AIConfigRecord | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [input,            setInput]            = useState('');
  const [isTyping,         setIsTyping]         = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const activeThread = threads.find(t => t.id === activeThreadId) ?? null;
  const currentProvider = LLM_PROVIDERS.find(p => p.id === settings.llmProvider) ?? LLM_PROVIDERS[0];
  const activeJourney = journeys.find(j => j.active) ?? journeys[0];

  const visibleThreads = search.trim()
    ? threads.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : threads;

  // ── Load threads from IndexedDB ────────────────────────────────────────────
  const loadThreads = useCallback(() => {
    chatService.listThreads(DEMO_USER_ID).then(ts => {
      setThreads(ts);
      if (!activeThreadId && ts.length > 0) setActiveThreadId(ts[0].id);
    });
  }, [activeThreadId]);

  useEffect(() => {
    loadThreads();
    aiConfigService.get(DEMO_USER_ID).then(cfg => { if (cfg) aiCfgRef.current = cfg; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load messages when thread changes ──────────────────────────────────────
  useEffect(() => {
    const id = activeThreadId;
    (id ? chatService.getMessages(id) : Promise.resolve<ChatMessageRecord[]>([])).then(setMessages);
  }, [activeThreadId]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Focus rename input ─────────────────────────────────────────────────────
  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!input.trim() || !activeThreadId) return;
    const text = input.trim();
    setInput('');

    const userMsg = await chatService.appendMessage(activeThreadId, DEMO_USER_ID, 'user', text);
    setMessages(m => [...m, userMsg]);
    setIsTyping(true);

    setTimeout(async () => {
      const cfg = aiCfgRef.current;
      const memLevel = cfg?.memoryUsageLevel ?? 'standard';
      const ctx = await retrieveContext(DEMO_USER_ID, text, { memoryUsageLevel: memLevel });
      setDebugCtx(ctx);
      const resp = cfg
        ? generateResponse(text, cfg, { journeyTitle: activeJourney?.title, projectFocus: cfg.projectFocus, retrievedContext: ctx.compressed })
        : generateResponse(text, { tone: 'philosophical', verbosity: 'balanced', expertiseLevel: 'intermediate', memoryUsageLevel: 'standard', responseFormat: 'narrative', id: '', userId: '', createdAt: '', updatedAt: '' }, { retrievedContext: ctx.compressed });
      const abelMsg = await chatService.appendMessage(activeThreadId, DEMO_USER_ID, 'abel', resp);
      setMessages(m => [...m, abelMsg]);
      setIsTyping(false);
    }, 900 + Math.random() * 600);
  }

  async function newThread() {
    const n = threads.length + 1;
    const thread = await chatService.createThread(DEMO_USER_ID, `Session ${n}`, activeJourney?.id);
    setThreads(ts => [thread, ...ts]);
    setActiveThreadId(thread.id);
    setMessages([]);
  }

  async function commitRename() {
    if (!renamingId || !renameVal.trim()) { setRenamingId(null); return; }
    await chatService.renameThread(renamingId, renameVal.trim());
    setThreads(ts => ts.map(t => t.id === renamingId ? { ...t, title: renameVal.trim() } : t));
    setRenamingId(null);
  }

  async function archiveThread(id: string) {
    await chatService.archiveThread(id);
    setThreads(ts => ts.filter(t => t.id !== id));
    if (activeThreadId === id) {
      const remaining = threads.filter(t => t.id !== id);
      setActiveThreadId(remaining[0]?.id ?? null);
    }
  }

  async function toggleContext(t: ChatThreadRecord) {
    await chatService.setThreadContext(t.id, !t.useAsContext);
    setThreads(ts => ts.map(x => x.id === t.id ? { ...x, useAsContext: !x.useAsContext } : x));
  }

  async function summarizeToMemory() {
    if (!activeThread || messages.length === 0) return;
    const content = buildSummary(activeThread, messages);
    await memoryService.create(DEMO_USER_ID, {
      title:      `Archive: ${activeThread.title}`,
      content,
      type:       'document',
      source:     'archive',
      tags:       ['chat', 'archive', activeThread.id],
      confidence: 0.7,
    });
    setSummarized(activeThread.id);
    setTimeout(() => setSummarized(null), 3000);
  }

  function generateQuests() {
    const journey = journeys.find(j => j.active) ?? journeys[0];
    if (!journey) return;
    const newQuests = mockGenerateQuests(journey.id, journey.goal);
    for (const q of newQuests) {
      if (!quests.find(existing => existing.title === q.title)) {
        dispatch({ type: 'ADD_QUEST', quest: q as typeof quests[0] });
      }
    }
    if (activeThreadId) {
      chatService.appendMessage(activeThreadId, DEMO_USER_ID, 'abel',
        `Generated ${newQuests.length} new quests for **${journey.title}**. Navigate to Quests to see them.`
      ).then(msg => setMessages(m => [...m, msg]));
    }
  }

  // Ctrl+Shift+D toggles debug panel
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(v => {
          const next = !v;
          localStorage.setItem('abel_debug', next ? '1' : '0');
          return next;
        });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="archive-page">
      <CinematicIdleBackplate src="/scene/archive/archive.mp4" pingPong={false} className="cib-archive" />

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="archive-sidebar">
        <div className="archive-sidebar-top">
          <p className="archive-sidebar-eyebrow">THE ARCHIVE</p>
          <p className="archive-sidebar-subtitle" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 300, fontStyle: 'italic', color: 'var(--text-2)', marginTop: '4px', marginBottom: '16px' }}>
            {activeJourney?.title}
          </p>
          <button className="archive-new-btn" onClick={newThread}>
            <span>+</span> New Session
          </button>

          {/* Search */}
          <input
            className="archive-search"
            placeholder="Search sessions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="archive-threads">
          {visibleThreads.length === 0 && (
            <p className="archive-threads-empty">
              {search ? 'No matching sessions.' : 'No sessions yet.'}
            </p>
          )}
          {visibleThreads.map(t => (
            <div
              key={t.id}
              className={`archive-thread-item ${t.id === activeThreadId ? 'archive-thread-item--active' : ''}`}
              onClick={() => setActiveThreadId(t.id)}
            >
              <span className="archive-thread-glyph">◈</span>
              <div className="archive-thread-body">
                {renamingId === t.id ? (
                  <input
                    ref={renameRef}
                    className="archive-rename-input"
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <p className="archive-thread-title">{t.title}</p>
                )}
                <div className="archive-thread-meta">
                  {t.useAsContext && <span className="archive-ctx-badge">CTX</span>}
                  <span className="caption">{new Date(t.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              {t.id === activeThreadId && (
                <div className="archive-thread-actions" onClick={e => e.stopPropagation()}>
                  <button title="Rename" onClick={() => { setRenamingId(t.id); setRenameVal(t.title); }}>✎</button>
                  <button title={t.useAsContext ? 'Remove from context' : 'Use as context'} onClick={() => toggleContext(t)}>
                    {t.useAsContext ? '◉' : '○'}
                  </button>
                  <button title="Archive" onClick={() => archiveThread(t.id)}>⌫</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="archive-sidebar-context">
          {activeJourney && (
            <div className="archive-context-block">
              <p className="archive-context-label">JOURNEY</p>
              <p className="archive-context-val">{activeJourney.title}</p>
            </div>
          )}
          <div className="archive-context-block">
            <p className="archive-context-label">ARCHETYPE</p>
            <p className="archive-context-val" style={{ color: 'var(--purple-light, rgba(200,175,255,0.9))' }}>
              {state.archetype.primary}
            </p>
          </div>
          <div className="archive-sidebar-actions">
            <button className="archive-action-btn" onClick={generateQuests}>Generate Quests</button>
            <button className="archive-action-btn" onClick={() => onNavigate('quests')}>View Quests</button>
            <button className="archive-action-btn" onClick={() => onNavigate('graph')}>Open Graph</button>
          </div>
        </div>
      </aside>

      {/* ── Chamber ─────────────────────────────────────────────────────────── */}
      <main className="archive-chamber">
        <div className="archive-chamber-bg" aria-hidden>
          <svg className="archive-crystal-svg" viewBox="0 0 400 400" fill="none">
            <g opacity="0.045" stroke="rgba(180,140,255,1)" strokeWidth="0.6">
              <polygon points="200,80 260,160 240,260 160,260 140,160" />
              <polygon points="200,100 250,168 233,252 167,252 150,168" />
              <line x1="200" y1="80" x2="200" y2="260" />
              <line x1="200" y1="80" x2="140" y2="160" />
              <line x1="200" y1="80" x2="260" y2="160" />
              <line x1="160" y1="260" x2="240" y2="260" />
            </g>
            <circle cx="200" cy="172" r="60" stroke="rgba(139,92,246,0.06)" strokeWidth="0.5" fill="none" />
            <circle cx="200" cy="172" r="100" stroke="rgba(139,92,246,0.04)" strokeWidth="0.5" fill="none" />
            <circle cx="200" cy="172" r="4" fill="rgba(200,175,255,0.15)" />
          </svg>
          <div className="archive-chamber-glow" />
        </div>

        {/* Header */}
        <div className="archive-chamber-header">
          <div>
            <h2 className="archive-chamber-title">
              {activeThread?.title ?? 'Select a Session'}
            </h2>
            <p className="caption" style={{ marginTop: '3px', color: 'var(--text-4)' }}>
              {messages.length} entries · {new Date().toLocaleDateString([], { month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="archive-header-right">
            {/* Summarize to memory */}
            {activeThread && messages.length > 0 && (
              <button
                className={`archive-summarize-btn ${summarized === activeThread.id ? 'archive-summarize-btn--done' : ''}`}
                onClick={summarizeToMemory}
                title="Summarize this session into a memory"
              >
                {summarized === activeThread.id ? '✓ Saved to Memory' : '→ Memory'}
              </button>
            )}

            <div className="archive-provider-wrap">
              <button className="archive-provider-btn" onClick={() => setShowProviderMenu(v => !v)}>
                <span className="archive-provider-icon">{currentProvider.icon}</span>
                <span>{currentProvider.name}</span>
                <span className={`archive-provider-dot ${currentProvider.status}`} />
              </button>
              {showProviderMenu && (
                <div className="archive-provider-menu">
                  {LLM_PROVIDERS.map(p => (
                    <div
                      key={p.id}
                      className={`archive-provider-item ${p.id === settings.llmProvider ? 'archive-provider-item--active' : ''}`}
                      onClick={() => {
                        dispatch({ type: 'UPDATE_SETTINGS', settings: { llmProvider: p.id } });
                        setShowProviderMenu(false);
                      }}
                    >
                      <span>{p.icon} {p.name}</span>
                      <span className={`archive-provider-dot ${p.status}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="archive-messages">
          {(!activeThread || messages.length === 0) && (
            <div className="archive-empty">
              <div className="archive-empty-glyph">◈</div>
              <p className="archive-empty-text">Begin a reflection</p>
              <p className="caption">Share a goal, insight, or question with Abel.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={msg.id}
              className={`archive-msg ${msg.role === 'user' ? 'archive-msg--user' : 'archive-msg--abel'} animate-fade-in`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              {msg.role === 'abel' && <div className="archive-abel-mark">◈</div>}
              <div className={`archive-msg-content ${msg.role === 'user' ? 'archive-msg-content--user' : ''}`}>
                <p className="archive-msg-text">
                  {msg.role === 'abel' ? parseAbelText(msg.content) : msg.content}
                </p>
                <p className="archive-msg-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="archive-msg archive-msg--abel">
              <div className="archive-abel-mark">◈</div>
              <div className="archive-typing"><span /><span /><span /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="archive-input-wrap">
          <div className="archive-input-inner">
            <textarea
              className="archive-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={activeThread ? 'Share a goal, insight, or question…' : 'Create or select a session to begin.'}
              rows={2}
              disabled={!activeThread}
            />
            <GlowButton variant="purple" onClick={sendMessage} disabled={!input.trim() || !activeThread}>
              SEND
            </GlowButton>
          </div>
          <p className="caption archive-input-hint">
            {currentProvider.name} · Enter to send · Shift+Enter for newline
          </p>
        </div>
      </main>

      {/* ── Debug panel (Ctrl+Shift+D) ───────────────────────────────────── */}
      {debugMode && debugCtx && (
        <div className="archive-debug-panel">
          <div className="archive-debug-header">
            <span className="archive-debug-title">CONTEXT DEBUG</span>
            <span className="archive-debug-meta">{debugCtx.durationMs}ms · {debugCtx.topSources.length}/{debugCtx.sources.length} sources · {debugCtx.conflicts.length} conflicts</span>
            <button className="archive-debug-close" onClick={() => setDebugMode(false)}>✕</button>
          </div>

          <div className="archive-debug-query">Query: <em>{debugCtx.query}</em></div>

          <div className="archive-debug-section">TOP SOURCES</div>
          <div className="archive-debug-sources">
            {debugCtx.topSources.map((s, i) => (
              <div key={s.id} className="archive-debug-source">
                <div className="archive-debug-source-top">
                  <span className="archive-debug-rank">#{i + 1}</span>
                  <span className="archive-debug-type">{s.type}</span>
                  <span className="archive-debug-score">{(s.score * 100).toFixed(0)}%</span>
                  <span className="archive-debug-src-title">{s.title}</span>
                </div>
                <div className="archive-debug-breakdown">
                  kw:{(s.breakdown.keyword*100).toFixed(0)}
                  {' '} tag:{(s.breakdown.tag*100).toFixed(0)}
                  {' '} rec:{(s.breakdown.recency*100).toFixed(0)}
                  {' '} conf:{(s.breakdown.confidence*100).toFixed(0)}
                  {s.breakdown.typeBoost > 0 ? ` +tb:${(s.breakdown.typeBoost*100).toFixed(0)}` : ''}
                </div>
                <div className="archive-debug-content">{s.content.slice(0, 120)}{s.content.length > 120 ? '…' : ''}</div>
              </div>
            ))}
          </div>

          {debugCtx.conflicts.length > 0 && (
            <>
              <div className="archive-debug-section archive-debug-section--warn">CONFLICTS</div>
              {debugCtx.conflicts.map((c, i) => (
                <div key={i} className="archive-debug-conflict">
                  <strong>{c.a.title}</strong> ↔ <strong>{c.b.title}</strong>
                  <span className="archive-debug-conflict-reason"> — {c.reason}</span>
                </div>
              ))}
            </>
          )}

          <div className="archive-debug-section">COMPRESSED CONTEXT</div>
          <pre className="archive-debug-compressed">{debugCtx.compressed || '(empty)'}</pre>
        </div>
      )}
    </div>
  );
}
