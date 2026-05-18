import { useEffect, useMemo, useState } from 'react';
import type { PageId, AITone, MemoryUsageLevel, ResponseFormat, LLMProvider } from '../../types/abel';
import { useAbel } from '../../state/useAbel';
import { aiConfigService, chatService, userService, providerConfigService, DEMO_USER_ID } from '../../db';
import { syncJobService } from '../../db/services/syncJobService';
import { LLM_PROVIDERS } from '../../config/llmProviders';
import { testProviderConnection } from '../../lib/aiPipeline';
import { retrieveContext } from '../../lib/contextEngine';
import GlowButton from '../common/GlowButton';
import './OnboardingFlow.css';

const ONBOARDING_KEY = 'abel_onboarding_complete_v1';

type StepId = 'provider' | 'profile' | 'ai' | 'memory' | 'atlas' | 'chat';

interface Step {
  id: StepId;
  label: string;
  glyph: string;
}

const STEPS: Step[] = [
  { id: 'provider', label: 'Intelligence', glyph: '◉' },
  { id: 'profile',  label: 'Identity',     glyph: '◈' },
  { id: 'ai',       label: 'Voice',        glyph: '◇' },
  { id: 'memory',   label: 'Memory',       glyph: '◐' },
  { id: 'atlas',    label: 'Atlas',        glyph: '⬡' },
  { id: 'chat',     label: 'First Signal', glyph: '◈' },
];

interface Props {
  onNavigate: (page: PageId) => void;
}

function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) !== '1';
  } catch {
    return false;
  }
}

