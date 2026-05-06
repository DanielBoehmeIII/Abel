import { useState } from 'react';
import { useAbel } from '../state/AbelProvider';
import type { PageId, LLMProvider, ThemeName, QuestIntensity } from '../types/abel';
import { LLM_PROVIDERS } from '../config/llmProviders';
import { SEED_STATE } from '../data/seed';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import './SettingsPage.css';

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
  const [activeSection, setActiveSection] = useState<string>('llm');

  function updateSetting<K extends keyof typeof settings>(key: K, value: typeof settings[K]) {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { [key]: value } });
  }

  function resetToSeed() {
    dispatch({ type: 'RESET_TO_SEED', seed: SEED_STATE });
    setConfirmReset(false);
  }

  const SECTIONS = [
    { id: 'llm',         label: 'LLM Provider' },
    { id: 'themes',      label: 'Themes' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'memory',      label: 'Memory' },
    { id: 'data',        label: 'Data & Privacy' },
    { id: 'access',      label: 'Accessibility' },
  ];

  return (
    <div className="settings-page">
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
                  <GlowButton variant="ghost" size="sm">Export Memories (JSON)</GlowButton>
                  <GlowButton variant="ghost" size="sm">Import Memories</GlowButton>
                  <GlowButton variant="danger" size="sm">Clear All Memories</GlowButton>
                </div>
                <p className="caption" style={{ marginTop: '10px' }}>Export/import not functional in MVP. Coming soon.</p>
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
