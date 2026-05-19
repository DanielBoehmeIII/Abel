import { useState } from 'react';
import { useAbel } from '../state/useAbel';
import { useIsMobile } from '../hooks/useIsMobile';
import type { PageId, Quest, QuestType } from '../types/abel';
import GlassPanel from '../components/common/GlassPanel';
import GlowButton from '../components/common/GlowButton';
import AtmosphereBackground from '../components/ui/AtmosphereBackground';
import AtlasWorkspace from '../components/abel/atlas-workspace/AtlasWorkspace';
import type { AtlasTreeNode } from '../components/abel/AtlasTree';
import './QuestsPage.css';

interface Props { onNavigate: (page: PageId) => void; }

// ── Atlas tree data ───────────────────────────────────────────────────────────

const ATLAS_ROOT: AtlasTreeNode = {
  id: 'core',
  label: 'Core',
  color: '#f5c518',
  children: [
    {
      id: 'focus', label: 'Focus', color: '#a78bfa',
      children: [
        { id: 'daily-ritual', label: 'Daily Ritual', status: 'active',    progress: 0.6  },
        { id: 'deep-work',    label: 'Deep Work',    status: 'available', progress: 0.18 },
      ],
    },
    {
      id: 'memory', label: 'Memory', color: '#22d3ee',
      children: [
        { id: 'archive-rev', label: 'Archive', status: 'complete'                },
        { id: 'pattern',     label: 'Pattern',  status: 'active', progress: 0.42 },
      ],
    },
    {
      id: 'expression', label: 'Expression', color: '#ec4899',
      children: [
        { id: 'journal', label: 'Journal', status: 'active',  progress: 0.75 },
        { id: 'voice',   label: 'Voice',   status: 'locked'                  },
      ],
    },
    {
      id: 'social', label: 'Social', color: '#34d399',
      children: [
        { id: 'outreach',   label: 'Outreach',   status: 'available' },
        { id: 'reflection', label: 'Reflection', status: 'complete'  },
      ],
    },
    {
      id: 'mastery', label: 'Mastery', color: '#f5c518', weight: 0.3,
      children: [
        { id: 'challenge',   label: 'Challenge', status: 'locked' },
        { id: 'trophy-path', label: 'Trophies',  status: 'locked' },
      ],
    },
    {
      id: 'world', label: 'World', color: '#c4b5fd',
      children: [
        { id: 'exploration', label: 'Explore', status: 'available', progress: 0.1 },
        { id: 'collection',  label: 'Collect', status: 'locked'                   },
      ],
    },
  ],
};

// ── Node metadata (QuestsPage-owned; AtlasTree renders shape/status only) ────

interface AtlasNodeMeta {
  description: string;
  questTypes: QuestType[];
  suggestedQuestId?: string;
}

const ATLAS_NODE_META: Record<string, AtlasNodeMeta> = {
  core:           { description: 'The full map of who you are becoming.', questTypes: ['focus','knowledge','reflection','skill','memory','archetype'] },
  focus:          { description: 'Attention, rhythm, and deep work rituals.', questTypes: ['focus'], suggestedQuestId: 'q2' },
  memory:         { description: 'Archives, reflection, and pattern recall.', questTypes: ['memory','knowledge'], suggestedQuestId: 'q1' },
  expression:     { description: 'Journaling, voice, and externalized thought.', questTypes: ['reflection','archetype'], suggestedQuestId: 'q5' },
  social:         { description: 'Outreach, reflection, and human connection.', questTypes: ['reflection'] },
  mastery:        { description: 'Challenge chains, repetition, and earned trophies.', questTypes: ['skill'], suggestedQuestId: 'q6' },
  world:          { description: 'Exploration, collection, and discovered context.', questTypes: ['knowledge'] },
  'daily-ritual': { description: 'Consistent small actions build lasting form.', questTypes: ['focus'] },
  'deep-work':    { description: 'Extended focus, distraction-free.', questTypes: ['focus'], suggestedQuestId: 'q2' },
  'archive-rev':  { description: 'What the archive holds.', questTypes: ['memory'] },
  'pattern':      { description: 'Recurring structures in your thinking.', questTypes: ['memory','knowledge'] },
  'journal':      { description: 'Regular written reflection.', questTypes: ['reflection'] },
  'voice':        { description: 'Spoken and recorded thought.', questTypes: ['archetype','reflection'] },
  'outreach':     { description: 'Connection rituals with others.', questTypes: ['reflection'] },
  'reflection':   { description: 'Reviewing what happened and why.', questTypes: ['reflection'] },
  'challenge':    { description: 'Structured difficulty chains.', questTypes: ['skill'] },
  'trophy-path':  { description: 'Achievements earned through mastery.', questTypes: ['skill'] },
  'exploration':  { description: 'New terrain, new context.', questTypes: ['knowledge'] },
  'collection':   { description: 'What you gather along the way.', questTypes: ['knowledge'] },
};

