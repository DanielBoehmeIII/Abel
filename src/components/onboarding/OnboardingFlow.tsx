import { useEffect, useMemo, useState } from 'react';
import type { PageId, AITone, MemoryUsageLevel, ResponseFormat, LLMProvider } from '../../types/abel';
import type { SetupMode } from '../../billing/types';
import { useAbel } from '../../state/useAbel';
import { aiConfigService, chatService, userService, providerConfigService, DEMO_USER_ID } from '../../db';
import { syncJobService } from '../../db/services/syncJobService';
import { LLM_PROVIDERS } from '../../config/llmProviders';
import { testProviderConnection } from '../../lib/aiPipeline';
import { retrieveContext } from '../../lib/contextEngine';
import { TIERS, TIER_ORDER } from '../../billing';
import GlowButton from '../common/GlowButton';
import './OnboardingFlow.css';

function onboardingKey(email?: string): string {
  return email ? `abel_onboarding_complete_v1_${email}` : 'abel_onboarding_complete_v1';
}
function onboardingStepKey(email?: string): string {
  return email ? `abel_onb_step_v1_${email}` : 'abel_onb_step_v1';
}

type StepId = 'power' | 'plan' | 'provider' | 'profile' | 'ai' | 'memory' | 'atlas' | 'chat';

interface Step {
  id: StepId;
  label: string;
  glyph: string;
}

const STEPS: Step[] = [
  { id: 'power',    label: 'Power',         glyph: '◉' },
  { id: 'plan',     label: 'Plan',          glyph: '◉' },
  { id: 'provider', label: 'Intelligence',  glyph: '◈' },
  { id: 'profile',  label: 'Identity',      glyph: '◈' },
  { id: 'ai',       label: 'Voice',         glyph: '◇' },
  { id: 'memory',   label: 'Memory',        glyph: '◐' },
  { id: 'atlas',    label: 'Atlas',         glyph: '⬡' },
  { id: 'chat',     label: 'First Signal',  glyph: '◈' },
];

interface Props {
  onNavigate: (page: PageId) => void;
  userEmail?: string | null;
}

function shouldShowOnboarding(email?: string | null): boolean {
  try {
    return localStorage.getItem(onboardingKey(email ?? undefined)) !== '1';
  } catch {
    return false;
  }
}

const BILLING_MODE_INFO: Record<SetupMode, { title: string; desc: string; icon: string; details: string; warning?: string }> = {
  subscription: {
    title: 'Abel-Managed Subscription',
    desc: 'Monthly billing through Stripe. Includes managed AI usage across Claude, ChatGPT, and Gemini.',
    icon: '◉',
    details: 'Free tier available. Paid tiers from $12/mo. All features, usage tracking, overage protection.',
  },
  local: {
    title: 'Local Provider Setup',
    desc: 'Use your own local AI model running on your machine.',
    icon: '⬡',
    details: 'No Abel-managed billing. Performance depends on your hardware.',
    warning: 'Not recommended for production use. No tiered features or usage management.',
  },
  manual: {
    title: 'Manual API Keys',
    desc: 'Bring your own Claude, OpenAI, or Gemini API key.',
    icon: '◇',
    details: 'You manage provider costs directly. Abel sends requests using your credentials.',
    warning: 'You are responsible for all API provider costs. Keys stored in browser local database.',
  },
};

const TIER_GLYPH: Record<string, string> = {
  free: '◈', starter: '◇', pro: '⬡', power: '◉',
};

