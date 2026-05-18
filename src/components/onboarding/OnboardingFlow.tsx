import { useEffect, useMemo, useState } from 'react';
import type { PageId, AITone, MemoryUsageLevel, ResponseFormat } from '../../types/abel';
import { useAbel } from '../../state/AbelProvider';
import { aiConfigService, chatService, userService, DEMO_USER_ID } from '../../db';
import { syncJobService } from '../../db/services/syncJobService';
import GlowButton from '../common/GlowButton';
import './OnboardingFlow.css';

const ONBOARDING_KEY = 'abel_onboarding_complete_v1';

type StepId = 'profile' | 'ai' | 'memory' | 'atlas' | 'chat';

interface Step {
  id: StepId;
  label: string;
  glyph: string;
}

const STEPS: Step[] = [
  { id: 'profile', label: 'Identity', glyph: '◉' },
  { id: 'ai', label: 'Voice', glyph: '◇' },
  { id: 'memory', label: 'Memory', glyph: '◐' },
  { id: 'atlas', label: 'Atlas', glyph: '⬡' },
  { id: 'chat', label: 'First Signal', glyph: '◈' },
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

  const step = STEPS[stepIndex];
  const progress = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex]);

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

  async function prepareChat() {
    const threads = await chatService.listThreads(DEMO_USER_ID);
    if (threads.length === 0) {
      await chatService.createThread(DEMO_USER_ID, 'First Signal');
    }
  }

  async function next() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
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
              <h2>Choose Abel’s working voice.</h2>
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
              <p>The Archive is Abel’s chat chamber. Ask for a plan, reflect on a decision, or turn your imported memory into a task.</p>
              <div className="onb-prompt">“Given what you know so far, help me choose the next concrete step.”</div>
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
              {saving ? 'Saving' : step.id === 'chat' ? 'Open Archive' : 'Continue'}
            </GlowButton>
          </div>
        </main>
      </div>
    </div>
  );
}