export default function OnboardingFlow({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const [open, setOpen] = useState(() => shouldShowOnboarding());
  const [stepIndex, setStepIndex] = useState(0);
  const [profileName, setProfileName] = useState(state.user.name === 'Abel' ? '' : state.user.name);
  const [profileTitle, setProfileTitle] = useState(state.user.title || 'Knowledge Builder');
  const [tone, setTone] = useState<AITone>('direct');
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsageLevel>('standard');
  const [responseFormat, setResponseFormat] = useState<ResponseFormat>('hybrid');
  const [memoryText, setMemoryText] = useState('');
  const [projectFocus, setProjectFocus] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(
    state.settings.llmProvider !== 'mock' ? state.settings.llmProvider : 'mock'
  );
  const [provApiKey, setProvApiKey] = useState('');
  const [provModel, setProvModel] = useState('');
  const [provBaseUrl, setProvBaseUrl] = useState('');
  const [connTestResult, setConnTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connTestError, setConnTestError] = useState('');

  const step = STEPS[stepIndex];
  const progress = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex]);

  const isMockProvider = selectedProvider === 'mock';

  useEffect(() => {
    if (!open) return;
    aiConfigService.get(DEMO_USER_ID).then(cfg => {
      if (!cfg) return;
      setTone(cfg.tone);
      setMemoryUsage(cfg.memoryUsageLevel);
      setResponseFormat(cfg.responseFormat);
      setProjectFocus(cfg.projectFocus ?? '');
    }).catch(() => undefined);
  }, [open]);

  function complete() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setOpen(false);
  }

  async function saveProvider() {
    if (isMockProvider) {
      dispatch({ type: 'UPDATE_SETTINGS', settings: { llmProvider: 'mock' } });
      await providerConfigService.clear(DEMO_USER_ID);
      return;
    }
    await providerConfigService.save(DEMO_USER_ID, {
      provider: selectedProvider,
      apiKey: provApiKey,
      modelName: provModel,
      baseUrl: provBaseUrl,
    });
    dispatch({ type: 'UPDATE_SETTINGS', settings: { llmProvider: selectedProvider } });
  }

  async function testConnection() {
    setConnTestResult('testing');
    setConnTestError('');
    const result = await testProviderConnection(selectedProvider, provApiKey, provBaseUrl);
    if (result.ok) {
      setConnTestResult('success');
    } else {
      setConnTestResult('error');
      setConnTestError(result.error);
    }
  }

  async function saveProfile() {
    const name = profileName.trim() || state.user.name || 'New Seeker';
    await userService.upsert({
      id: DEMO_USER_ID,
      name,
      title: profileTitle.trim() || 'Knowledge Builder',
      email: state.user.email,
      createdAt: state.user.createdAt,
    });
    dispatch({ type: 'UPDATE_USER', user: { name, title: profileTitle.trim() || 'Knowledge Builder' } });
  }

  async function saveAi() {
    await aiConfigService.upsert(DEMO_USER_ID, {
      tone,
      memoryUsageLevel: memoryUsage,
      responseFormat,
      projectFocus: projectFocus.trim() || undefined,
    });
  }

  async function queueMemoryImport() {
    if (!memoryText.trim()) return;
    await syncJobService.create(DEMO_USER_ID, 'memory_import', {
      title: 'Onboarding memory',
      text: memoryText.trim(),
    });
  }

  async function seedFirstConversation() {
    const threads = await chatService.listThreads(DEMO_USER_ID);
    if (threads.length > 0) return;

    const thread = await chatService.createThread(DEMO_USER_ID, 'First Signal');

    const name = profileName.trim() || state.user.name || 'Seeker';
    const title = profileTitle.trim() || 'Knowledge Builder';
    const archetype = state.archetype.primary || 'The Architect';
    const providerName = LLM_PROVIDERS.find(p => p.id === selectedProvider)?.name ?? 'Mock Abel';
    const projFocus = projectFocus.trim() || 'knowledge work';

    const journeyId = state.journeys.find(j => j.active)?.id ?? state.journeys[0]?.id ?? '';
    const memories = await retrieveContext(DEMO_USER_ID, 'greeting', { memoryUsageLevel: 'standard' });
    const memoryRef = memories.topSources.length > 0
      ? `I noticed you've already begun capturing — "${memories.topSources[0].title}" caught my attention. That's worth revisiting once we're set up.`
      : 'Your archive is fresh, which means every conversation will help shape your knowledge graph from scratch.';

    const quest1 = {
      id: `q-first-${Date.now()}`,
      title: `Define your first milestone for ${projFocus}`,
      description: `Articulate a concrete, measurable milestone for "${projFocus}". What would success look like in one week?`,
      whyItMatters: 'A clear milestone turns direction into a target. Without it, effort scatters.',
      journeyId,
      status: 'available' as const,
      type: 'knowledge' as const,
      difficulty: 1 as const,
      source: 'archive' as const,
      linkedSkillIds: [],
      linkedGraphNodeIds: [],
      rewards: { xp: 50, skillIds: [], skillMastery: 5 },
    };
    const quest2 = {
      id: `q-second-${Date.now()}-1`,
      title: `Log a 25-minute focus session on your top priority`,
      description: `Set a 25-minute focus timer, work on your top priority without interruption, and log the reflection afterward.`,
      whyItMatters: 'Focus sessions build the discipline muscle. Each one generates a memory and advances your focus skill.',
      journeyId,
      status: 'locked' as const,
      type: 'focus' as const,
      difficulty: 2 as const,
      source: 'archive' as const,
      linkedSkillIds: [],
      linkedGraphNodeIds: [],
      rewards: { xp: 75, skillIds: [], skillMastery: 8 },
    };
    dispatch({ type: 'ADD_QUEST', quest: quest1 });
    dispatch({ type: 'ADD_QUEST', quest: quest2 });

    const greeting = [
      `Welcome, ${name} — ${title}.`,
      '',
      `I'm Abel, running on **${providerName}**. Your presence here means you're ready to build something intentional.`,
      '',
      `Your profile suggests a **${archetype}** energy — someone who organises complexity into something navigable. That instinct will serve you well here.`,
      '',
      memoryRef,
      '',
      `Let's begin with a first move. I've seeded two initial quests for **${projFocus}** — check the **Quests** tab or click one below:`,
      '',
      `[quest: Define your first milestone for ${projFocus}]`,
      `[quest: Log a 25-minute focus session on your top priority]`,
    ].join('\n');

    await chatService.appendMessage(thread.id, DEMO_USER_ID, 'abel', greeting);
  }

  async function prepareChat() {
    const threads = await chatService.listThreads(DEMO_USER_ID);
    if (threads.length === 0) {
      await seedFirstConversation();
    }
  }

  async function next() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (step.id === 'provider') {
        await saveProvider();
        setNotice(isMockProvider ? 'Mock Abel selected. You can switch to a real provider in Settings.' : `${LLM_PROVIDERS.find(p => p.id === selectedProvider)?.name} configured.`);
      }
      if (step.id === 'profile') {
        await saveProfile();
        setNotice('Profile anchored.');
      }
      if (step.id === 'ai') {
        await saveAi();
        setNotice('AI preferences saved.');
      }
      if (step.id === 'memory') {
        await queueMemoryImport();
        setNotice(memoryText.trim() ? 'Memory import queued.' : 'You can import memory later.');
      }
      if (step.id === 'chat') {
        await prepareChat();
        complete();
        onNavigate('archive');
        return;
      }

      setStepIndex(i => Math.min(STEPS.length - 1, i + 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    complete();
  }

  if (!open) return null;

  return (
    <div className="onb-shell" role="dialog" aria-modal="true" aria-label="Abel onboarding">
      <div className="onb-panel">
        <aside className="onb-rail">
          <div className="onb-mark">ABEL</div>
          <div className="onb-progress-track">
            <div className="onb-progress-fill" style={{ height: `${progress}%` }} />
          </div>
          <div className="onb-steps">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                className={`onb-step ${i === stepIndex ? 'onb-step--active' : ''} ${i < stepIndex ? 'onb-step--done' : ''}`}
                onClick={() => setStepIndex(i)}
                aria-label={s.label}
              >
                <span>{s.glyph}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="onb-main">
          <div className="onb-topline">
            <span>{step.glyph}</span>
            <span>{step.label}</span>
          </div>

          {isMockProvider && stepIndex > 0 && (
            <div className="onb-mock-warning" role="alert">
              <span>◈</span>
              <span>You are using offline mock mode. Responses are simulated. Switch to a real provider in Settings to connect Claude, ChatGPT, or a local model.</span>
            </div>
          )}

          {step.id === 'provider' && (
            <section className="onb-section">
              <h2>Choose your intelligence.</h2>
              <p>Select which AI powers Abel's planning, reflection, and memory synthesis. You can switch at any time in Settings.</p>

              <div className="onb-provider-grid">
                {LLM_PROVIDERS.map(p => {
                  const active = selectedProvider === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`onb-provider-card ${active ? 'onb-provider-card--active' : ''}`}
                      onClick={() => {
                        setSelectedProvider(p.id);
                        setConnTestResult('idle');
                        setConnTestError('');
                      }}
                      role="radio"
                      aria-checked={active}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedProvider(p.id); } }}
                    >
                      <div className="onb-provider-header">
                        <span className="onb-provider-icon">{p.icon}</span>
                        <div>
                          <p className="onb-provider-name">{p.name}</p>
                          {p.recommended && <span className="onb-provider-rec">RECOMMENDED</span>}
                        </div>
                      </div>
                      <p className="onb-provider-desc">{p.description}</p>
                    </div>
                  );
                })}
              </div>

              {!isMockProvider && (
                <div className="onb-provider-config">
                  <p className="onb-section-label">{selectedProvider === 'local' ? 'BASE URL' : 'API KEY'}</p>
                  {selectedProvider === 'local' ? (
                    <input
                      className="onb-provider-input"
                      placeholder="http://localhost:11434"
                      value={provBaseUrl}
                      onChange={e => setProvBaseUrl(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <input
                      className="onb-provider-input"
                      type="password"
                      placeholder={selectedProvider === 'claude' ? 'sk-ant-...' : 'sk-...'}
                      value={provApiKey}
                      onChange={e => setProvApiKey(e.target.value)}
                      autoFocus
                    />
                  )}

                  <p className="onb-section-label">MODEL NAME <span className="onb-opt">(optional)</span></p>
                  <input
                    className="onb-provider-input"
                    placeholder={selectedProvider === 'claude' ? 'claude-sonnet-4-20250514' : selectedProvider === 'chatgpt' ? 'gpt-4o' : 'llama3.2'}
                    value={provModel}
                    onChange={e => setProvModel(e.target.value)}
                  />

                  <div className="onb-conn-test">
                    <GlowButton variant="ghost" size="sm" onClick={testConnection} disabled={connTestResult === 'testing'}>
                      {connTestResult === 'testing' ? 'Testing…' : 'Test Connection'}
                    </GlowButton>
                    {connTestResult === 'success' && (
                      <span className="onb-conn-ok">✓ Connection successful</span>
                    )}
                    {connTestResult === 'error' && (
                      <span className="onb-conn-err">✗ {connTestError}</span>
                    )}
                  </div>
                </div>
              )}

              {isMockProvider && (
                <div className="onb-mock-notice">
                  <p>Mock Abel uses built-in deterministic responses. No API key or configuration needed.</p>
                  <p className="caption" style={{ marginTop: 6 }}>You can switch to a real provider in Settings at any time.</p>
                </div>
              )}
            </section>
          )}

          {step.id === 'profile' && (
            <section className="onb-section">
              <h2>Give Abel a person to remember.</h2>
              <p>Set the identity that appears across the dashboard, memory, and archive.</p>
              <label>Name</label>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your name" autoFocus />
              <label>Role or title</label>
              <input value={profileTitle} onChange={e => setProfileTitle(e.target.value)} placeholder="Knowledge Builder" />
            </section>
          )}

          {step.id === 'ai' && (
            <section className="onb-section">
              <h2>Choose Abel's working voice.</h2>
              <p>These preferences feed every archive response and retrieval prompt.</p>
              <label>Tone</label>
              <div className="onb-grid">
                {(['direct', 'philosophical', 'casual', 'formal'] as AITone[]).map(v => (
                  <button key={v} className={tone === v ? 'onb-choice onb-choice--on' : 'onb-choice'} onClick={() => setTone(v)}>{v}</button>
                ))}
              </div>
              <label>Memory depth</label>
              <div className="onb-grid">
                {(['minimal', 'standard', 'deep'] as MemoryUsageLevel[]).map(v => (
                  <button key={v} className={memoryUsage === v ? 'onb-choice onb-choice--on' : 'onb-choice'} onClick={() => setMemoryUsage(v)}>{v}</button>
                ))}
              </div>
              <label>Project focus</label>
              <input value={projectFocus} onChange={e => setProjectFocus(e.target.value)} placeholder="What are you building, learning, or changing?" />
              <label>Response shape</label>
              <div className="onb-grid">
                {(['hybrid', 'structured', 'narrative'] as ResponseFormat[]).map(v => (
                  <button key={v} className={responseFormat === v ? 'onb-choice onb-choice--on' : 'onb-choice'} onClick={() => setResponseFormat(v)}>{v}</button>
                ))}
              </div>
            </section>
          )}

          {step.id === 'memory' && (
            <section className="onb-section">
              <h2>Import one useful memory.</h2>
              <p>Give Abel a preference, goal, project note, or constraint. The local worker will process it as a memory import job.</p>
              <textarea
                value={memoryText}
                onChange={e => setMemoryText(e.target.value)}
                placeholder="Example: I am building Abel as a local-first personal operating system. I prefer direct, pragmatic feedback."
                rows={7}
              />
            </section>
          )}

          {step.id === 'atlas' && (
            <section className="onb-section onb-atlas">
              <h2>Read the atlas as a map, not a menu.</h2>
              <p>Memories, chats, quests, and skills become nodes. Connections show what supports, unlocks, or contradicts other parts of your system.</p>
              <div className="onb-atlas-map" aria-hidden>
                <span className="onb-node onb-node--memory">Memory</span>
                <span className="onb-node onb-node--goal">Goal</span>
                <span className="onb-node onb-node--chat">Chat</span>
                <span className="onb-thread onb-thread--a" />
                <span className="onb-thread onb-thread--b" />
              </div>
              <GlowButton variant="ghost" size="sm" onClick={() => onNavigate('graph')}>Preview Graph</GlowButton>
            </section>
          )}

          {step.id === 'chat' && (
            <section className="onb-section">
              <h2>Start the first signal.</h2>
              <p>The Archive is Abel's chat chamber. Ask for a plan, reflect on a decision, or turn your imported memory into a task.</p>
              <div className="onb-prompt">"Given what you know so far, help me choose the next concrete step."</div>
            </section>
          )}

          {(notice || error) && (
            <div className={error ? 'onb-status onb-status--error' : 'onb-status'}>
              {error ?? notice}
            </div>
          )}

          <div className="onb-actions">
            <button className="onb-skip" onClick={skip}>Skip for now</button>
            {stepIndex > 0 && <button className="onb-back" onClick={() => setStepIndex(i => i - 1)}>Back</button>}
            <GlowButton variant="purple" onClick={next} disabled={saving}>
              {saving ? 'Saving…' : step.id === 'chat' ? 'Open Archive' : 'Continue'}
            </GlowButton>
          </div>
        </main>
      </div>
    </div>
  );
}
