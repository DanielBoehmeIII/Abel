import { useMemo } from 'react';
import type { UsageEvent, TokenBudget, TierId } from '../../billing/types';
import { UsageMeter } from './UsageMeter';

interface UsageDashboardProps {
  tierId: TierId;
  usageThisPeriod: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
  todayUsage: { inputTokens: number; outputTokens: number };
  budget: TokenBudget | null;
  recentEvents: UsageEvent[];
  loading?: boolean;
}

export function UsageDashboard({ tierId, usageThisPeriod, todayUsage, budget, recentEvents, loading }: UsageDashboardProps) {
  const providerBreakdown = useMemo(() => {
    const breakdown: Record<string, { requests: number; inputTokens: number; outputTokens: number; cost: number }> = {};
    for (const e of recentEvents) {
      if (!breakdown[e.provider]) breakdown[e.provider] = { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
      breakdown[e.provider].requests++;
      breakdown[e.provider].inputTokens += e.inputTokens;
      breakdown[e.provider].outputTokens += e.outputTokens;
      breakdown[e.provider].cost += e.estimatedProviderCost;
    }
    return breakdown;
  }, [recentEvents]);

  const totalCost = useMemo(() => recentEvents.reduce((s, e) => s + e.estimatedProviderCost, 0), [recentEvents]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        Loading usage data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <UsageMeter
        tierId={tierId}
        usageThisPeriod={usageThisPeriod}
        todayUsage={todayUsage}
        budget={budget}
        eventsToday={todayUsage.inputTokens > 0 ? recentEvents.length : 0}
      />

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 20,
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
          Provider Breakdown
        </h3>
        {Object.entries(providerBreakdown).length === 0 ? (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No usage yet this period</div>
        ) : (
          Object.entries(providerBreakdown).map(([provider, data]) => (
            <div key={provider} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{provider}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                {data.requests} req · {formatShort(data.inputTokens + data.outputTokens)} tokens
              </span>
            </div>
          ))
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
          <span>Estimated provider cost</span>
          <span>{(totalCost / 100).toFixed(2)}¢</span>
        </div>
      </div>
    </div>
  );
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
