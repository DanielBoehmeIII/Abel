import { useState, useEffect } from 'react';
import { useAbel } from '../state/useAbel';
import type { PageId, LLMProvider, ThemeName, QuestIntensity } from '../types/abel';
import { LLM_PROVIDERS, getProviderStatus } from '../config/llmProviders';
import { SEED_STATE } from '../data/seed';
import { userService, DEMO_USER_ID, aiConfigService, privacyService, auditLogService, adminService } from '../db';
import type { AIConfigRecord, AuditLogRecord } from '../db';
import { providerConfigService } from '../db/services/providerConfigService';
import type { AdminSummary } from '../db/services/adminService';
import { buildSystemPrompt } from '../lib/aiPipeline';
import { syncJobService } from '../db/services/syncJobService';
import SyncJobsPanel from '../components/sync/SyncJobsPanel';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import CinematicIdleBackplate from '../components/abel/CinematicIdleBackplate';
import './SettingsPage.css';

const TITLE_OPTIONS = [
  'Seeker of Clarity', 'Systems Architect', 'Creative Synthesist',
  'Deep Worker', 'Knowledge Builder', 'Pattern Finder', 'The Reflector',
];


interface Props { onNavigate: (page: PageId) => void; }

const THEMES: { id: ThemeName; label: string; preview: string }[] = [
  { id: 'dark',      label: 'Dark',      preview: '#080810' },
  { id: 'cinematic', label: 'Cinematic', preview: '#060412' },
  { id: 'minimal',   label: 'Minimal',   preview: '#111118' },
  { id: 'purple',    label: 'Purple',    preview: '#180a2e' },
  { id: 'gold',      label: 'Gold',      preview: '#18140a' },
  { id: 'light',     label: 'Light',     preview: '#f0f0f8' },
];