export default function OnboardingFlow({ onNavigate, userEmail }: Props) {
  const { state, dispatch } = useAbel();
  const [open, setOpen] = useState(() => shouldShowOnboarding(userEmail));
  const [stepIndex, setStepIndex] = useState(() => {
    try {
      const saved = localStorage.getItem(onboardingStepKey(userEmail ?? undefined));
      if (saved !== null) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 0 && n < STEPS.length) return n;
      }
    } catch { /* noop */ }
    return 0;
  });
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

  const [setupMode, setSetupMode] = useState<SetupMode>('subscription');
  const [selectedTier, setSelectedTier] = useState<string>('free');
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingErrors, setBillingErrors] = useState<{ name?: string; email?: string }>({});

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
    localStorage.setItem(onboardingKey(userEmail ?? undefined), '1');
    try { localStorage.removeItem(onboardingStepKey(userEmail ?? undefined)); } catch { /* noop */ }
    setOpen(false);
  }

  async function saveProvider() {
    if (isMockProvider) {
      dispatch({ type: 'UPDATE_SETTINGS', settings: { llmProvider: 'mock', setupMode } });
      await providerConfigService.clear(DEMO_USER_ID);
      return;
    }
    await providerConfigService.save(DEMO_USER_ID, {
      provider: selectedProvider,
      apiKey: provApiKey,
      modelName: provModel,
      baseUrl: provBaseUrl,
    });
    dispatch({ type: 'UPDATE_SETTINGS', settings: { llmProvider: selectedProvider, setupMode } });
  }

  async function saveSetupMode() {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { setupMode } });
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
    const modeLabel = setupMode === 'subscription' ? `on ${TIERS[selectedTier as keyof typeof TIERS]?.name ?? 'Free'} plan`
      : setupMode === 'local' ? 'with local provider'
      : 'with manual API keys';

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
      `I'm Abel, running on **${providerName}** ${modeLabel}. Your presence here means you're ready to build something intentional.`,
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
      if (step.id === 'power') {
        await saveSetupMode();
        const modeLabel = BILLING_MODE_INFO[setupMode].title;
        setNotice(modeLabel + ' selected. You can change this in Settings.');
        // Subscription users go to plan step; others skip plan and go to provider
        if (setupMode !== 'subscription') {
          setStepIndex(i => {
            const n = Math.min(STEPS.length - 1, i + 2);
            try { localStorage.setItem(onboardingStepKey(userEmail ?? undefined), String(n)); } catch { /* noop */ }
            return n;
          });
          setSaving(false);
          return;
        }
      }
      if (step.id === 'plan') {
        if (selectedTier !== 'free') {
          const errors: { name?: string; email?: string } = {};
          if (!billingName.trim()) errors.name = 'Full name is required.';
          if (!billingEmail.trim()) errors.email = 'Email address is required.';
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail.trim())) errors.email = 'Enter a valid email address.';
          if (Object.keys(errors).length > 0) {
            setBillingErrors(errors);
            setSaving(false);
            return;
          }
        }
        setNotice(selectedTier === 'free' ? 'Free plan selected.' : `${TIERS[selectedTier as keyof typeof TIERS]?.name} plan selected.`);
      }
      if (step.id === 'provider') {
        await saveProvider();
        setNotice(isMockProvider ? 'Mock Abel selected.' : `${LLM_PROVIDERS.find(p => p.id === selectedProvider)?.name} configured.`);
        // Save provider and proceed
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

      // Plan step: subscription users skip the provider step
      const skip = step.id === 'plan' ? 2 : 1;
      setStepIndex(i => {
        const n = Math.min(STEPS.length - 1, i + skip);
        try { localStorage.setItem(onboardingStepKey(userEmail ?? undefined), String(n)); } catch { /* noop */ }
        return n;
      });
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
            {STEPS.map((s, i) => {
              const isSkipped = (s.id === 'plan' && setupMode !== 'subscription') || (s.id === 'provider' && setupMode === 'subscription');
              return (
                <button
                  key={s.id}
                  className={`onb-step ${i === stepIndex ? 'onb-step--active' : ''} ${i < stepIndex ? 'onb-step--done' : ''} ${isSkipped ? 'onb-step--skipped' : ''}`}
                  onClick={() => { if (!isSkipped) setStepIndex(i); }}
                  aria-label={s.label}
                  disabled={isSkipped}
                >
                  <span>{s.glyph}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="onb-main">
          <div className="onb-topline">
            <span>{step.glyph}</span>
            <span>{step.label}</span>
          </div>

          {isMockProvider && stepIndex > 1 && (
            <div className="onb-mock-warning" role="alert">
              <span>◈</span>
              <span>You are using offline mock mode. Responses are simulated.</span>
            </div>
          )}

          {/* Power / Billing Mode Step */}
          {step.id === 'power' && (
            <section className="onb-section">
              <h2>How will Abel be powered?</h2>
              <p>Choose how you want to manage AI usage and billing. You can switch at any time in Settings.</p>

              <div className="onb-billing-mode-grid">
                {(Object.entries(BILLING_MODE_INFO) as [SetupMode, typeof BILLING_MODE_INFO['subscription']][]).map(([mode, info]) => {
                  const active = setupMode === mode;
                  return (
                    <div
                      key={mode}
                      className={`onb-provider-card ${active ? 'onb-provider-card--active' : ''}`}
                      onClick={() => setSetupMode(mode)}
                      role="radio"
                      aria-checked={active}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSetupMode(mode); } }}
                    >
                      <div className="onb-provider-header">
                        <span style={{ fontSize: 20 }}>{info.icon}</span>
                        <div>
                          <p className="onb-provider-name">{info.title}</p>
                          {mode === 'subscription' && <span className="onb-provider-rec">RECOMMENDED</span>}
                        </div>
                      </div>
                      <p className="onb-provider-desc">{info.desc}</p>
                      <p className="onb-provider-desc" style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{info.details}</p>
                      {info.warning && (
                        <p className="onb-provider-desc" style={{ fontSize: 11, marginTop: 4, color: 'rgba(240,192,64,0.7)' }}>⚠ {info.warning}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Plan / Tier Selection Step (subscription only) */}
          {step.id === 'plan' && (
            <section className="onb-section">
              <h2>Choose your plan.</h2>
              <p>Select the plan that fits your needs. You can upgrade or change at any time.</p>

              <div className="onb-tier-grid">
                {TIER_ORDER.map(tierId => {
                  const tier = TIERS[tierId];
                  const active = selectedTier === tierId;
                  const isFree = tier.price.monthly === 0;
                  return (
                    <div
                      key={tierId}
                      className={`onb-provider-card ${active ? 'onb-provider-card--active' : ''}`}
                      onClick={() => { setSelectedTier(tierId); setBillingErrors({}); }}
                      role="radio"
                      aria-checked={active}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTier(tierId); } }}
                      style={{ padding: '12px 14px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, color: active ? '#22d3ee' : 'rgba(255,255,255,0.5)' }}>
                          {TIER_GLYPH[tierId]}
                        </span>
                        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                          {tier.name}
                        </span>
                        {!isFree && (
                          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#fff', fontSize: 13 }}>
                            ${(tier.price.monthly / 100).toFixed(0)}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>
                        {formatTokensHuman(tier.includedUsage.inputTokens)} input / {formatTokensHuman(tier.includedUsage.outputTokens)} output per month
                      </p>
                    </div>
                  );
                })}
              </div>

              {selectedTier !== 'free' && (
                <div className="onb-billing-config">
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: '20px 0 12px' }}>
                    Billing Information
                  </h3>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="onb-provider-input"
                    placeholder="Jane Doe"
                    value={billingName}
                    onChange={e => { setBillingName(e.target.value); if (billingErrors.name) setBillingErrors(e => ({ ...e, name: undefined })); }}
                    style={{ borderColor: billingErrors.name ? 'rgba(239,68,68,0.5)' : undefined }}
                  />
                  {billingErrors.name && (
                    <p style={{ fontSize: 10, color: '#ef4444', margin: '4px 0 0' }}>{billingErrors.name}</p>
                  )}

                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '12px 0 4px', display: 'block' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="onb-provider-input"
                    type="email"
                    placeholder="jane@example.com"
                    value={billingEmail}
                    onChange={e => { setBillingEmail(e.target.value); if (billingErrors.email) setBillingErrors(e => ({ ...e, email: undefined })); }}
                    style={{ borderColor: billingErrors.email ? 'rgba(239,68,68,0.5)' : undefined }}
                  />
                  {billingErrors.email && (
                    <p style={{ fontSize: 10, color: '#ef4444', margin: '4px 0 0' }}>{billingErrors.email}</p>
                  )}
                </div>
              )}
            </section>
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
            {stepIndex > 0 && <button className="onb-back" onClick={() => setStepIndex(i => {
              let n = i - 1;
              // Skip over plan step when not subscription
              if (n >= 0 && STEPS[n].id === 'plan' && setupMode !== 'subscription') n -= 1;
              // Skip over provider step when on subscription
              if (n >= 0 && STEPS[n].id === 'provider' && setupMode === 'subscription') n -= 1;
              n = Math.max(0, n);
              try { localStorage.setItem(onboardingStepKey(userEmail ?? undefined), String(n)); } catch { /* noop */ }
              return n;
            })}>Back</button>}
            <GlowButton variant="purple" onClick={next} disabled={saving}>
              {saving ? 'Saving…' : step.id === 'chat' ? 'Open Archive' : 'Continue'}
            </GlowButton>
          </div>
        </main>
      </div>
    </div>
  );
}

function formatTokensHuman(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
