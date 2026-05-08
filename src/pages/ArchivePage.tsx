import React, { useState, useRef, useEffect } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId } from '../types/abel';
import { LLM_PROVIDERS, getMockAbelResponse, mockGenerateQuests } from '../config/llmProviders';
import { makeArchiveMessage } from '../state/abelStore';
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

export default function ArchivePage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { archiveThreads, settings, journeys, quests } = state;

  const [activeThreadId, setActiveThreadId] = useState(archiveThreads[0]?.id ?? null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeThread = archiveThreads.find(t => t.id === activeThreadId);
  const currentProvider = LLM_PROVIDERS.find(p => p.id === settings.llmProvider) ?? LLM_PROVIDERS[0];
  const activeJourney = journeys.find(j => j.active) ?? journeys[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  function sendMessage() {
    if (!input.trim() || !activeThreadId) return;
    const userMsg = makeArchiveMessage('user', input.trim());
    dispatch({ type: 'SEND_ARCHIVE_MESSAGE', threadId: activeThreadId, message: userMsg });
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const resp = getMockAbelResponse(input.trim());
      const abelMsg = makeArchiveMessage('abel', resp);
      dispatch({ type: 'SEND_ARCHIVE_MESSAGE', threadId: activeThreadId, message: abelMsg });
      setIsTyping(false);
    }, 900 + Math.random() * 600);
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
    const msg = makeArchiveMessage('abel', `Generated ${newQuests.length} new quests for **${journey.title}**. Navigate to Quests to see them.`);
    if (activeThreadId) dispatch({ type: 'SEND_ARCHIVE_MESSAGE', threadId: activeThreadId, message: msg });
  }

  function newThread() {
    const thread = {
      id: `at-${Date.now()}`,
      title: `Session ${archiveThreads.length + 1}`,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'CREATE_ARCHIVE_THREAD', thread });
    setActiveThreadId(thread.id);
  }

  return (
    <div className="archive-page">
      <CinematicIdleBackplate src="/scene/archive/archive.mp4" pingPong={false} className="cib-archive" />
      {/* Sidebar */}
      <aside className="archive-sidebar">
        <div className="archive-sidebar-top">
          <p className="archive-sidebar-eyebrow">THE ARCHIVE</p>
          <p className="archive-sidebar-subtitle" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 300, fontStyle: 'italic', color: 'var(--text-2)', marginTop: '4px', marginBottom: '16px' }}>
            {activeJourney?.title}
          </p>
          <button className="archive-new-btn" onClick={newThread}>
            <span>+</span> New Session
          </button>
        </div>

        <div className="archive-threads">
          {archiveThreads.map(t => (
            <div
              key={t.id}
              className={`archive-thread-item ${t.id === activeThreadId ? 'archive-thread-item--active' : ''}`}
              onClick={() => setActiveThreadId(t.id)}
            >
              <span className="archive-thread-glyph">◈</span>
              <div>
                <p className="archive-thread-title">{t.title}</p>
                <p className="caption">{t.messages.length} entries</p>
              </div>
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

      {/* Chamber */}
      <main className="archive-chamber">
        {/* Atmospheric crystal background */}
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
              {activeThread?.messages.length ?? 0} entries · {new Date().toLocaleDateString([], { month: 'long', day: 'numeric' })}
            </p>
          </div>

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

        {/* Messages */}
        <div className="archive-messages">
          {(!activeThread || activeThread.messages.length === 0) && (
            <div className="archive-empty">
              <div className="archive-empty-glyph">◈</div>
              <p className="archive-empty-text">Begin a reflection</p>
              <p className="caption">Share a goal, insight, or question with Abel.</p>
            </div>
          )}

          {activeThread?.messages.map((msg, i) => (
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
              <div className="archive-typing">
                <span /><span /><span />
              </div>
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
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Share a goal, insight, or question…"
              rows={2}
            />
            <GlowButton variant="purple" onClick={sendMessage} disabled={!input.trim()}>
              SEND
            </GlowButton>
          </div>
          <p className="caption archive-input-hint">
            {currentProvider.name} · Enter to send · Shift+Enter for newline
          </p>
        </div>
      </main>
    </div>
  );
}
