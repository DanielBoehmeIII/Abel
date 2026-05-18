import { useState, useEffect } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, LLMProvider, ThemeName, QuestIntensity } from '../types/abel';
import { LLM_PROVIDERS } from '../config/llmProviders';
import { SEED_STATE } from '../data/seed';
import { userService, DEMO_USER_ID, aiConfigService, memoryService } from '../db';
import type { AIConfigRecord } from '../db';
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

export default function SettingsPage({ onNavigate: _onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { settings, user, memories, quests, focusSessions } = state;
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('profile');

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

  useEffect(() => {
    aiConfigService.get(DEMO_USER_ID).then(cfg => {
      if (cfg) setAiCfg(cfg);
    });
  }, []);

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
    setAiCfgSaved(true);
    setTimeout(() => setAiCfgSaved(false), 2500);
  }

  async function exportMemories() {
    const records = await memoryService.list(DEMO_USER_ID, {});
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'abel-memories.json'; a.click();
    URL.revokeObjectURL(url);
  }

  const SECTIONS = [
    { id: 'profile',     label: 'Profile' },
    { id: 'ai-config',   label: 'AI Config' },
    { id: 'llm',         label: 'LLM Provider' },
    { id: 'themes',      label: 'Themes' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'memory',      label: 'Memory' },
    { id: 'data',        label: 'Data & Privacy' },
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
                {LLM_PROVIDERS.map(p => (
                  <div
                    key={p.id}
                    className={`settings-provider-card glass ${settings.llmProvider === p.id ? 'settings-provider-card--active' : ''}`}
                    onClick={() => updateSetting('llmProvider', p.id as LLMProvider)}
                  >
                    <div className="settings-provider-header">
                      <span className="settings-provider-icon">{p.icon}</span>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{p.name}</p>
                        <span className={`pill ${p.status === 'mock' ? 'status-active' : p.status === 'configured' ? 'status-completed' : 'status-locked'}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                    <p className="caption" style={{ marginTop: '10px', lineHeight: 1.6 }}>{p.description}</p>
                    {settings.llmProvider === p.id && (
                      <div className="settings-provider-selected">ACTIVE</div>
                    )}
                  </div>
                ))}
              </div>

              <GlassPanel style={{ padding: '16px', marginTop: '20px' }}>
                <p className="eyebrow" style={{ marginBottom: '6px', color: 'var(--text-3)' }}>API KEY CONFIGURATION</p>
                <p className="caption">Real provider API keys would be configured here. For this MVP, only Mock Abel is functional.</p>
              </GlassPanel>
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
                  <GlowButton variant="ghost" size="sm" onClick={exportMemories}>Export Memories (JSON)</GlowButton>
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
              <GlassPanel style={{ padding: '20px', marginBottom: '16px' }}>
                <p className="heading" style={{ marginBottom: '8px' }}>LOCAL STORAGE</p>
                <p className="body">
                  All data is stored locally in your browser's localStorage under the key <code>abel_v3</code>.
                  No data is sent to any server. Abel operates entirely offline.
                </p>
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

          {/* Accessibility */}
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
