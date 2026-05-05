import { useState, useEffect } from 'react';
import { SKILL_NODES } from '../data';
import type { SkillNode } from '../types';
import { get, set } from '../storage';
import './SkillTreePage.css';

const STORAGE_KEY = 'abel_skills_completed';

function buildTree(nodes: SkillNode[], completedSet: Set<string>): SkillNode[] {
  return nodes.map(n => ({
    ...n,
    state: completedSet.has(n.id) ? 'completed' : n.state,
  }));
}

export default function SkillTreePage() {
  const [completed, setCompleted] = useState<Set<string>>(() => {
    const stored = get<string[]>(STORAGE_KEY, []);
    return new Set(stored);
  });
  const [selectedId, setSelectedId] = useState('deep-work');

  const nodes = buildTree(SKILL_NODES, completed);
  const selected = nodes.find(n => n.id === selectedId)!;

  useEffect(() => {
    set(STORAGE_KEY, [...completed]);
  }, [completed]);

  function markComplete(id: string) {
    setCompleted(prev => new Set([...prev, id]));
  }

  const completedCount = nodes.filter(n => n.state === 'completed').length;
  const total = nodes.length;

  const branches = ['focus', 'habit', 'learning', 'fitness'];

  return (
    <div className="st-page">
      {/* Header */}
      <div className="st-header">
        <div className="st-title">
          <span className="logo-a">▲</span>
          <span className="st-logo">Abel</span>
          <span className="st-version">skill matrix v1.0.0</span>
        </div>
        <div className="st-profile glass">
          <div className="st-profile-row">PROFILE: <span className="neon-purple">APPRENTICE</span></div>
          <div className="st-profile-row">XP <span className="neon-cyan">12450</span></div>
        </div>
      </div>

      {/* Main area */}
      <div className="st-main">
        {/* Tree panel */}
        <div className="st-tree-panel glass">
          <TreeDiagram nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} branches={branches} />
        </div>

        {/* Detail panel */}
        <NodeDetail node={selected} onComplete={markComplete} />
      </div>

      {/* Bottom panel */}
      <div className="st-bottom glass">
        <div className="st-bottom-icon">⬡</div>
        <div className="st-bottom-text">
          Build your path through connected skills and unlock new archetypes.
        </div>
        <div className="st-progress-section">
          <div className="st-progress-label">
            <span className="neon-cyan">{completedCount}</span>
            <span className="st-dim"> / {total} Nodes Activated</span>
          </div>
          <div className="st-progress-bar">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`st-progress-seg ${i < completedCount ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="ctrl-hints">
          <span className="ctrl-hint"><span className="ctrl-key">⊕</span> Select</span>
          <span className="ctrl-hint"><span className="ctrl-key">B</span> Back</span>
          <span className="ctrl-hint"><span className="ctrl-key">A</span> Confirm</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tree Diagram ────────────────────────────────────────────────────────────

function TreeDiagram({
  nodes, selectedId, onSelect, branches,
}: {
  nodes: SkillNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  branches: string[];
}) {
  const root = nodes.find(n => n.id === 'self-mastery')!;

  return (
    <div className="tree-diagram">
      {/* Root */}
      <div className="tree-root-row">
        <SkillBtn node={root} selected={selectedId === root.id} onSelect={onSelect} />
      </div>

      {/* Branch connectors */}
      <div className="tree-connector-h" />

      {/* Branches */}
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

function SkillBtn({ node, selected, onSelect }: { node: SkillNode; selected: boolean; onSelect: (id: string) => void }) {
  const cls = ['skill-node', node.state, selected ? 'sel' : ''].filter(Boolean).join(' ');
  return (
    <button className={cls} onClick={() => onSelect(node.id)}>
      <span className="sn-icon">{node.icon}</span>
      {node.state === 'locked' && <span className="sn-lock">🔒</span>}
      <span className="sn-label">{node.label}</span>
    </button>
  );
}

// ─── Node Detail ─────────────────────────────────────────────────────────────

function NodeDetail({ node, onComplete }: { node: SkillNode; onComplete: (id: string) => void }) {
  const statusLabel = node.state === 'completed' ? 'Completed' : node.state === 'unlocked' ? 'Unlocked' : 'Locked';
  const statusCls = node.state === 'completed' ? 'neon-green' : node.state === 'unlocked' ? 'neon-purple' : 'locked-text';

  return (
    <div className="nd-panel glass2 fade-in" key={node.id}>
      <div className="nd-icon">{node.icon}</div>
      <div className="nd-name">{node.label}</div>
      <div className={`nd-status ${statusCls}`}>● {statusLabel}</div>
      <div className="nd-xp neon-cyan">+{node.xp} XP</div>
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
        <button className="btn nd-action complete" disabled>
          ✓ Completed
        </button>
      )}
      {node.state === 'locked' && (
        <button className="btn nd-action locked-btn" disabled>
          🔒 Locked
        </button>
      )}
    </div>
  );
}
