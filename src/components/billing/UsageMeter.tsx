import { useMemo } from 'react';
import type { TierId, TokenBudget } from '../../billing/types';
import { computeIncludedUsageRemaining } from '../../billing/costEngine';
import { getTokenBudgetStatus, formatBudgetPct } from '../../billing/tokenBudget';

interface UsageMeterProps {
  tierId: TierId;
  usageThisPeriod: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
  todayUsage: { inputTokens: number; outputTokens: number };
  budget: TokenBudget | null;
  eventsToday: number;
}

export function UsageMeter({ tierId, usageThisPeriod, todayUsage, budget, eventsToday }: UsageMeterProps) {
  const remaining = useMemo(() => computeIncludedUsageRemaining(tierId, usageThisPeriod), [tierId, usageThisPeriod]);
  const budgetStatus = useMemo(() => {
    if (!budget) return null;
    return getTokenBudgetStatus(budget, usageThisPeriod, todayUsage);
  }, [budget, usageThisPeriod, todayUsage]);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: 20,
      fontFamily: "'SF Pro Display', -apple-system, sans-serif",
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.02em' }}>
          Usage This Period
        </h3>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          {eventsToday} requests today
        </span>
      </div>

      <MeterBar label="Input Tokens" used={usageThisPeriod.inputTokens} remaining={remaining.inputTokensRemaining} pct={remaining.inputPct} color="#6ecbf5" />
      <MeterBar label="Output Tokens" used={usageThisPeriod.outputTokens} remaining={remaining.outputTokensRemaining} pct={remaining.outputPct} color="#a78bfa" />
      <MeterBar label="Cache Reads" used={usageThisPeriod.cacheReadTokens} remaining={remaining.cacheReadsRemaining} pct={remaining.cachePct} color="#34d399" />

      {budgetStatus && (
        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: budgetStatus.softWarning ? 'rgba(251,191,36,0.1)' : 'transparent', border: `1px solid ${budgetStatus.softWarning ? 'rgba(251,191,36,0.2)' : 'transparent'}` }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Daily Budget</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <span style={{ color: budgetStatus.dailyInputPct > 90 ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>
              Input: {formatBudgetPct(budgetStatus.dailyInputPct)}
            </span>
            <span style={{ color: budgetStatus.dailyOutputPct > 90 ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>
              Output: {formatBudgetPct(budgetStatus.dailyOutputPct)}
            </span>
            {budgetStatus.softWarning && (
              <span style={{ color: '#fbbf24' }}>Approaching limit</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MeterBar({ label, used, remaining, pct, color }: { label: string; used: number; remaining: number; pct: number; color: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {formatTokens(used)} / {formatTokens(used + remaining)}
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          borderRadius: 3,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
