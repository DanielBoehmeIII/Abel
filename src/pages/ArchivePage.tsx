import { useState, useRef, useEffect } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId } from '../types/abel';
import { LLM_PROVIDERS, getMockAbelResponse, mockGenerateQuests } from '../config/llmProviders';
import { makeArchiveMessage } from '../state/abelStore';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import './ArchivePage.css';

interface Props { onNavigate: (page: PageId) => void; }

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  function sendMessage() {
    if (!input.trim() || !activeThreadId) return;

    const userMsg = makeArchiveMessage('user', input.trim());
    dispatch({ type: 'SEND_ARCHIVE_MESSAGE', threadId: activeThreadId, message: userMsg });
    setInput('');
    setIsTyping(true);

    // Simulate Abel response
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
      {/* Background */}
      <div className="archive-bg" />
      <div className="archive-crystal-glow" />

      {/* Left sidebar */}
      <aside className="archive-sidebar glass">
        <div className="archive-sidebar-header">
          <span className="heading">ARCHIVE</span>
          <GlowButton variant="ghost" size="sm" onClick={newThread}>+</GlowButton>
        </div>

        {/* Threads */}
        <div className="archive-threads">
          {archiveThreads.map(t => (
            <div
              key={t.id}
              className={`archive-thread-item ${t.id === activeThreadId ? 'archive-thread-item--active' : ''}`}
              onClick={() => setActiveThreadId(t.id)}
            >
              <p className="archive-thread-title">{t.title}</p>
              <p className="caption">{t.messages.length} messages</p>
            </div>
          ))}
        </div>

        <div className="archive-sidebar-footer">
          <p className="heading" style={{ marginBottom: '8px' }}>QUICK ACTIONS</p>
          <GlowButton variant="cyan" size="sm" style={{ width: '100%', marginBottom: '8px' }} onClick={generateQuests}>
            Generate Quests
          </GlowButton>
          <GlowButton variant="purple" size="sm" style={{ width: '100%', marginBottom: '8px' }} onClick={() => onNavigate('quests')}>
            View Quests
          </GlowButton>
          <GlowButton variant="ghost" size="sm" style={{ width: '100%' }} onClick={() => onNavigate('graph')}>
            Open Graph
          </GlowButton>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="archive-main">
        {/* Header */}
        <div className="archive-header">
          <div>
            <h2 className="display-md archive-title">DIGITAL ARCHIVE</h2>
            <p className="body" style={{ marginTop: '4px' }}>
              {activeThread?.title ?? 'Select a thread'} · {journeys.find(j => j.active)?.title}
            </p>
          </div>

          {/* Provider selector */}
          <div className="archive-provider-wrap">
            <button
              className="archive-provider-btn glass"
              onClick={() => setShowProviderMenu(v => !v)}
            >
              <span className="archive-provider-icon">{currentProvider.icon}</span>
              <span>{currentProvider.name}</span>
              <span className={`archive-provider-dot ${currentProvider.status}`} />
              <span className="caption">▾</span>
            </button>
            {showProviderMenu && (
              <div className="archive-provider-menu glass-2">
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
          {activeThread?.messages.map((msg, i) => (
            <div
              key={msg.id}
              className={`archive-msg ${msg.role === 'user' ? 'archive-msg--user' : 'archive-msg--abel'} animate-fade-in`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {msg.role === 'abel' && (
                <div className="archive-msg-avatar">◈</div>
              )}
              <div className="archive-msg-bubble glass">
                <p className="archive-msg-text">{msg.content}</p>
                <p className="caption" style={{ marginTop: '6px', opacity: 0.5 }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="archive-msg archive-msg--abel">
              <div className="archive-msg-avatar">◈</div>
              <div className="archive-typing glass">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="archive-input-wrap">
          <GlassPanel className="archive-input-bar" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', padding: '12px 16px' }}>
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
          </GlassPanel>
          <p className="caption" style={{ marginTop: '6px', textAlign: 'center' }}>
            Using <strong style={{ color: 'var(--text-2)' }}>{currentProvider.name}</strong> ·
            Shift+Enter for newline · Enter to send
          </p>
        </div>
      </main>

      {/* Right info panel */}
      <aside className="archive-info-panel">
        <GlassPanel style={{ padding: '20px' }}>
          <p className="heading" style={{ marginBottom: '12px' }}>ACTIVE JOURNEY</p>
          {journeys.filter(j => j.active).map(j => (
            <div key={j.id}>
              <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>{j.title}</p>
              <p className="body">{j.description}</p>
            </div>
          ))}
        </GlassPanel>

        <GlassPanel style={{ padding: '20px', marginTop: '12px' }}>
          <p className="heading" style={{ marginBottom: '12px' }}>ARCHETYPE</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--purple)', marginBottom: '4px' }}>
            {state.archetype.primary}
          </p>
          {state.archetype.secondary.map(s => (
            <span key={s} className="pill rarity-common" style={{ marginRight: '6px', marginTop: '4px' }}>{s}</span>
          ))}
        </GlassPanel>

        <GlassPanel style={{ padding: '20px', marginTop: '12px' }}>
          <p className="heading" style={{ marginBottom: '12px' }}>WHAT ABEL CAN DO</p>
          {[
            'Generate quests from your goals',
            'Save insights to the graph',
            'Create memories from reflections',
            'Update your archetype profile',
          ].map(item => (
            <p key={item} className="caption" style={{ marginBottom: '6px', paddingLeft: '10px', borderLeft: '2px solid var(--purple-dim)' }}>
              {item}
            </p>
          ))}
        </GlassPanel>
      </aside>
    </div>
  );
}