export default function SettingsPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { settings, user, memories, quests, focusSessions } = state;
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [syncRefresh, setSyncRefresh] = useState(0);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [confirmDeleteData, setConfirmDeleteData] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);

  // Profile edit state
  const [profileName,  setProfileName]  = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email ?? '');
  const [profileTitle, setProfileTitle] = useState(user.title);
  const [profileSaved, setProfileSaved] = useState(false);

  // AI Config state — loaded from IndexedDB on mount
  const [aiCfg, setAiCfg] = useState<Partial<AIConfigRecord>>({
    tone: 'philosophical', verbosity: 'balanced', expertiseLevel: 'intermediate',
    memoryUsageLevel: 'standard', responseFormat: 'narrative',
    customInstructions: '', projectFocus: '',
  });
  const [aiCfgSaved, setAiCfgSaved] = useState(false);

  // Provider config state
  const [provApiKey,   setProvApiKey]   = useState('');
  const [provModel,    setProvModel]    = useState('');
  const [provBaseUrl,  setProvBaseUrl]  = useState('');
  const [provSaved,    setProvSaved]    = useState(false);
  const [provCleared,  setProvCleared]  = useState(false);

  useEffect(() => {
    aiConfigService.get(DEMO_USER_ID).then(cfg => {
      if (cfg) {
        setAiCfg(cfg);
        setProvApiKey(cfg.apiKey ?? '');
        setProvModel(cfg.modelName ?? '');
        setProvBaseUrl(cfg.baseUrl ?? '');
      }
    });
  }, []);

  useEffect(() => {
    if (activeSection === 'data') {
      auditLogService.list(DEMO_USER_ID, 12).then(setAuditLogs).catch(() => setAuditLogs([]));
    }
    if (activeSection === 'admin') {
      adminService.summary().then(setAdminSummary).catch(() => setAdminSummary(null));
    }
  }, [activeSection, syncRefresh]);

  function updateSetting<K extends keyof typeof settings>(key: K, value: typeof settings[K]) {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { [key]: value } });
  }

  function resetToSeed() {
    dispatch({ type: 'RESET_TO_SEED', seed: SEED_STATE });
    setConfirmReset(false);
  }

  async function saveProfile() {
    await userService.upsert({
      id: DEMO_USER_ID,
      name: profileName.trim() || user.name,
      email: profileEmail.trim() || undefined,
      title: profileTitle,
      createdAt: user.createdAt,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  async function saveAiConfig() {
    await aiConfigService.upsert(DEMO_USER_ID, aiCfg);
    auditLogService.list(DEMO_USER_ID, 12).then(setAuditLogs).catch(() => undefined);
    setAiCfgSaved(true);
    setTimeout(() => setAiCfgSaved(false), 2500);
  }

  async function exportData() {
    setPrivacyError(null);
    const records = await privacyService.exportUserData(DEMO_USER_ID);
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'abel-data-export.json'; a.click();
    URL.revokeObjectURL(url);
    setPrivacyNotice('Data export prepared.');
    auditLogService.list(DEMO_USER_ID, 12).then(setAuditLogs).catch(() => undefined);
    setTimeout(() => setPrivacyNotice(null), 2600);
  }

  async function deleteAllUserData() {
    setPrivacyError(null);
    try {
      await privacyService.deleteUserData(DEMO_USER_ID);
      dispatch({
        type: 'RESET_TO_SEED',
        seed: {
          ...state,
          archiveThreads: [],
          memories: [],
          quests: [],
          focusSessions: [],
          graph: { nodes: [], edges: [] },
          skills: [],
          eggs: [],
          trophies: [],
          recentActivity: [],
        },
      });
      setConfirmDeleteData(false);
      setPrivacyNotice('Local user data deleted. Audit log retained.');
      auditLogService.list(DEMO_USER_ID, 12).then(setAuditLogs).catch(() => undefined);
      setTimeout(() => setPrivacyNotice(null), 3200);
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveProviderConfig() {
    const provider = settings.llmProvider;
    if (provider === 'mock') return;
    await providerConfigService.save(DEMO_USER_ID, {
      provider,
      apiKey: provApiKey,
      modelName: provModel,
      baseUrl: provBaseUrl,
    });
    setProvSaved(true);
    setTimeout(() => setProvSaved(false), 2500);
  }

  async function clearProviderConfig() {
    await providerConfigService.clear(DEMO_USER_ID);
    setProvApiKey('');
    setProvModel('');
    setProvBaseUrl('');
    setProvCleared(true);
    setTimeout(() => setProvCleared(false), 2500);
  }

  async function enqueueJob(type: Parameters<typeof syncJobService.create>[1], payload: Record<string, unknown> = {}) {
    await syncJobService.create(DEMO_USER_ID, type, payload);
    setSyncRefresh(r => r + 1);
  }

  async function enqueueTestJob(shouldFail = false) {
    await syncJobService.createTestJob(DEMO_USER_ID, shouldFail);
    setSyncRefresh(r => r + 1);
  }

  const SECTIONS = [
    { id: 'profile',     label: 'Profile' },
    { id: 'ai-config',   label: 'AI Config' },
    { id: 'llm',         label: 'LLM Provider' },
    { id: 'themes',      label: 'Themes' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'memory',      label: 'Memory' },
    { id: 'sync',        label: 'Sync Jobs' },
    { id: 'data',        label: 'Data & Privacy' },
    { id: 'admin',       label: 'Admin' },
    { id: 'access',      label: 'Accessibility' },
  ];

  return (
    <div className="settings-page">
      <CinematicIdleBackplate src="/scene/settings/settings.mp4" pingPong={false} className="cib-settings" />
      <div className="settings-layout">
        {/* Sidebar */}
        <aside className="settings-sidebar">
          <div className="settings-sidebar-logo">
            <p className="settings-sidebar-logo-mark">ABEL OS</p>
          </div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`settings-sidebar-item ${activeSection === s.id ? 'settings-sidebar-item--active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}

          <div className="settings-sidebar-profile">
            <div className="settings-avatar">A</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{user.name}</p>
              <p className="caption">{user.title}</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="settings-main">

          {/* Profile */}
          {activeSection === 'profile' && (
            <div className="settings-section animate-fade-in">
              <p className="eyebrow settings-section-eyebrow">IDENTITY</p>
              <h2 className="settings-section-title">Profile</h2>

              <GlassPanel style={{ padding: '24px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '16px' }}>DISPLAY NAME</p>
                <input
                  className="settings-text-input"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="Your name"
                  maxLength={60}
                />
              </GlassPanel>

              <GlassPanel style={{ padding: '24px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '16px' }}>EMAIL</p>
                <input
                  className="settings-text-input"
                  type="email"
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                  placeholder="your@email.com (optional)"
                />
                <p className="caption" style={{ marginTop: '8px' }}>Used for future sync and account recovery.</p>
              </GlassPanel>

              <GlassPanel style={{ padding: '24px', marginBottom: '24px' }}>
                <p className="heading" style={{ marginBottom: '16px' }}>TITLE</p>
                <div className="settings-radio-group" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  {TITLE_OPTIONS.map(t => (
                    <label key={t} className="settings-radio-item">
                      <input
                        type="radio"
                        name="title"
                        checked={profileTitle === t}
                        onChange={() => setProfileTitle(t)}
                      />
                      <span className="settings-radio-label">{t}</span>
                    </label>
                  ))}
                </div>
              </GlassPanel>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <GlowButton variant="cyan" onClick={saveProfile}>
                  Save Profile
                </GlowButton>
                {profileSaved && (
                  <span className="caption" style={{ color: 'var(--cyan, #00d4ff)' }}>
                    ✓ Saved
                  </span>
                )}
              </div>
            </div>
          )}

          {/* AI Config */}
          {activeSection === 'ai-config' && (
            <div className="settings-section animate-fade-in">
              <p className="eyebrow settings-section-eyebrow">BEHAVIOUR</p>
              <h2 className="settings-section-title">AI Configuration</h2>
              <p className="body" style={{ marginBottom: '24px' }}>
                Personalise how Abel thinks, speaks, and uses your memory.
                These settings are stored in your local database and feed into all AI interactions.
              </p>

              <GlassPanel style={{ padding: '20px', marginBottom: '14px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>TONE</p>
                <div className="settings-radio-group">
                  {(['formal','casual','philosophical','direct'] as const).map(v => (
                    <label key={v} className="settings-radio-item">
                      <input type="radio" name="ai-tone" checked={aiCfg.tone === v}
                        onChange={() => setAiCfg(c => ({ ...c, tone: v }))} />
                      <span className="settings-radio-label">{v.charAt(0).toUpperCase()+v.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel style={{ padding: '20px', marginBottom: '14px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>VERBOSITY</p>
                <div className="settings-radio-group">
                  {(['concise','balanced','verbose'] as const).map(v => (
                    <label key={v} className="settings-radio-item">
                      <input type="radio" name="ai-verb" checked={aiCfg.verbosity === v}
                        onChange={() => setAiCfg(c => ({ ...c, verbosity: v }))} />
                      <span className="settings-radio-label">{v.charAt(0).toUpperCase()+v.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel style={{ padding: '20px', marginBottom: '14px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>EXPERTISE LEVEL</p>
                <div className="settings-radio-group">
                  {(['beginner','intermediate','expert'] as const).map(v => (
                    <label key={v} className="settings-radio-item">
                      <input type="radio" name="ai-exp" checked={aiCfg.expertiseLevel === v}
                        onChange={() => setAiCfg(c => ({ ...c, expertiseLevel: v }))} />
                      <span className="settings-radio-label">{v.charAt(0).toUpperCase()+v.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel style={{ padding: '20px', marginBottom: '14px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>MEMORY USAGE</p>
                <div className="settings-radio-group">
                  {(['minimal','standard','deep'] as const).map(v => (
                    <label key={v} className="settings-radio-item">
                      <input type="radio" name="ai-mem" checked={aiCfg.memoryUsageLevel === v}
                        onChange={() => setAiCfg(c => ({ ...c, memoryUsageLevel: v }))} />
                      <span className="settings-radio-label">{v.charAt(0).toUpperCase()+v.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel style={{ padding: '20px', marginBottom: '14px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>RESPONSE FORMAT</p>
                <div className="settings-radio-group">
                  {(['structured','narrative','hybrid'] as const).map(v => (
                    <label key={v} className="settings-radio-item">
                      <input type="radio" name="ai-fmt" checked={aiCfg.responseFormat === v}
                        onChange={() => setAiCfg(c => ({ ...c, responseFormat: v }))} />
                      <span className="settings-radio-label">{v.charAt(0).toUpperCase()+v.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel style={{ padding: '20px', marginBottom: '20px' }}>
                <p className="heading" style={{ marginBottom: '10px' }}>PROJECT FOCUS</p>
                <input className="settings-text-input" placeholder="e.g. building a SaaS product"
                  value={aiCfg.projectFocus ?? ''}
                  onChange={e => setAiCfg(c => ({ ...c, projectFocus: e.target.value }))} />
                <p className="heading" style={{ margin: '14px 0 10px' }}>CUSTOM INSTRUCTIONS</p>
                <textarea className="settings-text-input" rows={4}
                  placeholder="Additional instructions Abel should always follow…"
                  value={aiCfg.customInstructions ?? ''}
                  onChange={e => setAiCfg(c => ({ ...c, customInstructions: e.target.value }))}
                  style={{ resize: 'vertical', minHeight: '90px' }}
                />
              </GlassPanel>

              <GlassPanel style={{ padding: '18px', marginBottom: '20px' }}>
                <p className="heading" style={{ marginBottom: '10px', color: 'var(--text-3)' }}>GENERATED PROMPT CONTEXT</p>
                <pre style={{ fontSize: '10px', lineHeight: 1.6, color: 'rgba(200,190,255,0.55)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                  {buildSystemPrompt(aiCfg as AIConfigRecord)}
                </pre>
              </GlassPanel>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <GlowButton variant="cyan" onClick={saveAiConfig}>Save AI Config</GlowButton>
                {aiCfgSaved && <span className="caption" style={{ color: 'var(--cyan)' }}>✓ Saved</span>}
              </div>
            </div>
          )}

          {/* LLM Provider */}
          {activeSection === 'llm' && (
            <div className="settings-section animate-fade-in">
              <p className="eyebrow settings-section-eyebrow">CONFIGURATION</p>
              <h2 className="settings-section-title">LLM Provider</h2>
              <p className="body" style={{ marginBottom: '24px' }}>
                Choose which AI powers Abel's planning and reflection capabilities.
                Mock Abel requires no API key and works offline.
              </p>

              <div className="settings-provider-grid">
                {LLM_PROVIDERS.map(p => {
                  const status = p.id === 'mock' ? 'active'
                    : settings.llmProvider === p.id ? 'active'
                    : getProviderStatus(p.id, aiCfg as AIConfigRecord | null);
                  const statusLabel = status === 'active' ? 'Active'
                    : status === 'configured' ? 'Configured'
                    : status === 'not-configured' ? 'Not configured'
                    : 'Mock only';
                  return (
                    <div
                      key={p.id}
                      className={`settings-provider-card glass ${settings.llmProvider === p.id ? 'settings-provider-card--active' : ''}`}
                      onClick={() => updateSetting('llmProvider', p.id as LLMProvider)}
                    >
                      <div className="settings-provider-header">
                        <span className="settings-provider-icon">{p.icon}</span>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {p.name}
                            {p.recommended && <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(34,211,238,0.85)', background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.22)', borderRadius: '3px', padding: '1px 5px', textTransform: 'uppercase' }}>RECOMMENDED</span>}
                          </p>
                          <span className={`pill ${status === 'active' ? 'status-active' : status === 'configured' ? 'status-completed' : 'status-locked'}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      <p className="caption" style={{ marginTop: '10px', lineHeight: 1.6 }}>{p.description}</p>
                      {settings.llmProvider === p.id && (
                        <div className="settings-provider-selected">ACTIVE</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Config form for non-mock providers */}
              {settings.llmProvider !== 'mock' && (
                <GlassPanel style={{ padding: '20px', marginTop: '20px' }}>
                  <p className="eyebrow" style={{ marginBottom: '12px', color: 'var(--text-3)' }}>
                    {settings.llmProvider === 'local' ? 'LOCAL PROVIDER CONFIGURATION' : 'API KEY CONFIGURATION'}
                  </p>

                  {settings.llmProvider === 'local' ? (
                    <div>
                      <p className="heading" style={{ marginBottom: '8px' }}>BASE URL</p>
                      <input
                        className="settings-text-input"
                        placeholder="http://localhost:11434"
                        value={provBaseUrl}
                        onChange={e => setProvBaseUrl(e.target.value)}
                      />
                      <p className="heading" style={{ margin: '14px 0 8px' }}>MODEL NAME</p>
                      <input
                        className="settings-text-input"
                        placeholder="llama3.2"
                        value={provModel}
                        onChange={e => setProvModel(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="heading" style={{ marginBottom: '8px' }}>API KEY</p>
                      <input
                        className="settings-text-input"
                        type="password"
                        placeholder={settings.llmProvider === 'claude' ? 'sk-ant-...' : 'sk-...'}
                        value={provApiKey}
                        onChange={e => setProvApiKey(e.target.value)}
                      />
                      <p className="heading" style={{ margin: '14px 0 8px' }}>MODEL NAME (optional)</p>
                      <input
                        className="settings-text-input"
                        placeholder={settings.llmProvider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o'}
                        value={provModel}
                        onChange={e => setProvModel(e.target.value)}
                      />
                    </div>
                  )}

                  <p className="caption" style={{ marginTop: '12px', color: 'rgba(240,192,64,0.8)' }}>
                    ⚠ Local-beta: API keys are stored in your browser's IndexedDB. Not intended for production use.
                  </p>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
                    <GlowButton variant="cyan" onClick={saveProviderConfig}>Save Config</GlowButton>
                    <GlowButton variant="ghost" onClick={clearProviderConfig}>Clear Config</GlowButton>
                    {provSaved && <span className="caption" style={{ color: 'var(--cyan)' }}>✓ Saved</span>}
                    {provCleared && <span className="caption" style={{ color: 'var(--text-3)' }}>Config cleared</span>}
                  </div>
                </GlassPanel>
              )}

              {settings.llmProvider === 'mock' && (
                <GlassPanel style={{ padding: '16px', marginTop: '20px' }}>
                  <p className="eyebrow" style={{ marginBottom: '6px', color: 'var(--text-3)' }}>MOCK MODE</p>
                  <p className="caption">Mock Abel uses built-in deterministic responses. No API key or configuration needed. Switch to a real provider to connect Claude, ChatGPT, or a local model.</p>
                </GlassPanel>
              )}
            </div>
          )}

          {/* Themes */}
          {activeSection === 'themes' && (
            <div className="settings-section animate-fade-in">
              <p className="eyebrow settings-section-eyebrow">APPEARANCE</p>
              <h2 className="settings-section-title">Themes</h2>
              <p className="body" style={{ marginBottom: '24px' }}>
                Visual themes affect backgrounds and accent colors. Dark and Cinematic are fully implemented.
              </p>
              <div className="settings-theme-grid">
                {THEMES.map(t => (
                  <div
                    key={t.id}
                    className={`settings-theme-card ${settings.theme === t.id ? 'settings-theme-card--active' : ''}`}
                    onClick={() => updateSetting('theme', t.id as ThemeName)}
                    style={{ background: t.preview }}
                  >
                    <div className="settings-theme-dot"
                      style={{ background: t.id === 'gold' ? '#f5c518' : t.id === 'purple' ? '#7c4dff' : 'white' }}
                    />
                    <span className="settings-theme-label">{t.label}</span>
                    {settings.theme === t.id && <span className="settings-theme-check">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preferences */}
          {activeSection === 'preferences' && (
            <div className="settings-section animate-fade-in">
              <h2 className="settings-section-title">Preferences</h2>

              <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '14px' }}>QUEST INTENSITY</p>
                <div className="settings-radio-group">
                  {(['gentle', 'balanced', 'intense'] as QuestIntensity[]).map(q => (
                    <label key={q} className="settings-radio-item">
                      <input
                        type="radio" name="intensity" checked={settings.questIntensity === q}
                        onChange={() => updateSetting('questIntensity', q)}
                      />
                      <span className="settings-radio-label">{q.charAt(0).toUpperCase() + q.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '14px' }}>DEFAULT FOCUS DURATION</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[15, 25, 45, 60, 90, 120].map(d => (
                    <GlowButton
                      key={d}
                      variant={settings.focusDefaults.duration === d ? 'cyan' : 'ghost'}
                      size="sm"
                      onClick={() => dispatch({ type: 'UPDATE_SETTINGS', settings: { focusDefaults: { ...settings.focusDefaults, duration: d } } })}
                    >
                      {d}m
                    </GlowButton>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel style={{ padding: '20px' }}>
                <p className="heading" style={{ marginBottom: '14px' }}>NOTIFICATION STYLE</p>
                <div className="settings-radio-group">
                  {(['subtle', 'prominent', 'none'] as const).map(n => (
                    <label key={n} className="settings-radio-item">
                      <input
                        type="radio" name="notif" checked={settings.notificationStyle === n}
                        onChange={() => updateSetting('notificationStyle', n)}
                      />
                      <span className="settings-radio-label">{n.charAt(0).toUpperCase() + n.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </GlassPanel>
            </div>
          )}

          {/* Memory */}
          {activeSection === 'memory' && (
            <div className="settings-section animate-fade-in">
              <h2 className="settings-section-title">Memory</h2>
              <div className="settings-stats-row">
                <GlassPanel style={{ padding: '20px', flex: 1 }}>
                  <p className="heading" style={{ marginBottom: '6px' }}>MEMORIES</p>
                  <p className="settings-stat-big">{memories.length}</p>
                  <p className="caption">total captured</p>
                </GlassPanel>
                <GlassPanel style={{ padding: '20px', flex: 1 }}>
                  <p className="heading" style={{ marginBottom: '6px' }}>QUESTS</p>
                  <p className="settings-stat-big">{quests.filter(q => q.status === 'completed').length}</p>
                  <p className="caption">completed</p>
                </GlassPanel>
                <GlassPanel style={{ padding: '20px', flex: 1 }}>
                  <p className="heading" style={{ marginBottom: '6px' }}>FOCUS SESSIONS</p>
                  <p className="settings-stat-big">{focusSessions.length}</p>
                  <p className="caption">total sessions</p>
                </GlassPanel>
              </div>
              <GlassPanel style={{ padding: '20px', marginTop: '16px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>CONTROLS</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <GlowButton variant="ghost" size="sm" onClick={() => onNavigate('memory')}>Manage Memories</GlowButton>
                  <GlowButton variant="danger" size="sm">Clear All Memories</GlowButton>
                </div>
                <p className="caption" style={{ marginTop: '10px' }}>Export downloads all memories from IndexedDB as JSON.</p>
              </GlassPanel>
            </div>
          )}

          {/* Data */}
          {activeSection === 'data' && (
            <div className="settings-section animate-fade-in">
              <h2 className="settings-section-title">Data & Privacy</h2>
              {privacyNotice && (
                <GlassPanel style={{ padding: '14px', marginBottom: '16px', borderColor: 'rgba(52,211,153,0.28)' }}>
                  <p className="caption" style={{ color: 'rgba(165,255,215,0.82)' }}>{privacyNotice}</p>
                </GlassPanel>
              )}
              {privacyError && (
                <GlassPanel style={{ padding: '14px', marginBottom: '16px', borderColor: 'rgba(239,68,68,0.30)' }}>
                  <p className="caption" style={{ color: 'rgba(255,190,190,0.86)' }}>{privacyError}</p>
                </GlassPanel>
              )}
              <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '8px' }}>LOCAL STORAGE</p>
                <p className="body">
                  All data is stored locally in your browser's localStorage under the key <code>abel_v3</code>.
                  No data is sent to any server. Abel operates entirely offline.
                </p>
              </GlassPanel>
              <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>USER DATA CONTROLS</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <GlowButton variant="cyan" size="sm" onClick={exportData}>Export My Data</GlowButton>
                  <GlowButton variant="ghost" size="sm" onClick={() => onNavigate('memory')}>Memory Controls</GlowButton>
                  <GlowButton variant="ghost" size="sm" onClick={() => onNavigate('archive')}>Chat Controls</GlowButton>
                  <GlowButton variant="danger" size="sm" onClick={() => setConfirmDeleteData(true)}>Delete My Data</GlowButton>
                </div>
                {confirmDeleteData && (
                  <div style={{ marginTop: '14px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <p className="caption">This clears your local memories, chats, graph, jobs, AI config, and progress. Audit entries are retained.</p>
                    <GlowButton variant="danger" size="sm" onClick={deleteAllUserData}>CONFIRM DELETE</GlowButton>
                    <GlowButton variant="ghost" size="sm" onClick={() => setConfirmDeleteData(false)}>CANCEL</GlowButton>
                  </div>
                )}
              </GlassPanel>
              <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>AUDIT LOG</p>
                {auditLogs.length === 0 ? (
                  <p className="caption">No sensitive actions recorded yet.</p>
                ) : (
                  <div className="settings-audit-list">
                    {auditLogs.map(log => (
                      <div key={log.id} className="settings-audit-row">
                        <span>{log.action}</span>
                        <span>{log.status}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassPanel>
              <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>RESET DATA</p>
                {!confirmReset ? (
                  <GlowButton variant="danger" onClick={() => setConfirmReset(true)}>
                    Reset to Demo Data
                  </GlowButton>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <p className="caption">Are you sure? This will restore seed data.</p>
                    <GlowButton variant="danger" onClick={resetToSeed}>CONFIRM RESET</GlowButton>
                    <GlowButton variant="ghost" onClick={() => setConfirmReset(false)}>CANCEL</GlowButton>
                  </div>
                )}
              </GlassPanel>
            </div>
          )}

          {activeSection === 'admin' && (
            <div className="settings-section animate-fade-in">
              <p className="eyebrow settings-section-eyebrow">BETA ADMIN</p>
              <h2 className="settings-section-title">Admin Dashboard</h2>
              <p className="body" style={{ marginBottom: '20px' }}>
                Operational counts only. Private memory and chat contents are intentionally not shown here.
              </p>
              <div className="settings-stats-row">
                <GlassPanel style={{ padding: '20px', flex: 1 }}>
                  <p className="heading" style={{ marginBottom: '6px' }}>USERS</p>
                  <p className="settings-stat-big">{adminSummary?.userCount ?? '–'}</p>
                </GlassPanel>
                <GlassPanel style={{ padding: '20px', flex: 1 }}>
                  <p className="heading" style={{ marginBottom: '6px' }}>MEMORIES</p>
                  <p className="settings-stat-big">{adminSummary?.memoryCount ?? '–'}</p>
                </GlassPanel>
                <GlassPanel style={{ padding: '20px', flex: 1 }}>
                  <p className="heading" style={{ marginBottom: '6px' }}>CHATS</p>
                  <p className="settings-stat-big">{adminSummary?.chatCount ?? '–'}</p>
                </GlassPanel>
              </div>
              <GlassPanel style={{ padding: '20px', marginTop: '16px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>SYNC JOB STATUS</p>
                <div className="settings-admin-grid">
                  {adminSummary && Object.entries(adminSummary.syncJobStatus).map(([status, count]) => (
                    <div key={status} className="settings-admin-cell">
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </GlassPanel>
              <GlassPanel style={{ padding: '20px', marginTop: '16px' }}>
                <p className="heading" style={{ marginBottom: '12px' }}>RECENT ERRORS</p>
                {!adminSummary?.recentErrors.length ? (
                  <p className="caption">No recent blocked or failed sensitive actions.</p>
                ) : (
                  <div className="settings-audit-list">
                    {adminSummary.recentErrors.map(error => (
                      <div key={error.id} className="settings-audit-row">
                        <span>{error.action}</span>
                        <span>{error.status}</span>
                        <span>{error.error ?? error.resourceType}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassPanel>
            </div>
          )}

          {/* Accessibility */}
          {activeSection === 'sync' && (
            <div className="settings-section animate-fade-in">
              <p className="eyebrow settings-section-eyebrow">BACKGROUND PROCESSING</p>
              <h2 className="settings-section-title">Sync Jobs</h2>
              <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '12px', color: 'var(--text-3)' }}>ENQUEUE JOB</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <GlowButton
                    variant="cyan"
                    size="sm"
                    onClick={() => enqueueTestJob(false)}
                  >
                    Test Success
                  </GlowButton>
                  <GlowButton
                    variant="danger"
                    size="sm"
                    onClick={() => enqueueTestJob(true)}
                  >
                    Test Failure
                  </GlowButton>
                  <GlowButton
                    variant="ghost"
                    size="sm"
                    onClick={() => enqueueJob('memory_import', {
                      title: 'Manual memory import',
                      text: 'This memory was imported by a background sync job.',
                    })}
                  >
                    Memory Import
                  </GlowButton>
                  <GlowButton
                    variant="ghost"
                    size="sm"
                    onClick={() => enqueueJob('chat_summary')}
                  >
                    Chat Summary
                  </GlowButton>
                  <GlowButton
                    variant="ghost"
                    size="sm"
                    onClick={() => enqueueJob('graph_refresh')}
                  >
                    Graph Refresh
                  </GlowButton>
                  <GlowButton
                    variant="ghost"
                    size="sm"
                    onClick={() => enqueueJob('embedding_refresh')}
                  >
                    Embed Refresh
                  </GlowButton>
                </div>
                <p className="caption" style={{ marginTop: '10px' }}>
                  The local browser worker polls IndexedDB and runs pending jobs automatically.
                </p>
              </GlassPanel>
              <GlassPanel style={{ padding: '20px' }}>
                <SyncJobsPanel refreshSignal={syncRefresh} />
              </GlassPanel>
            </div>
          )}

          {activeSection === 'access' && (
            <div className="settings-section animate-fade-in">
              <h2 className="settings-section-title">Accessibility</h2>
              <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
                <div className="settings-toggle-row">
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)' }}>Reduce Motion</p>
                    <p className="caption">Disables animations and parallax effects</p>
                  </div>
                  <button
                    className={`settings-toggle ${settings.reduceMotion ? 'settings-toggle--on' : ''}`}
                    onClick={() => updateSetting('reduceMotion', !settings.reduceMotion)}
                  >
                    <div className="settings-toggle-thumb" />
                  </button>
                </div>
              </GlassPanel>
              <GlassPanel style={{ padding: '20px' }}>
                <p className="heading" style={{ marginBottom: '14px' }}>FONT SIZE</p>
                <div className="settings-radio-group">
                  {(['small', 'medium', 'large'] as const).map(f => (
                    <label key={f} className="settings-radio-item">
                      <input
                        type="radio" name="fontsize" checked={settings.fontSize === f}
                        onChange={() => updateSetting('fontSize', f)}
                      />
                      <span className="settings-radio-label">{f.charAt(0).toUpperCase() + f.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </GlassPanel>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
