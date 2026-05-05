import { useState } from 'react';
import { SKILL_NODES } from '../data';
import { useApp } from '../AppContext';
import type { SkillNode } from '../types';
import './SkillTreePage.css';

function buildTree(completedIds: string[]): SkillNode[] {
  const completedSet = new Set(completedIds);
  return SKILL_NODES.map(n => {
    if (n.id === 'self-mastery') return { ...n, state: 'completed' as const };
    if (completedSet.has(n.id)) return { ...n, state: 'completed' as const };
    const parentCompleted = n.parentId === null || completedSet.has(n.parentId) || n.parentId === 'self-mastery';
    return { ...n, state: parentCompleted ? 'unlocked' as const : 'locked' as const };
  });
}

export default function SkillTreePage() {
  const { state, dispatch, archetype } = useApp();
  const [selectedId, setSelectedId] = useState('focus');

  const nodes = buildTree(state.skillsCompleted);
  const selected = nodes.find(n => n.id === selectedId) ?? nodes[0];

  function markComplete(id: string) {
    const node = nodes.find(n => n.id === id);
    if (!node || node.state !== 'unlocked') return;
    dispatch({ type: 'COMPLETE_SKILL', id, xp: node.xp });
  }

  const completedCount = nodes.filter(n => n.state === 'completed').length;
  const total = nodes.length;
  const branches = ['focus', 'habit', 'learning', 'fitness'];

  return (
    <div className="st-page">
      <div className="st-header">
        <div className="st-title">
          <span className="logo-a">▲</span>
          <span className="st-logo">Abel</span>
          <span className="st-version">skill matrix v2.0</span>
        </div>
        <div className="st-profile glass">
          <div className="st-profile-row">PROFILE: <span className="neon-purple">{archetype.label.toUpperCase()}</span></div>
          <div className="st-profile-row">XP <span className="neon-cyan">{state.xp.toLocaleString()}</span></div>
        </div>
      </div>

      <div className="st-main">
        <div className="st-tree-panel glass">
          <TreeDiagram nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} branches={branches} />
        </div>
        <NodeDetail node={selected} onComplete={markComplete} />
      </div>

      <div className="st-bottom glass">
        <div className="st-bottom-icon">⬡</div>
        <div className="st-bottom-text">
          Complete parent skills to unlock children. Each completion awards XP.
        </div>
        <div className="st-progress-section">
          <div className="st-progress-label">
            <span className="neon-cyan">{completedCount}</span>
            <span className="st-dim"> / {total} Nodes Activated</span>
          </div>
          <div className="st-progress-bar">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className={`st-progress-seg ${i < completedCount ? 'active' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tree Diagram ─────────────────────────────────────────────────────────────

function TreeDiagram({ nodes, selectedId, onSelect, branches }: {
  nodes: SkillNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  branches: string[];
}) {
  const root = nodes.find(n => n.id === 'self-mastery')!;

  return (
    <div className="tree-diagram">
      <div className="tree-root-row">
        <SkillBtn node={root} selected={selectedId === root.id} onSelect={onSelect} />
      </div>
      <div className="tree-connector-h" />
      <div className="tree-branches">
        {branches.map(branchId => {
          const branch = nodes.find(n => n.id === branchId)!;
          const children = nodes.filter(n => n.parentId === branchId);
          return (
            <div key={branchId} className="tree-branch-col">
              <div className="tree-v-line top" />
              <SkillBtn node={branch} selected={selectedId === branchId} onSelect={onSelect} />
              <div className="tree-connector-h-small" />
              <div className="tree-children-row">
                {children.map(child => (
                  <div key={child.id} className="tree-child-wrap">
                    <div className="tree-v-line child" />
                    <SkillBtn node={child} selected={selectedId === child.id} onSelect={onSelect} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillBtn({ node, selected, onSelect }: {
  node: SkillNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const cls = ['skill-node', node.state, selected ? 'sel' : ''].filter(Boolean).join(' ');
  return (
    <button className={cls} onClick={() => onSelect(node.id)}>
      <span className="sn-icon">{node.icon}</span>
      {node.state === 'locked' && <span className="sn-lock">🔒</span>}
      <span className="sn-label">{node.label}</span>
    </button>
  );
}

// ─── Node Detail ──────────────────────────────────────────────────────────────

function NodeDetail({ node, onComplete }: { node: SkillNode; onComplete: (id: string) => void }) {
  const statusLabel = node.state === 'completed' ? 'Completed' : node.state === 'unlocked' ? 'Unlocked' : 'Locked';
  const statusCls = node.state === 'completed' ? 'neon-green' : node.state === 'unlocked' ? 'neon-purple' : 'locked-text';

  return (
    <div className="nd-panel glass2 fade-in" key={node.id}>
      <div className="nd-icon">{node.icon}</div>
      <div className="nd-name">{node.label}</div>
      <div className={`nd-status ${statusCls}`}>● {statusLabel}</div>
      {node.xp > 0 && <div className="nd-xp neon-cyan">+{node.xp} XP</div>}
      <p className="nd-desc">{node.description}</p>

      {node.tasks.length > 0 && (
        <ul className="nd-tasks">
          {node.tasks.map(task => (
            <li key={task} className={node.state === 'completed' ? 'done' : ''}>
              <span className="task-check">{node.state === 'completed' ? '✓' : '○'}</span>
              {task}
            </li>
          ))}
        </ul>
      )}

      {node.state === 'unlocked' && (
        <button className="btn nd-action" onClick={() => onComplete(node.id)}>
          Mark Complete
        </button>
      )}
      {node.state === 'completed' && (
        <button className="btn nd-action complete" disabled>✓ Completed</button>
      )}
      {node.state === 'locked' && (
        <button className="btn nd-action locked-btn" disabled>🔒 Locked</button>
      )}
      {node.state === 'locked' && node.parentId && (
        <p className="nd-unlock-hint">Complete <strong>{node.parentId.replace(/-/g, ' ')}</strong> to unlock.</p>
      )}
    </div>
  );
}