// Quest type → atlas branch, for reverse-linking quest clicks to the atlas
const QUEST_TYPE_TO_ATLAS: Record<QuestType, string> = {
  focus:      'focus',
  memory:     'memory',
  knowledge:  'memory',
  reflection: 'expression',
  archetype:  'core',
  skill:      'mastery',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function findAtlasNode(root: AtlasTreeNode, id: string): AtlasTreeNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findAtlasNode(child, id);
    if (found) return found;
  }
  return null;
}

// Returns the depth-1 branch that contains or is the given node
function findBranchAncestor(id: string): AtlasTreeNode | null {
  for (const branch of ATLAS_ROOT.children ?? []) {
    if (branch.id === id) return branch;
    if (branch.children?.some(c => c.id === id)) return branch;
  }
  return null;
}

// ── Display constants ─────────────────────────────────────────────────────────

const TYPE_ICONS: Record<QuestType, string> = {
  focus: '⊕', knowledge: '◇', reflection: '▣',
  skill: '⬡', memory: '◌', archetype: '◉',
};

const DIFF_LABELS = ['', '■', '■■', '■■■', '■■■■', '■■■■■'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuestsPage({ onNavigate }: Props) {
  const { state, dispatch } = useAbel();
  const { quests, journeys, skills } = state;
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<Quest['status'] | 'all'>('all');
  const [selected, setSelected] = useState<Quest | null>(quests.find(q => q.status === 'active') ?? null);
  const [atlasNodeId, setAtlasNodeId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeJourney = journeys.find(j => j.active) ?? journeys[0];

  // Derived atlas state
  const atlasNodeMeta  = atlasNodeId ? (ATLAS_NODE_META[atlasNodeId] ?? null) : null;
  const atlasNode      = atlasNodeId ? findAtlasNode(ATLAS_ROOT, atlasNodeId) : null;
  const branchAncestor = atlasNodeId ? findBranchAncestor(atlasNodeId) : null;

  // Atlas filter stacks with status filter
  const filtered = quests.filter(q => {
    const matchesStatus = filter === 'all' || q.status === filter;
    const matchesAtlas  = !atlasNodeMeta || atlasNodeMeta.questTypes.includes(q.type);
    return matchesStatus && matchesAtlas;
  });

  // Node context data
  const nodeQuestCount = atlasNodeMeta
    ? quests.filter(q => atlasNodeMeta.questTypes.includes(q.type)).length
    : 0;
  const suggestedQuest = atlasNodeMeta?.suggestedQuestId
    ? (quests.find(q => q.id === atlasNodeMeta.suggestedQuestId) ?? null)
    : null;

  // Right panel content mode
  const rightMode: 'overview' | 'node' | 'quest' = selected
    ? 'quest'
    : atlasNodeId && atlasNodeId !== 'core'
      ? 'node'
      : 'overview';

  const listLabel = atlasNodeId && atlasNodeId !== 'core' && atlasNode
    ? `Showing ${atlasNode.label} quests`
    : 'Showing all quests';

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAtlasNodeClick(node: AtlasTreeNode) {
    const newId = atlasNodeId === node.id ? null : node.id;
    setAtlasNodeId(newId);
    if (newId && selected) {
      const meta = ATLAS_NODE_META[newId];
      if (meta && !meta.questTypes.includes(selected.type)) setSelected(null);
    }
    if (!newId) { setSelected(null); setSheetOpen(false); }
    if (isMobile && newId && newId !== 'core') setSheetOpen(true);
  }

  function handleQuestClick(q: Quest) {
    setSelected(q);
    setAtlasNodeId(QUEST_TYPE_TO_ATLAS[q.type]);
    if (isMobile) setSheetOpen(true);
  }

  function clearSelection() {
    setAtlasNodeId(null);
    setSelected(null);
    setSheetOpen(false);
  }

  function completeQuest(q: Quest) {
    if (q.status !== 'active' && q.status !== 'available') return;
    dispatch({ type: 'COMPLETE_QUEST', questId: q.id });
    setSelected({ ...q, status: 'completed' });
  }

  function activateQuest(q: Quest) {
    if (q.status !== 'available') return;
    dispatch({ type: 'SET_QUEST_ACTIVE', questId: q.id });
    setSelected({ ...q, status: 'active' });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="quests-page">
      <AtmosphereBackground variant="violet" stars={50} />

      {/* Col 1: Left — header + filters + quest stream */}
      <div className="quests-left">
        <div>
          <p className="eyebrow quests-journey-eyebrow">EVERY INSIGHT CONNECTS</p>
          <h1 className="quests-journey-title">Atlas<br />of Being</h1>
          <p className="quests-journey-desc" style={{ marginTop: '8px' }}>
            A living map of what you know, feel, and are becoming.
          </p>
          <p className="caption" style={{ color: 'var(--text-4)', marginTop: '4px' }}>
            {activeJourney?.title}
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="quests-filters">
          {(['all', 'active', 'available', 'completed', 'locked'] as const).map(f => (
            <button
              key={f}
              className={`quests-filter-tab ${filter === f ? 'quests-filter-tab--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* List header: atlas context label + count + clear */}
        <div className="quests-list-header" aria-live="polite">
          <span className="quests-filter-label">{listLabel}</span>
          <span className="quests-filter-count">
            {filtered.length} {filtered.length === 1 ? 'quest' : 'quests'}
          </span>
          {atlasNodeId && (
            <button
              className="quests-clear-selection"
              onClick={clearSelection}
              aria-label="Clear Atlas selection"
            >
              ×
            </button>
          )}
        </div>

        {/* Quest list */}
        <div className="quests-list-col">
          {filtered.length === 0 ? (
            <div className="quests-empty-state">
              <div className="quests-empty-glyph">◌</div>
              <p className="quests-empty-title">
                {atlasNodeMeta ? 'No quests here yet' : 'No quests match'}
              </p>
              <p className="quests-empty-desc">
                {atlasNodeMeta
                  ? 'This branch grows as you explore.'
                  : 'Try a different filter.'}
              </p>
            </div>
          ) : (
            filtered.map((q, i) => (
              <div
                key={q.id}
                className={`quests-card glass ${selected?.id === q.id ? 'quests-card--selected' : ''} animate-fade-in`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => handleQuestClick(q)}
              >
                <div className="quests-card-top">
                  <span className={`pill status-${q.status}`}>{q.status}</span>
                  <span className="quests-card-type">{TYPE_ICONS[q.type]} {q.type}</span>
                  <span className="quests-diff" title={`Difficulty ${q.difficulty}`}>{DIFF_LABELS[q.difficulty]}</span>
                </div>
                <h3 className="quests-card-title">{q.title}</h3>
                <p className="quests-card-desc">{q.description}</p>
                {q.status === 'completed' && q.completedAt && (
                  <p className="caption" style={{ marginTop: '6px' }}>
                    Completed {new Date(q.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Col 2: Center — Atlas tree hero */}
      <div className="quests-atlas-col">
        <AtlasWorkspace
          root={ATLAS_ROOT}
          selectedId={atlasNodeId ?? undefined}
          onNodeClick={handleAtlasNodeClick}
        />
      </div>

      {/* Backdrop for bottom sheet */}
      {isMobile && sheetOpen && (
        <div className="quests-sheet-backdrop" onClick={clearSelection} />
      )}

      {/* Col 3: Right — always-visible context panel / bottom sheet on mobile */}
      <div className={`quests-right${isMobile && sheetOpen ? ' quests-right--open' : ''}`}>
        {isMobile && (
          <button className="quests-sheet-close-btn" onClick={clearSelection} aria-label="Close panel">×</button>
        )}

        {/* Atlas Overview — no atlas selection */}
        {rightMode === 'overview' && (
          <div key="overview" className="quests-atlas-overview animate-fade-in">
            <p className="eyebrow quests-overview-eyebrow">ATLAS OVERVIEW</p>
            <p className="quests-overview-desc">
              A living map of growth, organized into branches of becoming.
            </p>
            <div className="quests-overview-stats">
              <div>
                <span className="quests-overview-stat-val">{quests.length}</span>
                <span className="quests-overview-stat-label">QUESTS</span>
              </div>
              <div>
                <span className="quests-overview-stat-val">{quests.filter(q => q.status === 'completed').length}</span>
                <span className="quests-overview-stat-label">COMPLETE</span>
              </div>
              <div>
                <span className="quests-overview-stat-val">{quests.filter(q => q.status === 'active').length}</span>
                <span className="quests-overview-stat-label">ACTIVE</span>
              </div>
              <div>
                <span className="quests-overview-stat-val">6</span>
                <span className="quests-overview-stat-label">BRANCHES</span>
              </div>
            </div>
            <p className="quests-overview-hint">Select a branch to explore.</p>
          </div>
        )}

        {/* Node Context — branch or leaf selected, no quest open */}
        {rightMode === 'node' && atlasNode && atlasNodeMeta && (
          <div key="node" className="quests-node-context animate-fade-in">
            <p className="quests-node-context-branch">
              {branchAncestor && branchAncestor.id !== atlasNodeId
                ? branchAncestor.label
                : 'Atlas Branch'}
            </p>
            <h2 className="quests-node-context-label">{atlasNode.label}</h2>
            <p className="quests-node-context-desc">{atlasNodeMeta.description}</p>
            <div className="quests-node-context-stats">
              <span>{nodeQuestCount} {nodeQuestCount === 1 ? 'quest' : 'quests'}</span>
              {atlasNode.status && <span>{atlasNode.status}</span>}
            </div>
            {suggestedQuest && (
              <div className="quests-node-suggested-wrap">
                <p className="quests-node-suggested-eyebrow">SUGGESTED</p>
                <button
                  className="quests-node-suggested"
                  onClick={() => handleQuestClick(suggestedQuest)}
                >
                  <span className={`pill status-${suggestedQuest.status}`}>{suggestedQuest.status}</span>
                  <span className="quests-node-suggested-title">{suggestedQuest.title} →</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quest Detail — quest selected */}
        {rightMode === 'quest' && selected && (
          <div key="quest" className="animate-fade-in-scale">
            {atlasNode && (
              <div className="quests-node-badge">
                <span style={{ color: atlasNode.color ?? 'var(--text-4)' }}>◉</span>
                {atlasNode.label}
              </div>
            )}

            <div className="quests-detail-top">
              <span className={`pill status-${selected.status}`}>{selected.status}</span>
              <span className="caption">{TYPE_ICONS[selected.type]} {selected.type} quest</span>
            </div>

            <h2 className="display-md" style={{ margin: '12px 0 8px', color: 'var(--text)' }}>{selected.title}</h2>
            <p className="body">{selected.description}</p>

            <GlassPanel style={{ padding: '16px', marginTop: '16px' }}>
              <p className="heading" style={{ marginBottom: '6px' }}>WHY IT MATTERS</p>
              <p className="body">{selected.whyItMatters}</p>
            </GlassPanel>

            <GlassPanel style={{ padding: '16px', marginTop: '12px' }}>
              <p className="heading" style={{ marginBottom: '10px' }}>REWARDS</p>
              <div className="quests-rewards">
                <div className="quests-reward">
                  <span className="quests-reward-val">{selected.rewards.xp}</span>
                  <span className="caption">XP</span>
                </div>
                <div className="quests-reward">
                  <span className="quests-reward-val">+{selected.rewards.skillMastery}%</span>
                  <span className="caption">MASTERY</span>
                </div>
              </div>
              {selected.rewards.skillIds.map(sid => {
                const sk = skills.find(s => s.id === sid);
                return sk ? (
                  <div key={sid} className="quests-skill-pill" onClick={() => onNavigate('skillweb')}>
                    <span>⬡</span> {sk.name}
                  </div>
                ) : null;
              })}
            </GlassPanel>

            <div className="quests-actions">
              {selected.status === 'available' && (
                <GlowButton variant="cyan" onClick={() => activateQuest(selected)}>
                  ACTIVATE QUEST
                </GlowButton>
              )}
              {(selected.status === 'active' || selected.status === 'available') && (
                <GlowButton variant="purple" onClick={() => completeQuest(selected)}>
                  COMPLETE QUEST ✓
                </GlowButton>
              )}
              {selected.status === 'completed' && (
                <GlowButton variant="ghost" onClick={() => onNavigate('graph')}>
                  VIEW IN GRAPH →
                </GlowButton>
              )}
              {selected.status === 'locked' && (
                <p className="caption">Complete earlier quests to unlock.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
