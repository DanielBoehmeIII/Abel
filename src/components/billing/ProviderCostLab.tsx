import { useState } from 'react';
import { calculateCost } from '../../billing/pricing';
import GlassPanel from '../common/GlassPanel';
import GlowButton from '../common/GlowButton';

interface ScenarioResult {
  label: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  toolCalls: number;
  imageCount: number;
  costCents: number;
  costPerRequest: string;
  monthlyProjection: string;
}

const MODELS = [
  { id: 'claude-sonnet-4-20250514', provider: 'Claude', label: 'Claude Sonnet 4' },
  { id: 'claude-haiku-3-5', provider: 'Claude', label: 'Claude Haiku 3.5' },
  { id: 'claude-opus-4', provider: 'Claude', label: 'Claude Opus 4' },
  { id: 'gpt-4o', provider: 'OpenAI', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', provider: 'OpenAI', label: 'GPT-4o-mini' },
  { id: 'gemini-2.0-pro', provider: 'Gemini', label: 'Gemini 2.0 Pro' },
  { id: 'local', provider: 'Local', label: 'Local (Ollama etc.)' },
];

const SCENARIOS: Array<{
  label: string;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  toolCalls: number;
  imageCount: number;
  monthlyMultiplier: number;
}> = [
  { label: 'Simple Q&A', inputTokens: 500, outputTokens: 300, cacheRead: 0, cacheWrite: 0, toolCalls: 0, imageCount: 0, monthlyMultiplier: 500 },
  { label: 'Deep Research', inputTokens: 15000, outputTokens: 4000, cacheRead: 5000, cacheWrite: 2000, toolCalls: 5, imageCount: 0, monthlyMultiplier: 100 },
  { label: 'Cache-Heavy', inputTokens: 50000, outputTokens: 2000, cacheRead: 40000, cacheWrite: 10000, toolCalls: 0, imageCount: 0, monthlyMultiplier: 50 },
  { label: 'Long Chat', inputTokens: 80000, outputTokens: 6000, cacheRead: 30000, cacheWrite: 10000, toolCalls: 8, imageCount: 0, monthlyMultiplier: 30 },
  { label: 'Tool-Heavy Agent', inputTokens: 20000, outputTokens: 8000, cacheRead: 5000, cacheWrite: 3000, toolCalls: 25, imageCount: 0, monthlyMultiplier: 200 },
  { label: 'Image Analysis', inputTokens: 3000, outputTokens: 1000, cacheRead: 0, cacheWrite: 0, toolCalls: 0, imageCount: 5, monthlyMultiplier: 300 },
  { label: 'Spammy Farming', inputTokens: 100, outputTokens: 50, cacheRead: 0, cacheWrite: 0, toolCalls: 0, imageCount: 0, monthlyMultiplier: 50000 },
];

export default function ProviderCostLab() {
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(MODELS.slice(0, 3).map(m => m.id)));

  function toggleModel(modelId: string) {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  }

  function runAllScenarios() {
    setBusy(true);
    const newResults: ScenarioResult[] = [];

    for (const modelDef of MODELS) {
      if (!selectedModels.has(modelDef.id)) continue;
      for (const scenario of SCENARIOS) {
        const cost = calculateCost(
          modelDef.id,
          scenario.inputTokens,
          scenario.outputTokens,
          scenario.cacheRead,
          scenario.cacheWrite,
          scenario.imageCount,
          scenario.toolCalls,
        );
        const costCents = Math.round(cost * 100);
        const monthlyRequests = scenario.monthlyMultiplier;
        const monthlyCost = costCents * monthlyRequests;

        newResults.push({
          label: scenario.label,
          model: modelDef.label,
          provider: modelDef.provider,
          inputTokens: scenario.inputTokens,
          outputTokens: scenario.outputTokens,
          cacheReadTokens: scenario.cacheRead,
          cacheWriteTokens: scenario.cacheWrite,
          toolCalls: scenario.toolCalls,
          imageCount: scenario.imageCount,
          costCents,
          costPerRequest: `$${(costCents / 100).toFixed(4)}`,
          monthlyProjection: `$${(monthlyCost / 100).toFixed(2)}`,
        });
      }
    }

    setResults(newResults);
    setBusy(false);
  }

  return (
    <div>
      <GlassPanel style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.08em', marginBottom: 4,
          textTransform: 'uppercase',
        }}>
          Provider Cost Lab
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
          Test provider pricing scenarios. Compare costs across models and usage patterns. Does not hit real providers.
        </p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Select Models
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MODELS.map(m => (
              <label key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px',
                background: selectedModels.has(m.id) ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedModels.has(m.id) ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 11,
                color: selectedModels.has(m.id) ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
              }}>
                <input
                  type="checkbox"
                  checked={selectedModels.has(m.id)}
                  onChange={() => toggleModel(m.id)}
                  style={{ accentColor: '#8b5cf6' }}
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        <GlowButton variant="cyan" size="sm" onClick={runAllScenarios} disabled={busy}>
          {busy ? 'Calculating...' : 'Run All Scenarios'}
        </GlowButton>
      </GlassPanel>

      {results.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            fontSize: 10,
            borderCollapse: 'collapse',
            color: 'rgba(255,255,255,0.6)',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Scenario</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Model</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Input</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Output</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Cache R</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Cache W</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Tools</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Images</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Cost/Req</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'rgba(255,255,255,0.3)' }}>Monthly</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}>
                  <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.7)' }}>{r.label}</td>
                  <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.5)' }}>{r.model}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>{r.inputTokens.toLocaleString()}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>{r.outputTokens.toLocaleString()}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>{r.cacheReadTokens.toLocaleString()}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>{r.cacheWriteTokens.toLocaleString()}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>{r.toolCalls}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>{r.imageCount}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: r.costCents > 5 ? '#fbbf24' : '#34d399' }}>
                    {r.costPerRequest}
                  </td>
                  <td style={{
                    padding: '5px 8px', textAlign: 'right',
                    fontWeight: 600,
                    color: parseFloat(r.monthlyProjection.replace('$', '')) > 100 ? '#ef4444' : 'rgba(255,255,255,0.8)',
                  }}>
                    {r.monthlyProjection}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
